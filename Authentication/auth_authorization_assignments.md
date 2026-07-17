# Authentication & Authorization — Assignment Track

**Stack assumed:** Node.js, Express, TypeScript, PostgreSQL, Prisma  
**Goal:** Build genuine depth across every layer of auth — from password hashing to fine-grained permissions.

---

## Prerequisites Before You Start

Make sure you can answer these before touching assignment 1:

- What is the difference between `401 Unauthorized` and `403 Forbidden`?
- What does `req.headers.authorization` look like when a client sends a Bearer token?
- What does middleware do in Express and how does `next()` work?
- What is the difference between hashing and encryption?
- What is an environment variable and why do secrets live there, not in code?

If any of these feel shaky, spend 30 minutes on them first. Everything below builds on them.

---

## EASY TIER

---

### E1 — Password Hashing & Basic Register/Login

**Objective:** Understand why plaintext passwords are catastrophic and how bcrypt protects users even if your database leaks.

**What you'll build:** Two endpoints — `POST /register` and `POST /login` — with a PostgreSQL users table.

**Tasks:**

1. Create a `users` table with Prisma: `id`, `email` (unique), `passwordHash`, `createdAt`.
2. `POST /register` — accept `{ email, password }`. Validate that email is well-formed and password is at least 8 characters. Hash the password with bcrypt (cost factor 12). Save user. Return `201` with `{ id, email }` — never return the hash.
3. `POST /login` — accept `{ email, password }`. Find user by email. Use `bcrypt.compare()` to verify. Return `200 { message: "ok" }` on success, `401` on failure.
4. Handle the "user not found" case in a way that takes the **same amount of time** as a failed password comparison. (Hint: dummy compare.)
5. Write a short comment in the code explaining *why* you chose cost factor 12 and what happens if you set it to 6 or 20.

**Topics covered:** bcrypt, salt rounds, timing attacks (dummy compare), input validation, never leaking sensitive fields.

**Review Criteria:**

| Criteria | Pass | Fail |
|----------|------|------|
| Passwords stored | As bcrypt hash | As plaintext or MD5/SHA |
| Login response for wrong password | Generic "invalid credentials" | "user not found" vs "wrong password" (info leak) |
| Dummy compare present | Yes | No (timing attack possible) |
| Hash returned in any response | Never | In any response body |
| Cost factor | 10–14 | Below 10 or hardcoded 1 |
| Error handling | Try/catch with proper status codes | Unhandled promise rejections |

**Stretch goals:**
- Add email uniqueness error handling (Prisma `P2002` code)
- Normalize email to lowercase before saving and querying

---

### E2 — Session-Based Authentication

**Objective:** Understand stateful auth — how the server remembers who you are across requests using a session store.

**What you'll build:** A login flow using `express-session` with a cookie, plus a protected route.

**Tasks:**

