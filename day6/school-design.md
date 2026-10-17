
# School Database Design

## Overview

This database manages students, courses and enrolments. It records which students take which courses and the grades they receive.

## Tables

### Students

The students table stores each student's unique ID, name and email address. The student ID is the primary key, and the email address must be unique and cannot be empty.

### Courses

The courses table stores each course's unique ID and name. The course ID is the primary key, and the course name is required and unique.

### Enrolments

The enrolments table records which student is taking which course and the grade received. Its enrolment ID is the primary key. Student ID and course ID are foreign keys referencing the students and courses tables. Both are required. A unique constraint on the pair prevents duplicate enrolments for the same student and course.

## Relationships

### One-to-Many Relationships

A student can have many enrolments, but each enrolment belongs to one student. Similarly, a course can have many enrolments, but each enrolment refers to one course.

### Many-to-Many Relationship

Students and courses have a many-to-many relationship because one student can take several courses and each course can have several students.

The enrolments table acts as a join table between students and courses. It resolves the many-to-many relationship into two one-to-many relationships. It also stores the grade associated with each student-course combination.

## Index

I would add an index on `enrolments(course_id)` to help the database find all students enrolled in a particular course more efficiently. This can improve queries that filter enrolments by course. The unique constraint on `(student_id, course_id)` already creates an index for that pair.

## SQL or NoSQL?

I would choose a relational SQL database such as SQLite for this school system. Students, courses and enrolments have clearly defined relationships, and foreign keys help maintain data integrity. SQL also supports JOIN, GROUP BY and aggregate queries needed to list courses, count students and calculate enrolment statistics. A NoSQL database could be useful for less structured data, but SQL is a natural fit for this system's structured records and relationships.
