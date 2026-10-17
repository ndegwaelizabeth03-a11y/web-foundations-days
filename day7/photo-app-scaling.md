# SnapShare: Scaling Plan for a Photo-Sharing App

## 1. Assumptions

SnapShare is a photo-sharing application where users upload photos and view a feed containing photos from people they follow.

- The application has 10 million registered users.
- 10% of registered users are active each day.
- Each daily active user uploads 1 photo per day.
- Each daily active user views 50 feed pages per day.
- Each original photo has an average size of 2 MB.
- Each photo has one thumbnail of 50 KB.
- There are 86,400 seconds in a day and 365 days in a year.
- All uploaded photos and thumbnails are retained for at least one year.
- Storage estimates use decimal units: 1 TB = 1,000,000 MB.
- The peak feed-view rate is estimated as five times the average rate.
- The calculations represent average daily activity; actual traffic varies by time of day.

### Daily Active Users

10,000,000 × 10% = 1,000,000 users, so SnapShare has approximately **1 million daily active users**.

## 2. Traffic and Storage Estimates

### Daily Uploads

1,000,000 users × 1 photo = 1,000,000 photos per day.

### Uploads Per Second

1,000,000 ÷ 86,400 ≈ **11.6 uploads per second** (average).

### Feed Views Per Second

- Daily feed views = 1,000,000 × 50 = 50,000,000 feed pages.
- Average = 50,000,000 ÷ 86,400 ≈ **579 feed views per second**.
- Peak = 579 × 5 ≈ **2,895 feed views per second**.

The system should be designed for roughly 2,900 feed-page requests per second at peak, with headroom for unexpected spikes.

### Photo Storage Per Year

- Originals: 1,000,000 × 2 MB = 2,000,000 MB = 2 TB per day; × 365 = **730 TB per year**.
- Thumbnails: 1,000,000 × 0.05 MB = 50,000 MB = 0.05 TB per day; × 365 = **18.25 TB per year**.
- Total: 730 TB + 18.25 TB = **748.25 TB per year**.

These figures exclude backups, replicated copies, database records and other overhead, and assume no compression savings or deletions.

## 3. Is SnapShare Read-Heavy or Write-Heavy?

SnapShare is a **read-heavy system**: about 50 million feed pages are viewed per day against 1 million uploads, a ratio of roughly 50 reads to every write.

What this means for the design:

- Optimise the feed path first: cache feed data and metadata so most requests never reach the database.
- Serve photos and thumbnails through a CDN so the app servers do not carry image traffic.
- Add a database read replica to take read queries off the primary database.
- Keep app servers stateless so more can be added behind the load balancer as demand grows.
- Writes (uploads) are comparatively rare, so they can be handled with simpler, asynchronous processing.

## 4. Why Photos Should Not Be Stored Inside the Database

Photos are large binary files. Storing them in database rows would consume expensive database storage, slow backups and replication, and make queries and index maintenance heavier.

Instead, SnapShare stores original photos and thumbnails in **object storage**, while the database stores only metadata: photo ID, owner ID, upload time, caption and the object-storage key. The database stays small and fast, and object storage delivers the files cheaply and at scale (via the CDN).

## 5. Architecture Diagram

```text
                          USERS
                            |
          +-----------------+------------------+
          | photo/thumbnail                    | feed & upload API
          | downloads                          | requests
          v                                    v
        [CDN] ------ cache miss ---+     [Load Balancer]
                                   |            |
                                   |            v
                                   |      [App Servers]
                                   |       |    |    |
                  +----------------|-------+    |    +--------------+
                  |                |            |                   |
                  v                |            v                   v
              [Cache]              |     [Primary Database]     [Queue]
                                   |            |                   |
                                   |            | replication       v
                                   |            v               [Worker]
                                   |      [Read Replica]            |
                                   |                                |
                                   v                                |
                            [Object Storage] <----------------------+
                         (originals + thumbnails)    worker reads original,
                                   ^                 writes 50 KB thumbnail
                                   |
                     App servers write originals here on upload
```

Simplified logical view: the app servers handle API requests, authentication and metadata; the cache and read replica absorb feed reads; the queue and worker create thumbnails in the background; the CDN fetches files from object storage on a cache miss and serves them to users.

## 6. Components and the Problems They Solve

