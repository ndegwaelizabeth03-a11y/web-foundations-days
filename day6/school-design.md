
# School Database Design

## Overview

This database manages students, courses and enrolments. It records which students take which courses and the grades they receive. The database uses relational tables, primary keys, foreign keys and constraints to maintain accurate and consistent data.

## Tables

### Students

The students table stores each student's unique ID, name and email address. The student ID is the primary key. The email address is required and must be unique so that two students cannot register using the same email address.

### Courses

The courses table stores each course's unique ID and name. The course ID is the primary key. The course name is required and must be unique to prevent duplicate course records.

### Enrolments

The enrolments table records which student takes which course and the grade received. The enrolment ID is the primary key. Student ID and course ID are foreign keys referencing the students and courses tables. Both fields are required.

A unique constraint on `(student_id, course_id)` prevents a student from enrolling in the same course more than once.

## Relationships

### One-to-Many Relationships

A student can have many enrolments, but each enrolment belongs to one student. Similarly, a course can have many enrolments, but each enrolment refers to one course.

### Many-to-Many Relationship

Students and courses have a many-to-many relationship because one student can take several courses and each course can have several students.

The enrolments table acts as a join table between students and courses. It resolves the many-to-many relationship into two one-to-many relationships. It also stores the grade associated with each student-course combination.

## Relational Integrity and Cascading Deletes

Relational integrity ensures that the records in related tables remain consistent and that enrolments do not refer to students or courses that do not exist.

In SQLite, I will enable foreign-key enforcement using:

`PRAGMA foreign_keys = ON;`

This statement must be executed for each database connection, before running database operations that rely on foreign-key enforcement. It ensures that SQLite checks the foreign-key constraints when records are inserted, updated or deleted.

The enrolments table references the students and courses tables through foreign keys. I will apply `ON DELETE CASCADE` to both foreign keys:

- When a student is deleted, all enrolment records associated with that student are automatically deleted.
- When a course is deleted, all enrolment records associated with that course are automatically deleted.

These cascading-delete rules prevent orphaned records in the enrolments table. An orphaned record is an enrolment that refers to a student or course that no longer exists. The rules maintain data consistency without requiring manual deletion of each related enrolment.

## Index

I created an index on `enrolments(course_id)` to help the database find enrolments for a particular course more efficiently.

The index is useful for queries that list students enrolled in a specific course. I verified its use with SQLite's `EXPLAIN QUERY PLAN` statement, which showed that SQLite used the `idx_enrolments_course_id` index for a query filtering by `course_id`.

The unique constraint on `(student_id, course_id)` also creates an index that supports checking for duplicate enrolments.

## SQL or NoSQL?

I would choose a relational SQL database such as SQLite for this school system. Students, courses and enrolments have clearly defined relationships, and primary and foreign keys help maintain data integrity. SQL also supports JOIN, GROUP BY and aggregate queries needed to list courses, count students and calculate enrolment statistics.

A NoSQL database could be useful for less structured data, but SQL is a natural fit for this system's structured records and relationships.
