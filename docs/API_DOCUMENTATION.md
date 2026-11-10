# My Chapters — Backend API Documentation (Phase 1)

## 1. Overview & Architectural Principles

**My Chapters** is a personal life documentation platform engineered with a strict multi-tenant architecture from day one.
- **Application**: My Chapters
- **Personal Workspace**: Space (Never referred to as "Organization")
- **Workspace Owner**: Admin
- **Future Collaborators**: Members

Every user belongs to exactly one **Space**. Multi-tenancy is enforced at the database and middleware layers. Authentication uses cryptographically secure **HttpOnly, SameSite cookies** paired with MongoDB-backed active sessions (`AuthSession`). JWTs are never exposed in JSON responses and are never stored in `localStorage` or `sessionStorage`.

---

## 2. Server Configuration & Environment Variables

| Variable | Type | Default | Description |
|---|---|---|---|
| `NODE_ENV` | String | `development` | Application mode: `development`, `production`, or `test`. |
| `PORT` | Number | `5000` | Port on which the Express server listens. |
| `MONGODB_URI` | String | Required | Connection string for MongoDB. (Replica Set required for transactions). |
| `JWT_SECRET` | String | Required | Cryptographically secure secret (minimum 32 characters) for signing JWTs. |
| `JWT_EXPIRES_IN` | String | `7d` | Token and session validity window (e.g., `7d`, `24h`, `60m`). |
| `ACCESS_CODE` | String | Required | Private registration code verified exclusively on the backend. |
| `CLIENT_URL` | String | Required | Trusted frontend URL allowed for CORS and Origin verification. |
| `COOKIE_DOMAIN` | String | `""` | Cookie domain (empty for localhost; `.yourdomain.com` for cross-subdomain production). |

---

## 3. Standard Response Format

All endpoints return a predictable JSON payload:

### Success Response (`200 OK` or `201 Created`)
```json
{
  "success": true,
  "message": "Human-readable success message",
  "data": { ... }
}
```

### Error Response (`400`, `401`, `403`, `404`, `409`, `429`, `500`)
```json
{
  "success": false,
  "message": "Human-readable error description",
  "errors": [
    {
      "field": "fieldName",
      "message": "Specific validation or domain error message"
    }
  ]
}
```

---

## 4. Endpoints

### 4.1 Health Check
- **Method & Route**: `GET /api/health`
- **Authentication**: None (Public)
- **Description**: Returns operational health, server timestamp, and uptime. Does not disclose credentials, DB paths, or secrets.

#### Response (`200 OK`)
```json
{
  "success": true,
  "message": "My Chapters API service is operational",
  "data": {
    "status": "UP",
    "timestamp": "2026-11-10T14:15:00.000Z",
    "uptime": "42s"
  }
}
```

---

### 4.2 Signup & Space Provisioning
- **Method & Route**: `POST /api/auth/signup`
- **Authentication**: None (Requires valid `accessCode`)
- **Rate Limit**: 10 requests per 15 minutes per IP
- **Description**: Atomically provisions a new `Space` and its `Admin` user inside a MongoDB transaction. Generates a collision-safe URL slug. Does NOT automatically sign the user in.

#### Request Headers
```http
Content-Type: application/json
Origin: http://localhost:5173
```

#### Request Body
```json
{
  "username": "ayush",
  "email": "ayush@example.com",
  "password": "StrongPassword123!",
  "spaceName": "My Space",
  "accessCode": "MY_CHAPTERS_EARLY_ACCESS_2026"
}
```

#### Validation Rules
- `username`: Required, 3–30 characters, alphanumeric, hyphens, and underscores (`^[a-zA-Z0-9](?:[a-zA-Z0-9_-]*[a-zA-Z0-9])?$`).
- `email`: Required, valid email format, max 255 characters. Normalized to lowercase.
- `password`: Required, 8–128 characters, at least 1 uppercase, 1 lowercase, 1 number.
- `spaceName`: Required, 2–50 characters, letters, numbers, spaces, and punctuation (`Rayal's Space` is valid).
- `accessCode`: Required string, verified with timing-safe comparison against backend `ACCESS_CODE`.

