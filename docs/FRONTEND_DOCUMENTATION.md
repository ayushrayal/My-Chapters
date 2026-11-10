# My Chapters — Frontend Documentation (Phase 2)

## 1. Overview & Technology Stack

Phase 2 implements the frontend application for **My Chapters** (Tagline: *Your life. Your choices. Your space.*). The client integrates with the Phase 1 backend using standard **HttpOnly, SameSite cookies** for secure authentication without storing tokens in browser storage (`localStorage`, `sessionStorage`, or `IndexedDB`).

- **Framework**: React 18 (Functional components & React Hooks)
- **Bundler & Dev Server**: Vite 6
- **Routing**: React Router DOM v6
- **Styling**: SCSS (Mobile-first, centralized neutral design variables)
- **HTTP Client**: Axios with `withCredentials: true`
- **Testing**: Vitest + React Testing Library + JSDOM

---

## 2. Directory Structure

```
client/
├── .env.example
├── .env
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── assets/
    ├── components/
    │   └── common/
    │       ├── Button.jsx          # Reusable button (primary, secondary, ghost, loading)
    │       ├── Input.jsx           # Form input with visibility toggles, accessibility & errors
    │       ├── Loader.jsx          # Fullscreen & inline spinner
    │       └── ProtectedRoute.jsx  # Route guard for /dashboard
    ├── features/
    │   ├── auth/
    │   │   ├── __tests__/
    │   │   │   ├── AuthContext.test.jsx
    │   │   │   ├── SigninForm.test.jsx
    │   │   │   └── SignupForm.test.jsx
    │   │   ├── components/
    │   │   │   ├── SigninForm.jsx  # Signin form with client validation & error handling
    │   │   │   └── SignupForm.jsx  # Multi-field signup with access code & space naming
    │   │   ├── context/
    │   │   │   └── AuthContext.jsx # Centralized auth state & session initializer
    │   │   ├── hooks/
    │   │   │   └── useAuth.js      # Custom consumer hook
    │   │   ├── pages/
    │   │   │   ├── Signin.jsx      # /signin page
    │   │   │   └── Signup.jsx      # /signup page
    │   │   └── services/
    │   │       └── auth.api.js     # Axios API service endpoints
    │   └── dashboard/
    │       ├── __tests__/
    │       │   └── Dashboard.test.jsx
    │       └── pages/
    │           └── Dashboard.jsx   # /dashboard page showing real user & Space data
    ├── layouts/
    │   ├── AuthLayout.jsx          # Minimal, centered auth card wrapper
    │   └── DashboardLayout.jsx     # Sticky header, brand badge, and sign-out action
    ├── lib/
    │   └── axios.js                # Centralized Axios client with withCredentials: true
    ├── routes/
    │   ├── __tests__/
    │   │   └── AppRoutes.test.jsx
    │   └── AppRoutes.jsx           # App routing with redirection logic
    ├── styles/
    │   ├── abstracts/
    │   │   ├── _mixins.scss        # Responsive media query helpers & focus rings
    │   │   └── _variables.scss     # Centralized, replaceable brand colors & spacing
    │   ├── base/
    │   │   ├── _reset.scss         # Modern box-sizing & element reset
    │   │   └── _typography.scss    # System fonts & scale
    │   ├── components/
    │   │   ├── _alert.scss         # Banner alert states (error, success, warning)
    │   │   ├── _button.scss        # Button variants & spin animations
    │   │   ├── _input.scss         # Input fields, labels, hints, and toggle buttons
    │   │   └── _loader.scss        # Spinner styles
    │   ├── pages/
    │   │   ├── _auth.scss          # Auth layout & card styling
    │   │   └── _dashboard.scss     # Dashboard grid & welcome banners
    │   └── main.scss               # Main stylesheet aggregator
    ├── test/
    │   └── setup.js                # JSDOM DOM cleanup fixture
    ├── utils/
    │   └── error-handler.js        # Maps backend errors and status codes to readable text
    ├── App.jsx
    └── main.jsx
```

---

## 3. Design System & Centralized Color Palette

All colors and spacing variables are centralized in `src/styles/abstracts/_variables.scss`. Replacing the color palette requires editing only this single file:

```scss
$color-primary: #18181b;          // Deep neutral obsidian
$color-primary-hover: #27272a;
$color-primary-text: #ffffff;

$color-secondary: #f4f4f5;        // Clean neutral grey
$color-secondary-hover: #e4e4e7;
$color-secondary-text: #18181b;

$color-background: #fafafa;       // Soft off-white
$color-surface: #ffffff;          // Pure white card surfaces

$color-text: #09090b;             // High-contrast readable typography
$color-muted-text: #71717a;       // Secondary labels & metadata
$color-border: #e4e4e7;           // Subtle borders

$color-success: #16a34a;          // Success badges and alerts
$color-error: #dc2626;            // Form validation and error alerts
$color-warning: #d97706;          // Notices
```

---

## 4. Routing & Protection Model

| Route | Access | Component | Behavior |
|---|---|---|---|
| `/` | Public | Redirect | Redirects to `/dashboard` (which redirects unauthenticated users to `/signin`) |
| `/signup` | Public / Guest | `Signup` | Redirects to `/dashboard` if user is already authenticated |
| `/signin` | Public / Guest | `Signin` | Redirects to `/dashboard` if user is already authenticated |
| `/dashboard` | Protected | `Dashboard` | Restricted via `ProtectedRoute`; redirects unauthenticated to `/signin` |
| `*` | Any | `NotFound` | Simple 404 page with navigation button |

---

## 5. Authentication State Management (`AuthContext`)

1. **Initial Load**:
   - Component mounts with `isLoading = true`.
   - Calls `GET /api/auth/me` with `withCredentials: true`.
   - If `200 OK`: Context stores `user`, `space`, and sets `isAuthenticated = true`.
   - If `401 Unauthorized`: Treats user as logged out (`isAuthenticated = false`, `user = null`).
   - If `500 Server Error` or Network Offline: Sets `initError` without corrupting state.
   - `isLoading` transitions to `false`.

2. **Sign In**:
   - Calls `POST /api/auth/signin`.
   - Server returns sanitized `user` and `space`, and sends the `mc_auth_token` `HttpOnly` cookie.
   - Context updates React state and redirects to `/dashboard`.

3. **Sign Up**:
   - Calls `POST /api/auth/signup` with `accessCode`.
   - On `201 Created`, displays success feedback and redirects to `/signin` (no fake auto-login).

4. **Sign Out**:
   - Calls `POST /api/auth/logout`.
   - Server revokes the session in MongoDB and clears the browser cookie.
   - React state resets to `null`.
   - If backend is offline, local state is still cleared with a notice explaining that session revocation could not be confirmed server-side.

---

## 6. Testing Results

### Automated Frontend Tests (`npm test` in `client/`):
```
Test Files  5 passed (5)
     Tests  20 passed (20)
  Duration  10.52s

✓ src/features/auth/__tests__/AuthContext.test.jsx (3 tests)
✓ src/features/dashboard/__tests__/Dashboard.test.jsx (1 test)
✓ src/routes/__tests__/AppRoutes.test.jsx (4 tests)
✓ src/features/auth/__tests__/SigninForm.test.jsx (5 tests)
✓ src/features/auth/__tests__/SignupForm.test.jsx (7 tests)
```

### Combined Test Suite:
- **Backend Tests (Phase 1)**: 34 / 34 Passed
- **Frontend Tests (Phase 2)**: 20 / 20 Passed
- **Total Automated Tests**: 54 / 54 Passed