1. Install `express-session` and `connect-pg-simple`. Configure the session store to use your PostgreSQL database (not memory — memory leaks and doesn't survive restarts).
2. Configure the session cookie with these flags: `httpOnly: true`, `secure: true` (use `false` in dev, `true` in prod via env), `sameSite: 'lax'`, and an appropriate `maxAge` (e.g. 7 days).
3. Build `POST /login` — on success, set `req.session.userId`. Return `200`.
4. Build `GET /me` — a protected route. Read `req.session.userId`. If missing, return `401`. If present, look up user from DB and return `{ id, email }`.
5. Build `POST /logout` — call `req.session.destroy()`. Return `200`.
6. Write a comment explaining: what is the session ID and where does it actually live?

**Topics covered:** Stateful auth, session stores, cookie flags (HttpOnly, Secure, SameSite), session fixation basics, logout.

**Review Criteria:**

| Criteria | Pass | Fail |
|----------|------|------|
| Session store | PostgreSQL (connect-pg-simple) | In-memory (default) |
| HttpOnly flag | Set to true | Missing or false |
| SameSite flag | `lax` or `strict` | Missing or `none` without `Secure` |
| Session regeneration on login | `req.session.regenerate()` called | Not called (session fixation risk) |
| Logout | `session.destroy()` called | Just clearing a variable |
| Protected route behavior | Returns 401 with no session | Crashes or returns 200 |

**Stretch goals:**
- Add session regeneration after login (`req.session.regenerate()` before setting userId — this prevents session fixation)
- Add a route that lists all active sessions for a user and lets them invalidate specific ones

---

### E3 — JWT Access Token Authentication

**Objective:** Understand stateless auth — how a signed token carries identity without the server storing any session state.

**What you'll build:** Login that returns a JWT, and a middleware that validates it on every protected request.

**Tasks:**

1. Install `jsonwebtoken`. Create a `JWT_SECRET` in `.env` (minimum 32 random characters — use `openssl rand -hex 32` to generate one).
2. `POST /login` — on success, sign a JWT with payload `{ sub: user.id, email: user.email }`, expiry `15m`. Return it in the response body.
3. Write an `authenticate` middleware: extract the token from the `Authorization: Bearer <token>` header, verify it with `jwt.verify()`, attach the decoded payload to `req.user`, call `next()`. On failure, return `401`.
4. Build `GET /me` — protected with `authenticate` middleware. Return `req.user`.
5. Test what happens when: the token is expired, the token is tampered with (change one character), the token is missing, the header format is wrong (`Token <value>` instead of `Bearer <value>`). All should return `401`, not `500`.
6. Write a comment: what would happen if your JWT secret leaked and how would you recover?

**Topics covered:** JWT structure (header.payload.signature), signing vs verifying, Bearer token format, middleware pattern, secret management.

**Review Criteria:**

| Criteria | Pass | Fail |
|----------|------|------|
| Secret source | Environment variable | Hardcoded string |
| Token expiry | Set (≤15min for access tokens) | Not set (token lives forever) |
| Tampered token | Returns 401 | Returns 200 or crashes |
| Expired token | Returns 401 | Returns 200 |
| Password/sensitive data in payload | Never | Present in JWT payload |
| Middleware reuse | Single middleware used across all protected routes | Verification code copy-pasted per route |

**Stretch goals:**
- Add `iat` (issued-at) check to reject tokens issued before a certain timestamp (useful for "logout all devices")
- Return the error reason in dev mode but a generic message in prod

---

## MEDIUM TIER

---

### M1 — Refresh Token Rotation & Revocation

**Objective:** Understand why short-lived access tokens need a companion refresh token system, and how to rotate and revoke them securely.

**What you'll build:** A complete token pair system — short-lived access token (15min) + long-lived refresh token (7 days) with rotation on every use and revocation on logout.

**Tasks:**

1. Create a `refresh_tokens` table: `id`, `token` (hashed — never store raw), `userId`, `expiresAt`, `revokedAt` (nullable), `createdAt`.
2. On login: generate a secure random refresh token (`crypto.randomBytes(40).toString('hex')`), hash it with SHA-256 before storing, set `expiresAt` to 7 days from now. Return both the access token (in response body) and refresh token (as an HttpOnly cookie).
3. `POST /auth/refresh`: read the refresh token from the cookie, hash it, look it up in DB. Reject if: not found, `revokedAt` is set, `expiresAt` is in the past. On success: **revoke the old refresh token** (set `revokedAt`), issue a new refresh token + new access token (rotation).
4. `POST /auth/logout`: revoke the current refresh token. Clear the cookie.
5. Implement **refresh token reuse detection**: if a refresh token that is already revoked is used again, revoke *all* refresh tokens for that user (assume breach). Return `401`.
6. Write a comment: why is the refresh token stored hashed? What attack does that defend against?

**Topics covered:** Token rotation, revocation, reuse detection, secure random generation, hashing tokens at rest, HttpOnly cookie for refresh token, DB-backed token invalidation.

**Review Criteria:**

| Criteria | Pass | Fail |
|----------|------|------|
| Refresh token stored | As SHA-256 hash | As plaintext |
| Refresh token location | HttpOnly cookie | Response body or localStorage |
| Token rotation | New refresh token issued every `/refresh` call | Same token reused |
| Reuse detection | All user tokens revoked on reuse | Just returns 401 |
| Old token revoked after rotation | Yes | No (two valid tokens exist at once) |
| Expiry checked | Yes | Relying only on JWT expiry |

**Stretch goals:**
- Store device metadata (`userAgent`, IP) per refresh token — show this on an "active sessions" endpoint
- Add a "logout all devices" endpoint that revokes all tokens for a user

---

### M2 — Role-Based Access Control (RBAC)

**Objective:** Understand how to restrict access to resources and actions based on who the user is, not just whether they're logged in.

**What you'll build:** A small API with three roles (`USER`, `MODERATOR`, `ADMIN`) where different endpoints are restricted to different roles.

**Tasks:**

1. Add a `role` field to the users table with an enum: `USER`, `MODERATOR`, `ADMIN`. Default: `USER`.
2. Include the role in the JWT payload on login.
3. Write an `authorize(...roles: Role[])` middleware factory that: checks `req.user` exists (401 if not), checks `req.user.role` is in the allowed list (403 if not), calls `next()` otherwise.
4. Build these routes and protect them:
   - `GET /posts` — public (no auth)
   - `POST /posts` — USER, MODERATOR, ADMIN
   - `DELETE /posts/:id` — MODERATOR, ADMIN only
   - `GET /admin/users` — ADMIN only
   - `PATCH /admin/users/:id/role` — ADMIN only
5. Implement **ownership check**: a USER can delete their own post, even though the route is "MODERATOR and above." The middleware or route handler must check `post.authorId === req.user.sub`.
6. Write a comment: why is it wrong to check role on the frontend only?

**Topics covered:** Role enum, middleware factory pattern, 401 vs 403 distinction, ownership checks, never trusting the client.

**Review Criteria:**

| Criteria | Pass | Fail |
|----------|------|------|
| 401 vs 403 | 401 = not logged in, 403 = logged in but not allowed | Used interchangeably |
| Role in JWT | Yes, included in payload | Fetched from DB on every request |
| Ownership check | Handled server-side | Handled client-side only |
| authorize middleware | Reusable factory, not copy-pasted | Per-route if/else |
| Admin route accessible to MODERATOR | No — 403 | Yes (overly permissive) |
| USER deleting own post | Allowed | Blocked despite ownership |

**Stretch goals:**
- Add a `permissions` table and switch from flat roles to permission checks (`can('delete:post')`)
- Log every 403 to a table with userId, route, timestamp — useful for detecting probing attacks

---

### M3 — OAuth 2.0 Social Login (Google)

**Objective:** Understand the OAuth 2.0 authorization code flow — how a third party proves identity to your app without you ever seeing their password.

**What you'll build:** "Login with Google" using Passport.js (or raw OAuth if you prefer), creating/finding a user from the Google profile.

**Tasks:**

1. Register an OAuth app in Google Cloud Console. Store `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`.
2. Add `googleId` (nullable) and `avatarUrl` (nullable) columns to the users table.
3. Build `GET /auth/google` — redirect the user to Google's authorization URL with scopes `openid email profile` and a random `state` parameter (store in session).
4. Build `GET /auth/google/callback` — Google redirects here with a `code`. Verify the `state` matches. Exchange the code for tokens at Google's token endpoint. Fetch the user profile. Find-or-create the user in your DB by `googleId`.
5. On successful OAuth login, issue your own JWT pair (same as M1) and redirect the client appropriately.
6. Handle the case where a user tries to login with Google using an email that already exists as a password-based account — link the accounts rather than creating a duplicate.
7. Write a comment: what is the `state` parameter and what attack does it prevent?

**Topics covered:** Authorization code flow, PKCE concept (explain even if not implementing), state parameter (CSRF on OAuth), code exchange, token vs profile, account linking.

**Review Criteria:**

| Criteria | Pass | Fail |
|----------|------|------|
| Client secret location | Environment variable | Hardcoded or in frontend code |
| state parameter | Generated, stored in session, verified on callback | Missing |
| Duplicate email handling | Accounts linked | Duplicate user created or error thrown |
| Google tokens stored | Not stored (discarded after profile fetch) | Stored unnecessarily |
| Your own tokens issued after OAuth | Yes — your JWT pair | Google's tokens used as auth in your app |
| Callback URL validated | Matches exactly what's registered in Google console | Open redirect possible |

**Stretch goals:**
- Add GitHub OAuth alongside Google — abstract the "find-or-create" logic so it works for any provider
- Add a `linked_accounts` table to support multiple OAuth providers per user

---

### M4 — Auth Security Hardening

**Objective:** Understand the security concerns that exist *around* auth endpoints — rate limiting, account lockout, CSRF, and secure headers.

**What you'll build:** Harden an existing Express auth API with the security controls real production systems use.

**Tasks:**

1. **Rate limiting on auth routes**: install `express-rate-limit`. Apply a strict limiter to `/login` and `/register` — 10 requests per 15 minutes per IP. Return `429` with a `Retry-After` header when exceeded.
2. **Account lockout**: after 5 consecutive failed login attempts, set `lockedUntil` (DateTime) on the user to `now + 15 minutes`. Return `423 Locked` with a message on subsequent attempts. Reset the counter on successful login.
3. **CSRF protection**: if your app uses cookies for auth (session or refresh token cookie), install `csurf` or implement the double-submit cookie pattern manually. Explain in a comment why JWT-in-header is immune to CSRF but cookie-based auth is not.
4. **Security headers**: install `helmet`. Understand what each of these headers does: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`. Write a one-line comment above each explaining what attack it mitigates.
5. **Sensitive error suppression**: audit every auth error response. Production should never reveal: whether an email exists, which field failed, or internal error details. All auth failures return a single generic message.
6. **Login audit log**: log every login attempt (success and failure) to a `login_events` table: `userId` (nullable), `email`, `success`, `ipAddress`, `userAgent`, `createdAt`.

**Topics covered:** Rate limiting, lockout, CSRF mechanics, security headers, error message hygiene, audit logging.

**Review Criteria:**

| Criteria | Pass | Fail |
|----------|------|------|
| Rate limiter | On `/login` and `/register` | Only on one, or missing |
| Lockout threshold | ≤10 failed attempts | Not implemented |
| Error messages | Generic for all auth failures | Reveal whether email exists |
| Helmet configured | Yes, with understanding of each header | Not installed, or default only |
| CSRF explanation | Accurate in comment | Missing or incorrect |
| Audit log | Written on every attempt | Only on success |

**Stretch goals:**
- Implement IP-based lockout separately from account lockout (block an IP after 20 failed attempts regardless of which accounts)
- Add a `POST /admin/unlock/:userId` endpoint to manually clear a lockout

---

## HARD TIER

---

### H1 — TOTP Two-Factor Authentication (2FA)

**Objective:** Build a complete time-based one-time password (TOTP) system compatible with Google Authenticator, Authy, and 1Password.

**What you'll build:** 2FA enrollment flow (QR code generation), a 6-digit code verify step after login, backup codes, and a disable-2FA flow.

**Tasks:**

1. Add to users table: `totpSecret` (nullable, encrypted at rest), `totpEnabled` (boolean, default false), `backupCodes` (array of hashed codes, nullable).
2. `POST /auth/2fa/setup`: generate a TOTP secret with `otplib`. Return the secret and an `otpauth://` URI that encodes into a QR code (use `qrcode` package to return a base64 PNG). Do NOT enable 2FA yet — the user must verify first.
3. `POST /auth/2fa/verify-setup`: accept a 6-digit code, verify it against the pending secret. On success, save the secret to DB, set `totpEnabled = true`, generate 10 backup codes (random, hash them before storing, return plaintext once to the user — this is the only time they'll see them).
4. Modify login flow: if `totpEnabled` is true, after password verification succeed, return a short-lived (5min) `pendingToken` instead of a full access token. The user must then call `POST /auth/2fa/challenge` with their TOTP code + pendingToken to get a real access token.
5. `POST /auth/2fa/challenge`: verify the pendingToken, verify the TOTP code (check current and previous window — `otplib` does this). On success, issue normal JWT pair.
6. Backup code path: if the user sends a backup code instead of a TOTP code in step 5, validate it against the stored hashes, mark it as used (backup codes are single-use), issue tokens.
7. `DELETE /auth/2fa` — disable 2FA. Requires current password confirmation + a valid TOTP code.
8. Write a comment: what is the 30-second window and why does checking the previous window matter?

**Topics covered:** TOTP algorithm (RFC 6238), HMAC-SHA1, time windows, enrollment vs enforcement, backup codes (single-use, hashed), pending auth state, secret encryption at rest.

**Review Criteria:**

| Criteria | Pass | Fail |
|----------|------|------|
| TOTP secret storage | Encrypted at rest (use `crypto` AES-256) | Plaintext in DB |
| Backup codes stored | As bcrypt/SHA-256 hashes | Plaintext |
| Backup code reuse | Marked used on first use, rejected after | Can be reused |
| Previous window checked | Yes (covers clock skew) | Only current window |
| 2FA not enabled until verified | Verify step required | Enabled immediately on setup |
| pendingToken expiry | Short (≤5 min) | Long or no expiry |
| Disable 2FA | Requires password + TOTP | No re-verification |

**Stretch goals:**
- Add a "trusted devices" system: after 2FA, offer to trust a device for 30 days (store a signed device token in a cookie)
- Send an email notification when 2FA is enabled, disabled, or a backup code is used

---

### H2 — Fine-Grained Permission System

**Objective:** Go beyond flat roles to build a permission system where access is controlled at the resource + action level, and permissions can be assigned per user, per role, or per resource.

**What you'll build:** An ABAC (Attribute-Based Access Control) system where you can express rules like: "this user can edit this specific document," "moderators can delete any post but only in the categories they manage," and "admins can do everything."

**Tasks:**

1. Design and implement this schema:
   - `permissions`: `id`, `action` (e.g. `post:create`, `post:delete`, `user:ban`), `description`
   - `role_permissions`: `roleId`, `permissionId` (roles get bulk permissions)
   - `user_permissions`: `userId`, `permissionId`, `resourceType` (nullable), `resourceId` (nullable), `granted` (boolean — can also explicitly deny)
   - A permission can be global (`resourceType` null) or scoped to a specific resource

2. Write a `can(user, action, resource?)` function: checks in this order:
   - If there's an explicit user-level deny for this action+resource → deny
   - If there's an explicit user-level grant for this action+resource → allow
   - If the user's role has this permission globally → allow
   - Otherwise → deny

3. Write a `requirePermission(action, getResource?)` middleware factory where `getResource` is an optional async function that extracts the resource from `req` (e.g. fetches the post from DB using `req.params.id`).

4. Apply it to a posts API:
   - `post:create` — any logged-in USER with this permission
   - `post:edit` — globally for MODERATOR; scoped to own post for USER
   - `post:delete` — ADMIN globally; MODERATOR in specific category; USER for own post
   - `user:ban` — ADMIN and MODERATOR with this permission explicitly granted

5. Build admin endpoints to manage permissions:
   - `POST /admin/roles/:roleId/permissions` — grant a permission to a role
   - `POST /admin/users/:userId/permissions` — grant or deny a permission to a specific user for a specific resource
   - `DELETE /admin/users/:userId/permissions/:permissionId` — remove explicit user permission (fall back to role)

6. Cache permission lookups in Redis with a short TTL (30 seconds). Invalidate on any permission change for that user.

7. Write an ADR (Architecture Decision Record) comment at the top of the permissions module: why ABAC instead of RBAC? What complexity does it add? When is it overkill?

**Topics covered:** ABAC, resource-scoped permissions, explicit deny, permission caching, cache invalidation, ADR writing.

**Review Criteria:**

| Criteria | Pass | Fail |
|----------|------|------|
| Explicit deny supported | Yes — deny overrides role-level grant | Only grants exist |
| Resource-scoped permissions | Implemented and working | Only global permissions |
| Permission check order | Deny → user grant → role → deny | Not deterministic |
| Redis caching | On permission lookups | No caching (DB hit every request) |
| Cache invalidation | On permission change | Cache never invalidated |
| ADR written | Present and thoughtful | Missing |
| Admin endpoints protected | With own permissions | Open or only role-based |

**Stretch goals:**
- Add a permission inheritance system: a MODERATOR permission set inherits from USER and can be extended
- Write a `/admin/permissions/audit` endpoint that returns every permission grant/deny and when it was created

---

### H3 — Production-Ready Auth System (Capstone)

**Objective:** Combine everything into a single cohesive, production-ready auth system with clean architecture, and write the documentation a new developer would need to understand it.

**What you'll build:** A complete auth service that could realistically ship: JWT + refresh tokens + RBAC with optional fine-grained permissions + optional 2FA + OAuth + security hardening + audit logging + a documented API.

**Tasks:**

1. **Architecture first**: before writing any code, write an ADR covering:
   - Where tokens live (access in memory/response body, refresh in HttpOnly cookie — explain why)
   - Why you chose Prisma over raw SQL for this
   - What you would do differently if this needed to handle 1 million users

2. **Structure your code into layers** — no business logic in route handlers:
   ```
   src/
     auth/
       auth.router.ts     ← HTTP layer only, calls service
       auth.service.ts    ← all business logic
       auth.middleware.ts ← authenticate, authorize, requirePermission
       auth.types.ts      ← shared types/interfaces
     users/
       user.service.ts
   ```

3. Implement all of the following as integrated, cohesive features:
   - Register / login with bcrypt
   - JWT access token (15min) + refresh token with rotation & reuse detection
   - RBAC with `authorize()` middleware
   - Optional TOTP 2FA (from H1)
   - Google OAuth (from M3)
   - Rate limiting + account lockout (from M4)
   - Full audit log for every auth event

4. **Error handling**: create a custom error class `AuthError` with a `code` (machine-readable), `message` (human-readable, safe for clients), and `statusCode`. All auth errors flow through this. Never let raw Prisma errors or JWT errors reach the client.

5. **Environment validation**: at startup, validate that all required env vars are present (`JWT_SECRET`, `DATABASE_URL`, `GOOGLE_CLIENT_ID`, etc.). If any are missing, crash with a clear message — don't let the server start silently broken.

6. **Token cleanup**: write a scheduled job (cron, or a background function) that deletes expired, revoked refresh tokens from the DB every hour. Explain why this matters at scale.

7. **Documentation**: write a `AUTH.md` file covering:
   - How the token flow works (a sequence diagram in text/ASCII is fine)
   - How to add a new protected route
   - How to add a new role or permission
   - What to do if a refresh token is suspected to be compromised
   - Known limitations and what you'd improve given more time

8. **Self-review**: after completing, write a short `RETRO.md`:
   - One decision you'd make differently
   - One thing you're genuinely proud of
   - One area you don't fully understand yet

**Topics covered:** Clean architecture, layered separation, error abstraction, env validation, background jobs, documentation, self-reflection.

**Review Criteria:**

| Criteria | Pass | Fail |
|----------|------|------|
| Business logic location | `auth.service.ts` only | Scattered in route handlers |
| Raw errors reaching client | Never | Prisma/JWT error objects in response |
| ENV validation at startup | Yes — crash on missing vars | Silent failure |
| All auth events logged | Yes | Partial or missing |
| Token cleanup job | Implemented | Not implemented |
| AUTH.md written | Yes, covers all required sections | Missing or superficial |
| ADR written before coding | Yes | Written after (or not at all) |
| RETRO.md | Honest and thoughtful | Missing or generic |
| Works end-to-end | Login → 2FA → refresh → logout all work | Broken flows |

**Stretch goals:**
- Add Swagger/OpenAPI documentation for all auth endpoints
- Write integration tests with `supertest` covering the happy path and 3+ failure cases for each endpoint
- Implement "magic link" (passwordless) login: generate a signed one-time token, "email" it (console.log in dev), verify it on callback

---

## Review Checklist (Universal)

Apply this to every assignment regardless of tier:

- [ ] No secrets hardcoded anywhere (use grep to verify: `grep -r "secret\|password\|key" src/ --include="*.ts"`)
- [ ] All protected routes return 401 when unauthenticated, 403 when unauthorized (not the same)
- [ ] Errors never expose internal details (DB errors, file paths, stack traces) to clients
- [ ] `async` route handlers wrapped with error handling (or using `express-async-errors`)
- [ ] Input validation on every endpoint that accepts a body
- [ ] Sensitive fields (passwordHash, totpSecret, rawBackupCodes) never appear in any API response
- [ ] Auth logic is reusable (middleware) — not copy-pasted per route
- [ ] You can explain every decision out loud, not just make it work

---

## Suggested Order

```
E1 → E2 → E3 → M1 → M2 → M3 → M4 → H1 → H2 → H3
```

Don't skip ahead. M1 (refresh tokens) is where most developers have gaps that create real vulnerabilities. Spend extra time there.

---

## Concepts Map

```
Authentication (who are you?)
├── Password-based
│   ├── Hashing (bcrypt)           → E1
│   ├── Session auth               → E2
│   └── JWT auth                   → E3
│       └── Refresh tokens         → M1
├── Social / Federated
│   └── OAuth 2.0 (Google)        → M3
└── Multi-factor
    └── TOTP (2FA)                 → H1

Authorization (what can you do?)
├── Role-Based (RBAC)             → M2
├── Security hardening            → M4
├── Fine-grained (ABAC)           → H2
└── Production system             → H3
```
