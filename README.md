# Reservations

Static React reservations app.

By default, reservations are stored in the browser with `localStorage`. This makes the app work without a server, but data is local to each browser/device.

For shared reservations across devices, connect Supabase:

1. Create a Supabase project.
2. Run `supabase/schema.sql` in Supabase SQL Editor.
3. In GitHub repo settings, add Actions secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Re-run the GitHub Pages deploy workflow.

When Supabase is configured, the app uses the shared `reservations` table. The included schema enables row-level security: anonymous visitors can read only public availability (`date` and `status`), while full reservation details and all edits require one of the configured Supabase Auth users.

The calendar UI uses Supabase Auth for sign-in. Passwords are verified by Supabase and are not stored in the JavaScript bundle.

## Supabase database deploys

Database changes are tracked in `supabase/migrations`. The `Deploy Supabase DB` GitHub Actions workflow runs `supabase db push` when migrations are pushed to `main`.

Required GitHub Actions secrets:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`

After those secrets are added, use migration files for database changes instead of editing the live database manually.

The app uses normal Supabase REST reads/writes. Supabase Realtime is intentionally disabled for `reservations` to avoid continuous WAL/RLS processing.
