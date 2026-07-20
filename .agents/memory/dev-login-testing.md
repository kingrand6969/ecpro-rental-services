---
name: Dev login for testing
description: How to authenticate against the app in dev for curl/e2e tests
---
The app seeds a default admin test account at startup — see `seedAdminUser` in server/auth.ts for the username and password used. Login via `POST /api/login` with `{ username, password }` and a cookie jar.

**Why:** All API routes require an authenticated session; the seeded admin also has elevated privileges needed for many admin-only endpoints.

**How to apply:** For curl or Playwright test logins, read the seed credentials from server/auth.ts rather than storing them anywhere. Do not overwrite user password hashes in the DB for testing — if you must, restore the seed hash afterwards.
