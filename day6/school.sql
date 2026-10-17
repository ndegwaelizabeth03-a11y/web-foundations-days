-- Day 6 Assignment: A School Database

-- Enable foreign key enforcement
PRAGMA foreign_keys = ON;


-- 1. DROP EXISTING TABLES
-- Drop enrolments first because it references the other tables

DROP TABLE IF EXISTS enrolments;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS students;


-- 2. CREATE STUDENTS TABLE

CREATE TABLE students (
    student_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
);


-- 3. CREATE COURSES TABLE

CREATE TABLE courses (
    course_id INTEGER PRIMARY KEY,
    course_name TEXT NOT NULL UNIQUE
);


-- 4. CREATE ENROLMENTS TABLE

CREATE TABLE enrolments (
    enrolment_id INTEGER PRIMARY KEY,
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    grade TEXT,

    FOREIGN KEY (student_id)
        REFERENCES students(student_id)
        ON DELETE CASCADE,

    FOREIGN KEY (course_id)
        REFERENCES courses(course_id)
        ON DELETE CASCADE,

    -- Prevent duplicate enrolments
    UNIQUE (student_id, course_id)
);


-- 5. INSERT SAMPLE STUDENTS

INSERT INTO students (student_id, name, email) VALUES
(1, 'Amina Otieno', 'amina@example.com'),
(2, 'Brian Kamau', 'brian@example.com'),
(3, 'Carol Wanjiku', 'carol@example.com'),
(4, 'David Mwangi', 'david@example.com');


-- 6. INSERT SAMPLE COURSES

INSERT INTO courses (course_id, course_name) VALUES
(1, 'Mathematics'),
(2, 'Computer Science'),
(3, 'Statistics');


-- 7. INSERT FIVE ENROLMENTS

INSERT INTO enrolments
    (enrolment_id, student_id, course_id, grade)
VALUES
(1, 1, 1, 'A'),
(2, 1, 2, 'B'),
(3, 2, 1, 'B'),
(4, 2, 3, 'A'),
(5, 3, 2, 'A');


-- 8. CREATE INDEX FOR COURSE LOOKUPS

CREATE INDEX IF NOT EXISTS idx_enrolments_course_id
ON enrolments(course_id);


-- QUERY 1: All courses taken by Amina Otieno

SELECT s.name, c.course_name, e.grade
FROM students AS s
JOIN enrolments AS e
    ON s.student_id = e.student_id
JOIN courses AS c
    ON e.course_id = c.course_id
WHERE s.name = 'Amina Otieno';


-- QUERY 2: All students enrolled in Mathematics

SELECT s.name, s.email, c.course_name
FROM enrolments AS e
JOIN students AS s
    ON s.student_id = e.student_id
JOIN courses AS c
    ON c.course_id = e.course_id
WHERE e.course_id = 1;


-- QUERY 3: Number of students enrolled in each course

SELECT c.course_name,
       COUNT(e.student_id) AS number_of_students
FROM courses AS c
LEFT JOIN enrolments AS e
    ON c.course_id = e.course_id
GROUP BY c.course_id, c.course_name
ORDER BY c.course_id;


-- QUERY 4: Students who have no enrolments

SELECT s.student_id, s.name, s.email
FROM students AS s
LEFT JOIN enrolments AS e
    ON s.student_id = e.student_id
WHERE e.student_id IS NULL;


-- QUERY 5: Update one enrolment's grade

UPDATE enrolments
SET grade = 'A'
WHERE enrolment_id = 3;


-- VERIFY THE GRADE UPDATE

SELECT s.name, c.course_name, e.grade
FROM enrolments AS e
JOIN students AS s
    ON e.student_id = s.student_id
JOIN courses AS c
    ON e.course_id = c.course_id
WHERE e.enrolment_id = 3;


-- 9. VERIFY INDEX USAGE

EXPLAIN QUERY PLAN
SELECT *
FROM enrolments
WHERE course_id = 1;