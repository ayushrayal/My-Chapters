# My Chapters — Someday Feature API Documentation
## Phase 1: Backend Architecture, Category CRUD, Item CRUD & Tenant Security

---

## 1. Feature Overview & Architecture

**Someday** is a core personal documentation capability in **My Chapters** enabling users to curate items they intend to purchase (`PLANNED`) and archive things they have already acquired (`PURCHASED`).

### Key Design Principles:
- **Strict Multi-Tenancy**: Every category and item belongs strictly to one `Space`. Authorization is derived solely from the authenticated session context (`req.user.spaceId`).
- **Predefined System 'Other' Category**: Every Space is automatically provisioned with a protected system category named `Other` (`isSystem: true`).
- **Referential Integrity on Deletion**: Deleting a custom category atomically reassigns all its contained items to the Space's `Other` category within a MongoDB transaction.
- **Controlled Status Transitions**: Status is strictly restricted to `PLANNED` and `PURCHASED`. Marking an item as `PURCHASED` defaults the `purchaseDate` to the current timestamp if not explicitly supplied, while reverting to `PLANNED` automatically clears `purchaseDate`.
- **Zero Extraneous Complexity**: No external web scraping, price tracking, image uploading, or search indexes.

---

## 2. Authentication & Authorization

All Someday endpoints require an active authenticated user session via HttpOnly cookie:
- **Cookie Name**: `mychapters_auth`
- **Session Verification**: Verified via JWT and validated against the active MongoDB `AuthSession` collection.
- **Tenant Scoping**: The server derives `spaceId = req.user.spaceId`. Any `spaceId` submitted by the client in request bodies, headers, or query parameters is strictly ignored.

---

## 3. Data Models & Validation Rules

### A. SomedayCategory Model
```json
{
  "id": "67303e9c8a14b51200112233",
  "spaceId": "67303e9c8a14b51200000001",
  "name": "Electronics",
  "nameNormalized": "electronics",
  "isSystem": false,
  "itemCount": 3,
  "createdAt": "2026-11-10T10:00:00.000Z",
  "updatedAt": "2026-11-10T10:00:00.000Z"
}
```
- **Rules**:
  - `name`: String, required, 1-60 characters, trimmed.
  - `nameNormalized`: String, automatic lowercase trimmed value.
  - Compound unique index: `{ spaceId: 1, nameNormalized: 1 }`.
  - System categories (`isSystem: true`) cannot be deleted or renamed.

### B. SomedayItem Model
```json
{
  "id": "67303e9c8a14b51200998877",
  "spaceId": "67303e9c8a14b51200000001",
  "name": "Sony WH-1000XM5 Headphones",
  "category": {
    "id": "67303e9c8a14b51200112233",
    "name": "Electronics",
    "isSystem": false
  },
  "categoryId": "67303e9c8a14b51200112233",
  "links": [
    {
      "label": "Official Product Page",
      "url": "https://electronics.sony.com/audio/headphones"
    }
  ],
  "note": "Wait for Black Friday discount",
  "status": "PLANNED",
  "purchaseDate": null,
  "createdAt": "2026-11-10T10:00:00.000Z",
  "updatedAt": "2026-11-10T10:00:00.000Z"
}
```
- **Rules**:
  - `name`: String, required, 1-120 characters, trimmed.
  - `categoryId`: ObjectId string, required, must exist in user's Space.
  - `links`: Array of link objects, maximum 3. Each link requires a valid `http://` or `https://` URL. Optional label up to 100 characters.
  - `note`: String, optional, up to 2000 characters.
  - `status`: Enum, `PLANNED` | `PURCHASED`, default `PLANNED`.
  - `purchaseDate`: ISO 8601 date or null. Defaults to current date upon `PURCHASED` transition if omitted. Cleared when reverted to `PLANNED`.

---

## 4. Category Management APIs

### 4.1. Create Category
- **Route**: `POST /api/someday/categories`
- **Headers**: `Content-Type: application/json`, Cookie: `mychapters_auth=...`
- **Request Body**:
  ```json
  {
    "name": "Watches"
  }
  ```
