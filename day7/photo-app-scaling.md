
# SnapShare: Scaling Plan for a Photo-Sharing App

## 1. Assumptions

SnapShare is a photo-sharing application where users upload photos and view a feed containing photos from people they follow.

The following assumptions are used in this scaling plan:

- The application has 10 million registered users.
- 10% of registered users are active each day.
- Each daily active user uploads one photo per day.
- Each daily active user views 50 feed pages per day.
- Each original photo has an average size of 2 MB.
- Each photo has one thumbnail of 50 KB.
- There are 86,400 seconds in a day and 365 days in a year.
- All uploaded photos and thumbnails are retained for at least one year.
- Storage estimates use decimal units: 1 TB = 1,000,000 MB.
- The peak feed-view rate is estimated as five times the average rate.
- The calculations represent average daily activity; actual traffic may vary by time of day.

### Daily Active Users

Daily active users (DAU) are calculated as:

10,000,000 × 10% = 1,000,000 users.

Therefore, SnapShare has approximately **1 million daily active users**.

## 2. Traffic and Storage Estimates

### Daily Uploads

Each daily active user uploads one photo per day.

Daily uploads = 1,000,000 × 1 = 1,000,000 photos.

### Uploads Per Second

Average uploads per second = daily uploads ÷ seconds in a day.

= 1,000,000 ÷ 86,400

= approximately **11.6 uploads per second**.

### Feed Views Per Second

Each daily active user views 50 feed pages per day.

Daily feed views = 1,000,000 × 50 = 50,000,000 feed pages.

Average feed views per second:

= 50,000,000 ÷ 86,400

= approximately **579 feed views per second**.

Peak feed views per second:

= 579 × 5

= approximately **2,895 feed views per second**.

The system should therefore be designed to handle around 2,900 feed-page requests per second during peak periods, with additional capacity for unexpected traffic.

### Photo Storage Per Year

Each original photo is 2 MB.

Daily original photo storage:

= 1,000,000 × 2 MB

= 2,000,000 MB = 2 TB per day.

Annual original photo storage:

= 2 TB × 365

= **730 TB per year**.

Each thumbnail is 50 KB, equivalent to 0.05 MB.

Daily thumbnail storage:

= 1,000,000 × 0.05 MB

= 50,000 MB = 0.05 TB per day.

Annual thumbnail storage:

= 0.05 TB × 365

= **18.25 TB per year**.

Total annual storage for original photos and thumbnails:

= 730 TB + 18.25 TB

= **748.25 TB per year**.

These figures exclude backups, replicated copies, database records, and other operational overhead. They assume all photos and thumbnails are retained and do not include storage savings from compression or deletion.

## 3. Is SnapShare Read-Heavy or Write-Heavy?

SnapShare is a **read-heavy system** because users view approximately 50 million feed pages per day, compared with 1 million photo uploads per day.

This means the system handles many more feed requests than new photo uploads. The architecture should therefore prioritise fast feed loading, caching, efficient database reads, and delivery of photos through a Content Delivery Network (CDN).

A database read replica can handle some read traffic separately from the primary database, reducing the workload on the primary database. The application should also be able to add more app servers when demand increases.

## 4. Why Photos Should Not Be Stored Inside the Database

Photos are large binary files that would consume substantial database storage and increase backup, replication, and retrieval costs if stored directly in database records.

Instead, SnapShare should store original photos and thumbnails in **object storage**, while the database stores their metadata, such as photo ID, owner ID, upload time, caption, and object-storage path.

This approach allows photo files to be stored and delivered efficiently, while the database remains focused on structured records and relationships.

## 5. Architecture Diagram

The following diagram shows the proposed architecture for SnapShare.

```text
                       USERS
                         |
                         v
                       [CDN]
                         |
                         v
                  [Load Balancer]
                         |
                         v
                   [App Servers]
                    /    |     \
                   /     |      \
                  v      v       v
              [Cache] [Primary  [Object
                        Database] Storage]
                            |       ^
                            |       |
                            v       |
                      [Read Replica]|
                                    |
               [Upload Request]     |
                      |             |
                      v             |
                  [App Servers]     |
                      |             |
                      v             |
                    [Queue]         |
                      |             |
                      v             |
                    [Worker]--------+
                 Creates thumbnail
```

