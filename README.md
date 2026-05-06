# Calendar

Static React reservation calendar.

Public app URL after GitHub Pages deploy:

```text
https://martin9020.github.io/calendar/
```

By default, reservations are stored in the browser with `localStorage`. This makes the app work without a server, but data is local to each browser/device.

For shared reservations across devices, connect Supabase:

1. Create a Supabase project.
2. Run `supabase/schema.sql` in Supabase SQL Editor.
3. In GitHub repo settings, add Actions secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Re-run the GitHub Pages deploy workflow.

When Supabase is configured, the app requires login and uses the shared `reservations` table.
