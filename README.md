# DairyFarmDesk 🐄

Dairy farm management for small and medium Indian farms. One codebase, two experiences:

- **Manager app** (`/m`) – mobile-first PWA for daily entry: milk, deliveries, payments, expenses, health.
- **Admin console** (`/admin`) – desktop dashboard: KPIs, charts, reports, exports, users, audit log.

Stack: React + Vite + TypeScript, Tailwind CSS, Supabase (Auth, Postgres, RLS, Storage, Edge Functions), PWA with an offline write queue, English/Hindi. Currency ₹, litres, dates DD-MM-YYYY, timezone Asia/Kolkata.

---

## 1. Supabase setup

1. Create a project at https://supabase.com.
2. **SQL Editor**: run these files in this order (paste each one and click Run):
   1. `supabase/migrations/0001_schema.sql`
   2. `supabase/migrations/0002_helpers.sql`
   3. `supabase/migrations/0003_rls.sql`
   4. `supabase/migrations/0004_views.sql`
3. **Create the first admin**
   1. Dashboard → Authentication → Users → *Add user* → enter email and password, tick *Auto Confirm User*.
   2. Copy that user's UUID, then run in the SQL editor:
      ```sql
      insert into profiles (id, email, full_name, role)
      values ('PASTE-USER-UUID', 'owner@example.com', 'Owner', 'admin');
      ```
4. **Deploy the user-management Edge Function** (needed for "Add manager"). Install the Supabase CLI, then:
   ```bash
   supabase login
   supabase link --project-ref YOUR-PROJECT-REF
   supabase functions deploy create-manager
   ```
   Supabase injects the service-role key into the function automatically. You never put it in the frontend or in Vercel.
5. **Sample data (optional)**: after step 3, run `supabase/seed.sql` then `supabase/seed_2.sql` once on an empty database. It adds 10 animals, 8 customers and 30 days of milk, sales, payments, expenses and health records, including one animal under milk withdrawal and several follow-ups due.
6. Storage buckets (`animal-photos`, `bills`, `logo`) are created by `0003_rls.sql`.

## 2. Run locally

```bash
cp .env.example .env.local     # then fill in the two values
npm install
npm run dev
```

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API Keys → **publishable** key (`sb_publishable_…`) |

> ⚠️ **Never** put the `sb_secret_…` / `service_role` key in `.env`, in a `VITE_` variable or in GitHub. It bypasses all security rules. `.env*` files are git-ignored.

## 3. Deploy: GitHub → Vercel

```bash
git init
git add .
git commit -m "DairyFarmDesk"
git branch -M main
git remote add origin https://github.com/YOUR-USER/dairyfarmdesk.git
git push -u origin main
```

1. Vercel → *Add New Project* → import the GitHub repo. Framework preset: **Vite** (build `npm run build`, output `dist`).
2. Add **Environment Variables**: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Then deploy.
3. Supabase → Authentication → URL Configuration → set **Site URL** to your Vercel domain.
4. `vercel.json` already contains the SPA rewrite and service-worker cache header.

## 4. Install on Android

Open the Vercel URL in Chrome → menu → **Add to Home screen / Install app**. The manager signs in once and gets a full-screen app.

## 5. Roles

| | Admin | Manager |
|---|---|---|
| Animals | add, edit, archive | view only |
| Milk, sales, payments, expenses, health | full access, edit and delete any date | add and edit for the last 2 days (configurable in Settings), no delete |
| Customers | full | add and edit |
| Profit, reports, dashboard, users, audit log | ✔ | ✘ (blocked by Row Level Security and server functions) |

The 2-day edit window and no-delete rule are enforced in the **database** (RLS policies using `manager_can_edit()`), not just in the UI.

## 6. Offline behaviour

- Saves made without internet go into an IndexedDB queue with client-generated IDs, then sync automatically when the connection returns (and every 30 s). The header shows `Offline` and a pending count; tap it to sync now.
- Milk and delivery "Save All" use upserts on (animal/customer, date, shift), so a retried sync can never create duplicates.
- Anything that the server rejects (for example, an entry older than the allowed window) stays in the queue marked with `!`.
- Photo uploads and deletes need an internet connection.
- The app shell is cached by the service worker. Data screens show the last data fetched in the current session.

## 7. Language

Use the EN / हिं toggle in the header (or Settings). Strings live in `src/locales/en.json` and `hi.json`.

## 8. Known limitations

- Customer PDF bills use the built-in Latin PDF font, so amounts show as `Rs.`. The WhatsApp text bill uses ₹.
- Cached read data is not persisted across app restarts yet; opening the app fully offline shows the shell and the offline queue only.
- Hindi translations cover the interface; seed data and dropdown values (breeds, categories) stay in English.
- RLS and the Edge Function need your own Supabase project to test; they could not be run in the build environment.