#### Response (`201 Created`)
```json
{
  "success": true,
  "message": "User and Space registered successfully. Please sign in.",
  "data": {
    "user": {
      "id": "6730a91e5c464b0012345678",
      "username": "ayush",
      "email": "ayush@example.com",
      "role": "ADMIN",
      "createdAt": "2026-11-10T14:15:00.000Z"
    },
    "space": {
      "id": "6730a91e5c464b0012345679",
      "name": "My Space",
      "slug": "my-space"
    }
  }
}
```

#### Error Responses
- `400 Bad Request`: Validation failure or invalid access code.
- `409 Conflict`: Username already taken, Email already registered, or Space name already taken.
- `429 Too Many Requests`: Rate limit exceeded.

---

### 4.3 Signin
- **Method & Route**: `POST /api/auth/signin`
- **Authentication**: None
- **Rate Limit**: 10 requests per 15 minutes per IP
- **Description**: Authenticates user by email or username, creates an active `AuthSession` in MongoDB, signs a JWT containing `sub` and `sid`, sets an `HttpOnly` cookie, and returns sanitized profile and Space info.

#### Request Headers
```http
Content-Type: application/json
Origin: http://localhost:5173
```

#### Request Body
```json
{
  "identifier": "ayush",
  "password": "StrongPassword123!"
}
```
*(Note: `identifier` can be either the registered email or username).*

#### Response (`200 OK`)
**Response Headers:**
```http
Set-Cookie: mc_auth_token=<JWT>; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800
```
*(In production over HTTPS, `SameSite=None; Secure;` is applied).*

**Response Body:**
```json
{
  "success": true,
  "message": "Signed in successfully",
  "data": {
    "user": {
      "id": "6730a91e5c464b0012345678",
      "username": "ayush",
      "email": "ayush@example.com",
      "role": "ADMIN",
      "createdAt": "2026-11-10T14:15:00.000Z"
    },
    "space": {
      "id": "6730a91e5c464b0012345679",
      "name": "My Space",
      "slug": "my-space"
    }
  }
}
```
*(Note: The JWT is never returned in the JSON payload).*

#### Error Responses
- `401 Unauthorized`: Generic `"Invalid credentials"` (used for both nonexistent user and bad password to eliminate account enumeration).
- `400 Bad Request`: Missing identifier or password.
- `429 Too Many Requests`: Rate limit exceeded.

---

### 4.4 Get Current User (Get Me)
- **Method & Route**: `GET /api/auth/me`
- **Authentication**: Required (`mc_auth_token` HttpOnly cookie)
- **Description**: Verifies session in MongoDB and derives tenant context (`User` and `Space`).

#### Request Headers
```http
Cookie: mc_auth_token=<JWT>
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "message": "User fetched successfully",
  "data": {
    "user": {
      "id": "6730a91e5c464b0012345678",
      "username": "ayush",
      "email": "ayush@example.com",
      "role": "ADMIN",
      "createdAt": "2026-11-10T14:15:00.000Z"
    },
    "space": {
      "id": "6730a91e5c464b0012345679",
      "name": "My Space",
      "slug": "my-space"
    }
  }
}
```

#### Error Responses
- `401 Unauthorized`: Missing cookie, invalid signature, expired token, revoked session, or deleted user account.
- `403 Forbidden`: User has no associated Space in the database.

---

### 4.5 Logout
- **Method & Route**: `POST /api/auth/logout`
- **Authentication**: Optional / Idempotent
- **Description**: Reads JWT if present, marks the active MongoDB session as revoked (`revokedAt = new Date()`), and clears the browser cookie with matching options. Idempotent and safe to invoke multiple times.

#### Request Headers
```http
Cookie: mc_auth_token=<JWT>
Origin: http://localhost:5173
```

#### Response (`200 OK`)
**Response Headers:**
```http
Set-Cookie: mc_auth_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax
```

**Response Body:**
```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": {}
}
```

---

## 5. MongoDB Setup & Replica Set Requirements

### Why Replica Sets Are Required
MongoDB transactions (multi-document ACID transactions) require a replica set topology:
- In production, **MongoDB Atlas** clusters run replica sets by default.
- For local development, running `mongod` with `--replSet rs0` satisfies transaction requirements.
- The service implementation includes automatic standalone detection and handling for local non-replica developers while maintaining full multi-document transaction guarantees in replica-set and Atlas environments.

### Initiating a Local Replica Set
```bash
mongod --dbpath /data/db --replSet rs0
# In mongosh:
rs.initiate()
```

