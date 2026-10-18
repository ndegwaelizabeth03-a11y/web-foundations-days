# SnapShare: Scaling Plan for a Photo-Sharing App

## 1. Assumptions

- 10 million registered users; 10% are active each day.
- Each active user uploads 1 photo and views 50 feed pages per day.
- Photo = 2 MB; thumbnail = 50 KB (0.05 MB); 1 TB = 1,000,000 MB.
- 86,400 seconds per day; 365 days per year; peak = 5x average; photos kept 1+ year.
- Daily active users (DAU) = 10,000,000 x 10% = **1,000,000**.

## 2. Estimates

- Uploads per second: 1,000,000 / 86,400 = **11.6/s**.
- Feed views per second: 50,000,000 / 86,400 = **579/s** average; 579 x 5 = **2,895/s** peak.
- Storage per year: originals 1,000,000 x 2 MB x 365 = 730 TB; thumbnails 1,000,000 x 0.05 MB x 365 = 18.25 TB; total **748.25 TB/year** (before backups and replicas).

## 3. Read-heavy or write-heavy?

**Read-heavy**: 50 million feed views vs 1 million uploads per day (about 50 to 1). So the design optimises reads: a CDN for photos, a cache for feeds, a read replica for queries, and stateless app servers that scale out. Uploads are rare enough to process asynchronously.

## 4. Why photos stay out of the database

Large binary files would bloat the database and slow its backups, replication and queries. Photos and thumbnails go in **object storage**; the database keeps only metadata (photo ID, owner, time, caption, storage key).

## 5. Architecture

```text
USERS
  |  \
  |   +-------> [CDN] --(cache miss)--> [Object Storage]
  v                                       ^           ^
[Load Balancer]                           |           |
  |                                       |           |
  v                          originals    |           | thumbnails
[App Servers] ----------------------------+        [Worker]
  |       |                                            ^
  |       +--> [Cache]                                 |
  |       +--> [Queue] --------------------------------+
  v
[Primary Database] --replicates--> [Read Replica]
```

## 6. Components (the problem each solves)

- **CDN:** serves cached photos from locations near users, cutting latency and load on app servers.
- **Load balancer:** spreads requests across app servers so none is overloaded.
- **App servers:** run authentication, upload coordination and feed generation.
- **Cache:** keeps hot feed data in memory to avoid repeated database queries.
- **Primary database:** stores users, follows and photo metadata and handles all writes.
- **Read replica:** serves read queries from a copy of the data to relieve the primary.
- **Object storage:** holds originals and thumbnails cheaply and durably outside the database.
- **Queue:** holds thumbnail jobs so uploads never wait for image processing.
- **Worker:** creates thumbnails in the background and saves them to object storage.

## 7. Upload flow

1. The client sends an upload request; the load balancer routes it to an app server.
2. The app server authenticates the user and validates file type and size.
3. The original goes to object storage under a unique key, using chunked upload so a dropped connection resumes instead of restarting.
4. Once storage confirms, the app server saves metadata and the key in the primary database with status `processing`.
5. The app server puts a thumbnail job (photo ID, key) on the queue.
6. The app server replies "upload accepted" immediately; the user does not wait.
7. A worker takes the job and reads the original from object storage.
8. The worker creates a 50 KB thumbnail and saves it to object storage.
9. The worker sets the thumbnail key and status `ready` in the database; failed jobs are retried, then moved to a dead-letter queue.
10. Affected feed caches are refreshed; followers load the feed from cache/database and photos via the CDN, which fetches from object storage on a miss.

## 8. Trade-offs

1. **Async thumbnail queue vs immediate availability:** uploads stay fast and absorb bursts, but a thumbnail can be missing for a short time (a placeholder is shown), and failed jobs need retries and queue monitoring.
2. **Read replica lag vs consistency:** the replica adds read capacity, but replication delay means a new photo may not show in some feeds yet (even the uploader's); read-your-own-posts from the primary and use replicas for general browsing.
3. **Caching vs freshness:** feeds load faster, but cached data can be stale, so entries need expiry times and invalidation on new uploads or follows.