---
name: Drizzle db:push prompt blocker
description: db:push hangs interactively on a pre-existing unique-constraint prompt
---
`npm run db:push` (even with `--force`) stops at an interactive selector asking whether to truncate `users` before adding `users_username_unique`. Piped input does not answer it.

**Why:** drizzle-kit detects a unique constraint drift on the existing users table and prompts on every push.

**How to apply:** For simple additive schema changes, run the matching `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...` via SQL directly after editing `shared/schema.ts`; keep schema.ts as the source of truth.