- **CDN:** Solves slow and expensive photo delivery by serving cached photos and thumbnails from locations close to users, keeping that traffic off the app servers.
- **Load balancer:** Solves single-server overload by spreading incoming requests across many app servers and routing around unhealthy ones.
- **App servers:** Solve the need for business logic by handling authentication, upload coordination and feed generation, and by talking to the cache, database and queue.
- **Cache:** Solves repeated expensive database reads by keeping frequently requested feed data and metadata in fast memory.
- **Primary database:** Solves reliable storage of structured data by holding users, follows and photo metadata, and by handling all writes.
- **Read replica:** Solves read pressure on the primary database by serving copies of the data for read queries that can tolerate slight delay.
- **Object storage:** Solves the problem of storing huge volumes of large files by holding originals and thumbnails outside the database, cheaply and durably.
- **Queue:** Solves slow uploads by holding thumbnail jobs so the user never waits for image processing, and by absorbing bursts of uploads.
- **Worker:** Solves the heavy image-processing workload by creating thumbnails in the background, independently of the app servers.

## 7. Step-by-Step Photo Upload Flow

1. The user picks a photo in the app and submits an upload request.
2. The request reaches the load balancer, which forwards it to a healthy app server.
3. The app server authenticates the user and validates the request (file type, permitted size).
4. The app server stores the original photo in object storage under a unique storage key. For large files the client uses a chunked (multipart) upload, so if the network drops, only the missing chunks are re-sent instead of restarting the whole 2 MB transfer.
5. Once object storage confirms the file is stored, the app server saves the photo metadata and storage key in the primary database with a status of `processing`.
6. The app server adds a thumbnail-generation job (containing the photo ID and storage key) to the queue.
7. The app server immediately tells the client the upload was accepted; the user does not wait for thumbnail processing. The client may show the local copy of the photo in the meantime.
8. A background worker takes the job from the queue and reads the original from object storage.
9. The worker generates a 50 KB thumbnail and saves it to object storage.
10. The worker updates the photo's record in the database with the thumbnail key and sets the status to `ready`. If the worker fails, the job is not acknowledged, so the queue makes it available again for a retry; after repeated failures it moves to a dead-letter queue for investigation.
11. The relevant cache entries (for example the uploader's and followers' feeds) are invalidated or updated so the new photo can appear.
12. When followers load their feed, the app servers return photo references from the cache or database, and the client downloads the thumbnails and photos through the CDN. On a cache miss, the CDN fetches the file from object storage and caches it. Until a thumbnail is `ready`, the feed shows a placeholder or the original.

Because thumbnail creation is asynchronous, the upload service can keep accepting new photos while image processing happens separately.

## 8. Design Trade-Offs

### Trade-Off 1: Asynchronous Thumbnail Queue Versus Immediate Availability

A queue and background workers keep uploads fast and let the system absorb bursts, since the user's request ends as soon as the original is stored. The cost is that the thumbnail is not available the instant the upload finishes. Followers might briefly see a placeholder or a full-size image, and a failed job could leave a photo without a thumbnail. SnapShare accepts this by showing placeholders, retrying failed jobs, using a dead-letter queue, and monitoring queue length so delays under peak load are noticed. User experience impact: a short delay before the polished thumbnail appears, in exchange for a fast, reliable upload.

### Trade-Off 2: Read Replicas Versus Strongly Consistent Reads

A read replica gives more read capacity and protects the primary database, which matters because the system is read-heavy. But replication lag means the replica may be a moment behind the primary. A user who uploads a photo and opens their own feed immediately might not see it, or a follower might see it slightly later than expected. SnapShare can read from the primary for "read-your-own-writes" cases (such as the uploader viewing their profile or feed right after posting) and use replicas for ordinary feed browsing, where a few seconds of delay is acceptable. User experience impact: occasional slight staleness in feeds in exchange for much better scalability and lower latency under peak load.

### Trade-Off 3: Caching Versus Data Freshness

Caching speeds up feeds and cuts database load, but cached data can be outdated after a new upload or a change in who a user follows. SnapShare must choose sensible expiry times and invalidate or update affected cache entries when data changes.

### Trade-Off 4: Object Storage and CDN Versus Cost and Complexity

Object storage and a CDN provide scalable storage and fast delivery, but add service costs, configuration, access control and monitoring work. With roughly 748 TB of new photos per year and 50 million feed views per day, these costs are justified.

## 9. Conclusion

SnapShare has about 1 million daily active users, 1 million uploads per day, an average of 579 feed views per second and a peak of about 2,895 feed views per second. Original photos and thumbnails need about 748.25 TB of new storage per year under the stated assumptions.

Because the system is read-heavy, the design relies on a CDN, caching, a load balancer, scalable app servers and a read replica for fast feeds. Object storage holds the photo files, and a queue with background workers creates thumbnails without delaying uploads. The main compromises are brief thumbnail delays and slightly stale reads, both of which are managed with placeholders, retries and targeted reads from the primary database.