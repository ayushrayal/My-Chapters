# My Chapters — Backend Security Specification (Phase 1)

## 1. Multi-Tenant Architecture & Data Isolation

### Core Tenancy Model
- Every user belongs strictly to one personal workspace, designated as a **Space**.
- Every Space is owned by an **Admin** user.
- The `User` model stores a direct foreign key reference `spaceId` pointing to the `Space` document.
- The `Space` model stores the `owner` foreign key referencing the `User`.

### Tenant Authorization Principle
- **Never Trust Client-Provided Tenant Identifiers**: The client is never allowed to pass a `spaceId` in request bodies or query params to establish identity or authorization.
- **Server-Derived Identity**: The authentication middleware (`requireAuth`) derives the authenticated user and their Space exclusively from the validated database records associated with the active session.
- Any future resource access (Chapters, Stories, Decisions) must scope queries strictly to `req.user.spaceId`.

---

## 2. Authentication & Session Architecture

### JWT + Stateful Session Invalidation (Hybrid Approach)
Purely stateless JWTs cannot be revoked immediately upon logout or credential reset without blacklists. My Chapters implements a hybrid architecture:
1. **JWT Payload**:
   - `sub`: User ID (`ObjectId` string).
   - `sid`: Session ID (`ObjectId` string referencing `AuthSession`).
2. **MongoDB `AuthSession` Record**:
   - Each login generates a unique `AuthSession` in MongoDB.
   - Sessions hold an `expiresAt` timestamp and an optional `revokedAt` timestamp.
   - When a user logs out, `revokedAt` is set to `new Date()`.
   - On every authenticated request, `requireAuth` queries MongoDB to confirm the session is active (`!revokedAt && expiresAt > now`) and belongs to `sub`.
3. **Automatic Cleanup via TTL**:
   - MongoDB TTL index `{ expiresAt: 1 }, { expireAfterSeconds: 0 }` automatically purges expired session records from the database without cron jobs.
4. **Token Storage**:
   - Raw JWT tokens are **never** stored in MongoDB.
   - JWT tokens are **never** returned in JSON response bodies.
   - Authentication tokens are **never** stored in client `localStorage` or `sessionStorage` (which are vulnerable to XSS).

---

## 3. Password Security & Storage

- **Hashing Algorithm**: `bcryptjs` with an adaptive salt work factor of **12**.
- **Pre-Save Hook**: Mongoose pre-save hook handles hashing on user creation and password modification.
- **Select Protection**: The `password` field on `user.model.js` is declared with `select: false`. Standard database queries never pull the password hash into memory unless explicitly asked with `.select('+password')` during the sign-in routine.
- **Response Sanitization**: User model's `toJSON` transformation method explicitly deletes `password`, `_id`, and `__v` from all serialized outputs.
- **Complexity Policy**:
  - Minimum 8 characters, maximum 128 characters.
  - Requires at least 1 uppercase letter, 1 lowercase letter, and 1 numeric digit.

---

## 4. Protection of `ACCESS_CODE`

- The `ACCESS_CODE` is a confidential backend key required to provision an Admin Space during the initial rollout.
- **Verification**: Verified exclusively in the backend service layer (`AuthService.signup`).
- **Timing Attack Mitigation**: Evaluated using Node.js `crypto.timingSafeEqual` over fixed-length UTF-8 buffers. If length differs, a constant-time dummy equality operation is performed to eliminate timing leakage based on string length.
- **Leakage Prevention**:
  - The submitted code is never logged to `stdout`, `stderr`, or system log streams.
  - The access code is never echoed in success responses or error payloads.

---

## 5. Cookie Security & CSRF Defense

### Cookie Configuration
The authentication cookie (`mc_auth_token`) uses the following security flags:
```javascript
{
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
}
```
- **`HttpOnly: true`**: Completely blocks JavaScript access via `document.cookie`, defeating token exfiltration via Cross-Site Scripting (XSS).
- **`Secure: true`** (in production): Enforces transmission exclusively over TLS/HTTPS.
- **`SameSite`**:
  - In development: `Lax` allows standard local browser navigation while protecting against basic cross-site requests.
  - In production (with cross-origin clients): `None` (paired with `Secure: true`) permits secure cross-origin cookie credentials.

### Defense-in-Depth CSRF Mitigation
HttpOnly alone does not eliminate Cross-Site Request Forgery (CSRF). My Chapters applies multiple layers:
1. **Origin Validation Middleware (`validateOrigin`)**:
   - State-changing authentication requests (`POST /signup`, `POST /signin`, `POST /logout`) inspect incoming `Origin` headers.
   - If an `Origin` is present and does not strictly match `CLIENT_URL`, the request is immediately rejected with `403 Forbidden`.
2. **Strict CORS Whitelist**:
   - The Express CORS middleware allows exclusively `CLIENT_URL` with `credentials: true`. Wildcards (`*`) are prohibited.

---

## 6. Denial of Service (DoS) & Abuse Prevention

1. **Rate Limiting**:
   - `express-rate-limit` enforces a maximum threshold of **10 requests per 15 minutes per IP** on `/api/auth/signup` and `/api/auth/signin`.
2. **Payload Size Restrictions**:
   - Body parsers restrict incoming JSON and URL-encoded payloads to `10kb` (`express.json({ limit: '10kb' })`), preventing memory exhaustion from oversized request bodies.
3. **Helmet Security Headers**:
   - `helmet` applies essential security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Strict-Transport-Security`, and removes the `X-Powered-By: Express` signature.
4. **Account Enumeration Prevention**:
   - Signin failures for both nonexistent identifiers and invalid passwords return identical generic responses:
     `{ success: false, message: "Invalid credentials", errors: [] }` with HTTP status `401 Unauthorized`.

---

## 7. Production Deployment Checklist

Before releasing to production:
1. [ ] Set `NODE_ENV=production`.
2. [ ] Generate a 64+ character random string for `JWT_SECRET` (`openssl rand -base64 48`).
3. [ ] Set `MONGODB_URI` to a secure MongoDB Atlas replica set with TLS enabled.
4. [ ] Set `CLIENT_URL` to the exact HTTPS production origin (e.g., `https://app.mychapters.com`).
5. [ ] Configure `COOKIE_DOMAIN` (e.g., `.mychapters.com`) if backend and frontend reside on different subdomains.
6. [ ] Ensure TLS/HTTPS termination is active at the reverse proxy or load balancer.
7. [ ] Confirm `.env` is absent from all git commits and build artifacts.

