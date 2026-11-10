# My Chapters — Testing Documentation (Phase 1)

## 1. Overview of Automated Test Architecture

Phase 1 includes a comprehensive automated integration and unit test suite comprising **34 automated tests across 5 test suites**.
- **Runner**: Native Node.js Test Runner (`node:test` + `node:assert/strict`).
- **In-Memory Database**: `MongoMemoryReplSet` providing a real MongoDB replica set inside the process, allowing genuine multi-document ACID transactions, database-level unique indexes, and TTL index evaluations.
- **HTTP Mocking / Agent**: `supertest` for full HTTP request/response validation including cookie extraction, headers, status codes, and error formatting.

---

## 2. Test Execution Summary

| Test Suite | File | Tests | Status |
|---|---|:---:|:---:|
| **Signup Suite** | `server/tests/auth.signup.test.js` | 10 | **PASS (10/10)** |
| **Signin Suite** | `server/tests/auth.signin.test.js` | 6 | **PASS (6/6)** |
| **Get Me Suite** | `server/tests/auth.me.test.js` | 6 | **PASS (6/6)** |
| **Logout Suite** | `server/tests/auth.logout.test.js` | 4 | **PASS (4/4)** |
| **Security Hardening** | `server/tests/security.test.js` | 8 | **PASS (8/8)** |
| **Total** | | **34** | **ALL PASS** |

---

## 3. Detailed Test Scenarios Executed

### 3.1 Signup Suite (`server/tests/auth.signup.test.js`)
1. **Successful Signup**: Atomically provisions `Space` and `Admin` user (201 Created). Confirms bidirectional database linking (`user.spaceId === space.id` and `space.owner === user.id`).
2. **Missing Fields**: Confirms 400 Bad Request if `username`, `email`, `password`, `spaceName`, or `accessCode` is omitted.
3. **Invalid Email**: Rejects non-email formats with 400 Bad Request.
4. **Weak Passwords**: Verifies rejection of passwords lacking uppercase, lowercase, numbers, or under 8 characters with 400 Bad Request.
5. **Incorrect Access Code**: Verifies constant-time rejection with 400 Bad Request for incorrect codes.
6. **Duplicate Username**: Case-insensitive conflict check returns 409 Conflict.
7. **Duplicate Email**: Case-insensitive conflict check returns 409 Conflict.
8. **Duplicate Space Name**: Case-insensitive conflict check returns 409 Conflict.
9. **Slug Collision**: Generates safe unique slugs (`rayals-space`, `rayals-space-1`) when different names produce the same slug base.
10. **Database Transaction Rollback**: Verifies that when any atomic operation fails, the transaction aborts and leaves zero orphaned records in either collection.

### 3.2 Signin Suite (`server/tests/auth.signin.test.js`)
1. **Signin with Email**: Valid credentials return 200, user and space objects, set HttpOnly cookie, and create an active `AuthSession`.
2. **Signin with Username**: Case-insensitive username lookup successfully authenticates.
3. **Incorrect Password**: Returns generic 401 Unauthorized (`"Invalid credentials"`).
4. **Nonexistent User**: Returns identical generic 401 Unauthorized (`"Invalid credentials"`).
5. **Missing Fields**: Returns 400 Bad Request when identifier or password is missing.
6. **Rate Limiting**: Exceeding 10 signin attempts triggers 429 Too Many Requests.

### 3.3 Get Me Suite (`server/tests/auth.me.test.js`)
1. **Valid Authentication**: Returns sanitized user and Space info with status 200.
2. **Missing Cookie**: Returns 401 Unauthorized.
3. **Invalid JWT**: Forged/tampered JWT tokens are rejected with 401 Unauthorized.
4. **Expired JWT**: Expired tokens return 401 Unauthorized.
5. **Revoked Session**: A session flagged with `revokedAt` in MongoDB is rejected with 401 Unauthorized even if the JWT signature is valid.
6. **Deleted User**: Returns 401 Unauthorized if the user document was removed from MongoDB.

### 3.4 Logout Suite (`server/tests/auth.logout.test.js`)
1. **Successful Logout**: Returns 200, flags MongoDB session `revokedAt`, and clears cookie with expired timestamp.
2. **Repeated Logout (Idempotent)**: Multiple calls succeed cleanly without throwing.
3. **Expired or Invalid Cookie**: Clears browser cookie cleanly and returns 200.
4. **Missing Cookie**: Succeeds safely without error.

### 3.5 Security Hardening Suite (`server/tests/security.test.js`)
1. **Password Hash Excluded in Signup**: Password field stripped from output.
2. **Password Hash Excluded in Signin**: Password field stripped from output.
3. **Access Code Never Disclosed**: Neither valid nor invalid codes are leaked in response bodies or errors.
4. **JWT Never Returned in JSON**: Verified that JWT exists solely within the `Set-Cookie` header.
5. **Origin Validation (Untrusted Origin)**: Cross-site POST requests from untrusted origins return 403 Forbidden.
6. **Origin Validation (Trusted Origin)**: Requests from `CLIENT_URL` are permitted.
7. **CORS Headers**: Validates `Access-Control-Allow-Origin` and `Access-Control-Allow-Credentials: true`.
8. **Health Check Sanitization**: Confirms `/api/health` does not leak DB URIs, passwords, or secrets.

---

## 4. How to Run Automated Tests

From the repository root:
```bash
npm test
```
Or directly within the `server/` directory:
```bash
cd server
npm test
```

To run a specific test file:
```bash
cd server
node --test tests/auth.signup.test.js
node --test tests/auth.signin.test.js
node --test tests/auth.me.test.js
node --test tests/auth.logout.test.js
node --test tests/security.test.js
```

---

## 5. Postman Manual Testing Guide

A ready-to-import Postman Collection is provided in `docs/My_Chapters_Phase1.postman_collection.json`.

### Setup
1. Open Postman.
2. Click **Import** and select `docs/My_Chapters_Phase1.postman_collection.json`.
3. Verify Collection Variables:
   - `baseUrl`: `http://localhost:5000`
   - `accessCode`: `MY_CHAPTERS_EARLY_ACCESS_2026`

### Testing Workflow
1. **Health Check**:
   - Run `GET {{baseUrl}}/api/health`.
   - Verify `status: 200` and `status: "UP"`.
2. **Signup**:
   - Run `POST {{baseUrl}}/api/auth/signup`.
   - Verify `status: 201`.
   - Inspect body: Verify `user.role === "ADMIN"` and `space.slug === "my-space"`.
   - Verify that **NO** authentication cookie was set.
3. **Signin**:
   - Run `POST {{baseUrl}}/api/auth/signin`.
   - Verify `status: 200`.
   - In Postman's **Cookies** tab, confirm that the cookie `mc_auth_token` was created with `HttpOnly` enabled.
   - Verify response JSON does **NOT** contain a JWT string.
4. **Get Current User (`/api/auth/me`)**:
   - Run `GET {{baseUrl}}/api/auth/me`.
   - Postman will automatically send the `mc_auth_token` cookie.
   - Verify `status: 200` with user and space information.
5. **Logout**:
   - Run `POST {{baseUrl}}/api/auth/logout`.
   - Verify `status: 200`.
   - Confirm in Postman's Cookies tab that `mc_auth_token` has been cleared or expired.
6. **Verify Invalidation**:
   - Re-run `GET {{baseUrl}}/api/auth/me`.
   - Confirm `status: 401 Unauthorized` because the session was revoked.
