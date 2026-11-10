# My Chapters — Someday Feature Testing Guide
## Phase 1: Automated Test Suite, Migration & Postman Verification

---

## 1. Test Suite Architecture & Coverage

The Someday test suite is implemented using the native Node.js test runner (`node:test`) and `supertest`, leveraging `mongodb-memory-server` with an in-memory WiredTiger replica set to execute and verify transactions, unique compound indexes, and atomic migrations without requiring external database dependencies.

### Summary of Automated Test Coverage:
- **Total Backend Tests**: 70 / 70 Passing
- **Original Auth & Security Tests**: 34 Passing
- **Someday Category CRUD Tests**: 13 Passing
- **Someday Item CRUD & Lifecycle Tests**: 11 Passing
- **Someday Multi-Tenant Security & Isolation Tests**: 12 Passing

| Test File | Test Suite Name | Tests | Focus Area |
|---|---|---|---|
| `tests/someday.category.test.js` | Someday - Category CRUD Suite | 13 | Predefined 'Other' provisioning, creation, duplicate prevention, item counting, renaming safeguards, atomic item re-assignment on deletion, migration idempotency |
| `tests/someday.item.test.js` | Someday - Item CRUD & Lifecycle Suite | 11 | Item creation, optional link validation (0 to 3 links, rejecting >3), status transition to `PURCHASED`, default vs manual `purchaseDate`, reversion to `PLANNED` clearing `purchaseDate`, category/status filtering, deletion |
| `tests/someday.security.test.js` | Someday - Multi-Tenant Security Suite | 12 | Isolation between Space A and Space B, query scoping, preventing unauthorized view/update/delete of items & categories, rejection of cross-tenant category assignments, client payload `spaceId` spoofing mitigation |

---

## 2. Running Automated Tests

To execute the entire backend test suite:

```bash
cd server
npm test
```

To run a specific test suite file:

```bash
# Someday Categories
node --test tests/someday.category.test.js

# Someday Items
node --test tests/someday.item.test.js

# Someday Tenant Security
node --test tests/someday.security.test.js
```

---

## 3. Migration Instructions for Existing Spaces

Every Space in **My Chapters** must possess an `Other` system category (`isSystem: true`).

### Execution:
To run the automated, idempotent migration script across all existing Spaces:

```bash
cd server
npm run migrate:someday
```

Or execute directly via Node:
```bash
node src/scripts/migrate-someday-other.js
```

### Safety & Idempotency:
- The script checks each Space in the database.
- If a Space already possesses an `Other` category, it verifies `isSystem: true` and skips recreation.
- If missing, it provisions `{ name: 'Other', nameNormalized: 'other', isSystem: true, spaceId }`.
- Safe to run repeatedly in staging and production pipelines without creating duplicates.
- The server also verifies and provisions missing system categories upon server startup automatically (`src/server.js`).

---

## 4. Step-by-Step Manual Testing with Postman

### Step 1: Health Check
- **Method**: `GET`
- **URL**: `http://localhost:5000/api/health`
- **Expected Status**: `200 OK`
- **Response**: `{ "success": true, "message": "My Chapters API service is operational", ... }`

---

### Step 2: Register a Space & Admin User
- **Method**: `POST`
- **URL**: `http://localhost:5000/api/auth/signup`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "username": "tester_admin",
    "email": "tester@example.com",
    "password": "Password123!",
    "spaceName": "Tester Space",
    "accessCode": "CHANGE_THIS_IN_PRODUCTION_SECRET_KEY"
  }
  ```
- **Expected Status**: `201 Created`
- **Verification**: The Space and Admin user are created, and the predefined `Other` category is automatically provisioned in MongoDB.

---

### Step 3: Sign In (Establish Session Cookie)
- **Method**: `POST`
- **URL**: `http://localhost:5000/api/auth/signin`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "identifier": "tester@example.com",
    "password": "Password123!"
  }
  ```
- **Expected Status**: `200 OK`
- **Cookie Check**: Postman will automatically capture the `mychapters_auth` HttpOnly cookie.

---

### Step 4: Verify Initial Categories (Predefined 'Other')
- **Method**: `GET`
- **URL**: `http://localhost:5000/api/someday/categories`
- **Expected Status**: `200 OK`
- **Response Verification**:
  ```json
  {
    "success": true,
    "data": [
      {
        "name": "Other",
        "nameNormalized": "other",
        "isSystem": true,
        "itemCount": 0
      }
    ]
  }
  ```
  *Copy the `id` of this `Other` category for later steps.*

---

### Step 5: Create a Custom Category
- **Method**: `POST`
- **URL**: `http://localhost:5000/api/someday/categories`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "name": "Books"
  }
  ```
- **Expected Status**: `201 Created`
- **Verification**: Returns newly created category with `isSystem: false`. Save this `id` as `BOOKS_CATEGORY_ID`.

---

### Step 6: Create an Item in the Custom Category
- **Method**: `POST`
- **URL**: `http://localhost:5000/api/someday/items`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "name": "Designing Data-Intensive Applications",
    "categoryId": "<BOOKS_CATEGORY_ID>",
    "links": [
      {
        "label": "O'Reilly",
        "url": "https://www.oreilly.com/library/view/designing-data-intensive-applications/9781491903063/"
      }
    ],
    "note": "Read chapters 5 and 7 on replication and transactions",
    "status": "PLANNED"
  }
  ```
- **Expected Status**: `201 Created`
- **Verification**: `status` is `PLANNED`, `purchaseDate` is `null`. Save this `id` as `ITEM_ID`.

---

### Step 7: Filter Items by Status
- **Method**: `GET`
- **URL**: `http://localhost:5000/api/someday/items?status=PLANNED`
- **Expected Status**: `200 OK`
- **Verification**: Returns array containing the newly created item.

---

### Step 8: Mark Item as PURCHASED (Auto-Sets Purchase Date)
- **Method**: `PATCH`
- **URL**: `http://localhost:5000/api/someday/items/<ITEM_ID>`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "status": "PURCHASED"
  }
  ```
- **Expected Status**: `200 OK`
- **Verification**: `status` updates to `PURCHASED`, and `purchaseDate` automatically populates with today's ISO date string.

---

### Step 9: Revert Item to PLANNED (Auto-Clears Purchase Date)
- **Method**: `PATCH`
- **URL**: `http://localhost:5000/api/someday/items/<ITEM_ID>`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "status": "PLANNED"
  }
  ```
- **Expected Status**: `200 OK`
- **Verification**: `status` reverts to `PLANNED`, and `purchaseDate` is automatically cleared back to `null`.

---

### Step 10: Delete Category & Verify Atomic Migration to 'Other'
- **Method**: `DELETE`
- **URL**: `http://localhost:5000/api/someday/categories/<BOOKS_CATEGORY_ID>`
- **Expected Status**: `200 OK`
- **Response**:
  ```json
  {
    "success": true,
    "message": "Category deleted successfully",
    "data": {
      "movedItems": 1
    }
  }
  ```
- **Follow-Up Check**:
  1. Call `GET /api/someday/items/<ITEM_ID>`. The item now belongs to category `Other` (`isSystem: true`).
  2. Call `GET /api/someday/categories`. The `Other` category now reports `itemCount: 1`.

---

### Step 11: Attempt to Delete System 'Other' Category (Must Fail)
- **Method**: `DELETE`
- **URL**: `http://localhost:5000/api/someday/categories/<OTHER_CATEGORY_ID>`
- **Expected Status**: `400 Bad Request`
- **Response Message**: `"The system Other category cannot be deleted"`

