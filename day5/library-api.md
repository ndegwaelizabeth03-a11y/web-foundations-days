
# Library Books REST API Design

## Overview

This API allows clients to manage books in a library. It supports listing books, retrieving a single book, creating books, updating book details, deleting books, and searching for books by author.

Base URL: `/api`

## Endpoints

### 1. List all books

- **Method:** GET
- **Path:** `/api/books`
- **Description:** Returns a list of all books.
- **Success status:** 200 OK
- **Example request body:** None required.

### 2. Get one book

- **Method:** GET
- **Path:** `/api/books/{id}`
- **Description:** Returns the details of a book with the specified ID.
- **Success status:** 200 OK
- **Example request body:** None required.

### 3. Create a book

- **Method:** POST
- **Path:** `/api/books`
- **Description:** Creates a new book in the library.
- **Example request body:**

```json
{
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "publishedYear": 1958
}
```

- **Success status:** 201 Created

### 4. Update a book

- **Method:** PUT
- **Path:** `/api/books/{id}`
- **Description:** Replaces the details of an existing book.
- **Example request body:**

```json
{
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "publishedYear": 1958
}
```

- **Success status:** 200 OK

### 5. Delete a book

- **Method:** DELETE
- **Path:** `/api/books/{id}`
- **Description:** Deletes the book with the specified ID.
- **Success status:** 204 No Content
- **Example request body:** None required.

### 6. List books by author

- **Method:** GET
- **Path:** `/api/books?author=Chinua%20Achebe`
- **Description:** Returns books written by the specified author.
- **Success status:** 200 OK
- **Example request body:** None required.

## Error Responses

### 400 Bad Request

Returned when the request contains invalid data.

Example: A client attempts to create a book without a required title or author.

### 404 Not Found

Returned when the requested resource does not exist.

Example: A client requests `/api/books/999` but no book with ID 999 exists.

## Notes

- The API uses JSON for request and response data.
- Book IDs uniquely identify individual books.
- Query parameters are used to filter books by author.
- Successful creation returns 201, while successful deletion returns 204.