- **Success Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "message": "Category created successfully",
    "data": {
      "id": "67303e9c8a14b51200112244",
      "spaceId": "67303e9c8a14b51200000001",
      "name": "Watches",
      "nameNormalized": "watches",
      "isSystem": false,
      "itemCount": 0,
      "createdAt": "2026-11-10T10:00:00.000Z",
      "updatedAt": "2026-11-10T10:00:00.000Z"
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Empty name, whitespace only, or length > 60.
  - `409 Conflict`: Category with that name already exists in user's Space (e.g., trying to create another `Other` or existing custom name).

---

### 4.2. Get All Categories
- **Route**: `GET /api/someday/categories`
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Categories retrieved successfully",
    "data": [
      {
        "id": "67303e9c8a14b51200112244",
        "spaceId": "67303e9c8a14b51200000001",
        "name": "Watches",
        "nameNormalized": "watches",
        "isSystem": false,
        "itemCount": 2,
        "createdAt": "2026-11-10T10:00:00.000Z",
        "updatedAt": "2026-11-10T10:00:00.000Z"
      },
      {
        "id": "67303e9c8a14b51200112200",
        "spaceId": "67303e9c8a14b51200000001",
        "name": "Other",
        "nameNormalized": "other",
        "isSystem": true,
        "itemCount": 0,
        "createdAt": "2026-11-10T09:00:00.000Z",
        "updatedAt": "2026-11-10T09:00:00.000Z"
      }
    ]
  }
  ```
- **Sorting Rule**: Custom categories sorted alphabetically by name first, followed by system `Other`.

---

### 4.3. Update Category
- **Route**: `PATCH /api/someday/categories/:categoryId`
- **Request Body**:
  ```json
  {
    "name": "Timepieces"
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Category updated successfully",
    "data": {
      "id": "67303e9c8a14b51200112244",
      "spaceId": "67303e9c8a14b51200000001",
      "name": "Timepieces",
      "nameNormalized": "timepieces",
      "isSystem": false,
      "itemCount": 2,
      "createdAt": "2026-11-10T10:00:00.000Z",
      "updatedAt": "2026-11-10T10:15:00.000Z"
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Attempting to rename system `Other` category or empty name.
  - `404 Not Found`: Category does not exist or belongs to another Space.
  - `409 Conflict`: Target name already in use by another category in user's Space.

---

### 4.4. Delete Category
- **Route**: `DELETE /api/someday/categories/:categoryId`
- **Behavior**:
  - Verifies category belongs to caller's Space.
  - Blocks deletion if category `isSystem: true`.
  - Atomically moves all items belonging to this category to the Space's `Other` category using a MongoDB transaction.
  - Deletes original category document.
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Category deleted successfully",
    "data": {
      "movedItems": 4
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Cannot delete system `Other` category.
  - `404 Not Found`: Category does not exist or belongs to another Space.

---

## 5. Item Management APIs

### 5.1. Create Item
- **Route**: `POST /api/someday/items`
- **Request Body**:
  ```json
  {
    "name": "Casio Edifice EFR-S108D",
    "categoryId": "67303e9c8a14b51200112244",
    "links": [
      {
        "label": "Official Product Site",
        "url": "https://www.casio.com/intl/watches/edifice"
      }
    ],
    "note": "Sapphire crystal slim octagonal bezel",
    "status": "PLANNED"
  }
  ```
- **Success Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "message": "Item created successfully",
    "data": {
      "id": "67303e9c8a14b51200889900",
      "spaceId": "67303e9c8a14b51200000001",
      "name": "Casio Edifice EFR-S108D",
      "category": {
        "id": "67303e9c8a14b51200112244",
        "name": "Timepieces",
        "isSystem": false
      },
      "categoryId": "67303e9c8a14b51200112244",
      "links": [
        {
          "label": "Official Product Site",
          "url": "https://www.casio.com/intl/watches/edifice"
        }
      ],
      "note": "Sapphire crystal slim octagonal bezel",
      "status": "PLANNED",
      "purchaseDate": null,
      "createdAt": "2026-11-10T10:20:00.000Z",
      "updatedAt": "2026-11-10T10:20:00.000Z"
    }
  }
  ```
- **Validation Rules**:
  - `links` can be empty or omitted.
  - Maximum 3 links allowed.
  - If created directly with `status: "PURCHASED"`, `purchaseDate` defaults to `now` unless explicitly provided.

---

### 5.2. Get Items
- **Route**: `GET /api/someday/items`
- **Query Parameters**:
  - `categoryId` *(optional)*: Filter items belonging to a specific category.
  - `status` *(optional)*: Filter by `PLANNED` or `PURCHASED`.
- **Query Examples**:
  - `GET /api/someday/items`
  - `GET /api/someday/items?categoryId=67303e9c8a14b51200112244`
  - `GET /api/someday/items?status=PLANNED`
  - `GET /api/someday/items?status=PURCHASED`
  - `GET /api/someday/items?categoryId=67303e9c8a14b51200112244&status=PURCHASED`
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Items retrieved successfully",
    "data": [
      {
        "id": "67303e9c8a14b51200889900",
        "spaceId": "67303e9c8a14b51200000001",
        "name": "Casio Edifice EFR-S108D",
        "category": {
          "id": "67303e9c8a14b51200112244",
          "name": "Timepieces",
          "isSystem": false
        },
        "categoryId": "67303e9c8a14b51200112244",
        "links": [
          {
            "label": "Official Product Site",
            "url": "https://www.casio.com/intl/watches/edifice"
          }
        ],
        "note": "Sapphire crystal slim octagonal bezel",
        "status": "PLANNED",
        "purchaseDate": null,
        "createdAt": "2026-11-10T10:20:00.000Z",
        "updatedAt": "2026-11-10T10:20:00.000Z"
      }
    ]
  }
  ```

---

### 5.3. Get Item Details
- **Route**: `GET /api/someday/items/:itemId`
- **Success Response (`200 OK`)**: Returns single item object with populated category.
- **Error Responses**:
  - `404 Not Found`: Item does not exist or belongs to another Space.

---

### 5.4. Update Item
- **Route**: `PATCH /api/someday/items/:itemId`
- **Request Body (all fields optional)**:
  ```json
  {
    "name": "Casio Edifice EFR-S108D (Blue Dial)",
    "status": "PURCHASED",
    "purchaseDate": "2026-11-10T00:00:00.000Z"
  }
  ```
- **Status & Date Behavior**:
  - Transitioning from `PLANNED` -> `PURCHASED`: If `purchaseDate` is omitted, defaults to `now`.
  - Transitioning from `PURCHASED` -> `PLANNED`: Automatically sets `purchaseDate = null`.
  - Remaining `PURCHASED`: Allows updating `purchaseDate` to any valid historical or future date, or setting to `null`.
  - Category reassignment: Validates that the new `categoryId` belongs to the user's Space.
- **Success Response (`200 OK`)**: Returns updated item record.

---

### 5.5. Delete Item
- **Route**: `DELETE /api/someday/items/:itemId`
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Item deleted successfully",
    "data": {}
  }
  ```
- **Error Responses**:
  - `404 Not Found`: Item does not exist or belongs to another Space.