The diagram is a simplified logical view. App servers coordinate uploads and metadata updates; workers process queued thumbnail jobs and save the resulting files to object storage. The CDN delivers cached photo files to users.

## 6. Components and the Problems They Solve

- **CDN:** Delivers cached photos and thumbnails from locations closer to users, reducing latency and traffic reaching the application servers.
- **Load balancer:** Distributes incoming requests across available app servers to prevent one server from becoming overloaded.
- **App servers:** Handle user requests, authentication, photo-upload coordination, feed generation, and communication with the cache and database.
- **Cache:** Stores frequently accessed feed data and metadata temporarily to reduce repeated database queries and improve response times.
- **Primary database:** Stores structured records such as users, follow relationships, photo metadata, and feed-related information, and handles database writes.
- **Read replica:** Receives replicated database changes and serves suitable read queries, reducing read pressure on the primary database.
- **Object storage:** Stores the original photo files and generated thumbnails without placing large binary files directly in the database.
- **Queue:** Holds thumbnail-generation jobs so that photo uploads do not need to wait for image processing to finish.
- **Worker:** Processes queued jobs in the background, creates thumbnails, and saves them to object storage.

## 7. Step-by-Step Photo Upload Flow

1. A user selects a photo and submits an upload request to SnapShare.
2. The request reaches the load balancer, which forwards it to an available app server.
3. The app server authenticates the user and validates the request, including the file type and permitted size.
4. The original photo is uploaded to object storage, where it receives a unique storage key.
5. The app server saves the photo metadata and storage key in the primary database.
6. The app server adds a thumbnail-generation job to the queue.
7. The app server confirms that the upload has been accepted or completed, without making the user wait for thumbnail processing.
8. A background worker retrieves the job from the queue and downloads or reads the original photo from object storage.
9. The worker generates a smaller 50 KB thumbnail and stores it in object storage.
10. The thumbnail's storage key or metadata is recorded or updated in the database, if needed.
11. When users view feeds, the app servers retrieve the necessary feed data from the cache or database and provide photo references.
12. The CDN delivers cached photos and thumbnails to users; if an asset is not cached, it retrieves it from the configured origin, such as object storage.

The queue and worker make thumbnail generation asynchronous, allowing the upload service to accept new photos while image processing happens in the background.

## 8. Design Trade-Offs

### Trade-Off 1: Caching Versus Data Freshness

Caching improves feed performance and reduces database load, but cached information can become outdated when a user uploads a photo or changes whom they follow. SnapShare must choose suitable cache expiration times and invalidate or update affected cache entries when necessary.

### Trade-Off 2: Asynchronous Processing Versus Immediate Availability

Using a queue and background worker allows uploads to complete without waiting for thumbnail generation, improving responsiveness. However, a thumbnail may not be available immediately after upload, so the application must handle pending jobs and retry failed jobs.

### Trade-Off 3: Read Replicas Versus Strongly Consistent Reads

A read replica reduces pressure on the primary database and improves read capacity, but replication delay can mean a recently uploaded photo does not immediately appear in some feed queries. SnapShare can use the primary database for reads that require the latest data and the replica for less time-sensitive queries.

### Trade-Off 4: Object Storage and CDN Versus Cost and Complexity

Object storage and a CDN provide scalable photo storage and fast delivery, but introduce additional service costs, configuration, access-control requirements, and monitoring needs. These costs are justified by the large volume of photo data and the high number of feed views.

## 9. Conclusion

SnapShare has approximately 1 million daily active users, 1 million photo uploads per day, an average of 579 feed views per second, and a projected peak of about 2,895 feed views per second. Original photos and thumbnails require approximately 748.25 TB of additional storage per year under the stated assumptions.

Because SnapShare is read-heavy, the proposed design uses a CDN, caching, a load balancer, scalable app servers, and a read replica to support fast feed delivery. Object storage handles photo files, while a queue and background worker generate thumbnails without delaying uploads.
