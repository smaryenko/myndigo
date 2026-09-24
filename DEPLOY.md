# Myndigo — Deployment Guide

## Before you start

You need:
- The Supabase project already created at [supabase.com](https://supabase.com)
- Your Supabase project URL and anon key (already in `.env`)
- Node.js installed (you already have this)

---

## Step 1 — Run the database schema

1. Open your Supabase project dashboard
2. Go to **SQL Editor** in the left sidebar
3. Click **New query**
4. Open the file `supabase/schema.sql` from this project
5. Copy the entire contents and paste into the SQL Editor
6. Click **Run**

You should see "Success. No rows returned." — that means all tables, policies, and functions were created.

---

## Step 2 — Install the Supabase CLI

Open your terminal and run:

```bash
brew install supabase/tap/supabase
```

If you don't have Homebrew, install it first from [brew.sh](https://brew.sh), or use the npm alternative:

```bash
npm install -g supabase
```

Verify it worked:

```bash
supabase --version
```

---

## Step 3 — Log in to Supabase CLI

```bash
supabase login
```

This opens a browser window. Log in with the same account you used to create the project.

---

## Step 4 — Link your project

Run this from the `myndigo` project folder, replacing `<project-ref>` with your project reference ID:

```bash
supabase link --project-ref <project-ref>
```

**How to find your project reference ID:**
- Go to your Supabase dashboard
- Click your project
- Go to **Project Settings → General**
- Copy the **Reference ID** (looks like `atbzqtfrkxrortjsvtop`)

---

## Step 5 — Set Edge Function secrets

These are the API keys your Edge Functions need at runtime. Set them in the Supabase dashboard:

1. Go to your Supabase project dashboard
2. Go to **Edge Functions** in the left sidebar
3. Click **Manage secrets**
4. Add each of the following:

| Secret name | Value | Required? |
|---|---|---|
| `TRANSLATION_PROVIDER` | `deepl` | ✅ Yes |
| `DEEPL_API_KEY` | Your DeepL API key (from `.env`) | ✅ Yes (if using DeepL) |
| `GOOGLE_TRANSLATE_API_KEY` | Your Google API key | Only if `TRANSLATION_PROVIDER=google` |
| `LIBRE_TRANSLATE_URL` | Your LibreTranslate URL | Only if `TRANSLATION_PROVIDER=libre` |
| `RESEND_API_KEY` | Your Resend API key | Optional — for email notifications |
| `NOTIFICATION_EMAIL_FROM` | e.g. `notifications@yourdomain.com` | Optional — required if using Resend |

> **Note:** `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically available inside Edge Functions — you don't need to set those manually.

---

## Step 6 — Deploy the Edge Functions

From the `myndigo` project folder, run:

```bash
supabase functions deploy translate
```

Then:

```bash
supabase functions deploy log-share-view
```

Then:

```bash
supabase functions deploy delete-account
```

You should see `Deployed Function translate`, `Deployed Function log-share-view`, and `Deployed Function delete-account`.

> **Note:** `translate` and `log-share-view` must be deployed with `--no-verify-jwt` because they are called without a user session. `delete-account` does **not** use `--no-verify-jwt` — it validates the user's JWT internally.

To verify they deployed correctly, go to your Supabase dashboard → **Edge Functions** — all three functions should appear in the list with a green status.

---

## Step 7 — Enable Google OAuth (if not done yet)

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project (or use an existing one)
3. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
4. Application type: **Web application**
5. Authorized redirect URIs: `https://<your-project-ref>.supabase.co/auth/v1/callback`
6. Copy the **Client ID** and **Client Secret**
7. Go to your Supabase dashboard → **Authentication → Providers → Google**
8. Enable it and paste the Client ID and Client Secret
9. Save

---

## Step 8 — Run the app locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Step 9 — Deploy the frontend (optional)

The easiest option is [Vercel](https://vercel.com):

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Add environment variables (copy from your `.env` file — only the `VITE_` prefixed ones are needed for the frontend):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy

---

## Database migrations

When changes require adding columns to an existing database (rather than a fresh setup), run the following SQL in the Supabase SQL Editor:

### IP geolocation columns for view history (added after initial deploy)

```sql
alter table share_audit_log
  add column if not exists ip_city    text,
  add column if not exists ip_country text;
```

After running this, redeploy the `log-share-view` function:

```bash
supabase functions deploy log-share-view --no-verify-jwt
```

### Dynamic profile fields migration (added after initial deploy)

The per-section tables (`alerts`, `communication`, `triggers`, `sensory_sensitivities`,
`routines`, `medications`, `medical_conditions`, `doctors`, `medical_info_meta`,
`emergency_contacts`, `behavioral_notes`, `educational_info`) were replaced with a
generic `profile_entries` table driven by `section_definitions` / `field_definitions`.
This lets new profile types (e.g. a future "deaf child" or "adult with ASD" profile)
define their own fields as data, without new tables or components.

**On a database that already has real child data, run these steps in order:**

1. In Supabase SQL Editor, rename the old tables out of the way so the new
   `schema.sql` run doesn't collide with them:
   ```sql
   alter table alerts                rename to old_alerts;
   alter table communication         rename to old_communication;
   alter table triggers              rename to old_triggers;
   alter table sensory_sensitivities rename to old_sensory_sensitivities;
   alter table routines              rename to old_routines;
   alter table medications           rename to old_medications;
   alter table medical_conditions    rename to old_medical_conditions;
   alter table doctors               rename to old_doctors;
   alter table medical_info_meta     rename to old_medical_info_meta;
   alter table emergency_contacts    rename to old_emergency_contacts;
   alter table behavioral_notes      rename to old_behavioral_notes;
   alter table educational_info      rename to old_educational_info;
   ```
2. Run the full contents of `supabase/schema.sql` (this creates `section_definitions`,
   `field_definitions`, `profile_entries`, adds `children.profile_type`, and seeds the
   `asd_child` section/field definitions). Ignore "already exists" errors for tables
   that weren't renamed (`children`, `personal_info`, `content_translations`,
   `share_audit_log`, `user_preferences`) — those are unchanged and safe to re-run
   `create table` against only if they don't already exist; if they already exist,
   run just the parts of `schema.sql` after those `create table` statements instead.
3. Run the full contents of `supabase/migrate_to_dynamic_fields.sql` — this copies
   every row from the renamed `old_*` tables into `profile_entries`.
4. Open the app and verify the child's profile looks correct (all sections, all
   values, visibility toggles preserved) and that the shared page still renders
   identically to before.
5. Once verified, drop the old tables permanently (irreversible):
   ```sql
   drop table if exists old_alerts;
   drop table if exists old_communication;
   drop table if exists old_triggers;
   drop table if exists old_sensory_sensitivities;
   drop table if exists old_routines;
   drop table if exists old_medications;
   drop table if exists old_medical_conditions;
   drop table if exists old_doctors;
   drop table if exists old_medical_info_meta;
   drop table if exists old_emergency_contacts;
   drop table if exists old_behavioral_notes;
   drop table if exists old_educational_info;
   ```

No Edge Function changes are required for this migration — `translate` and
`log-share-view` don't reference the renamed tables directly.

**On a brand new database (no existing children), skip all of the above** —
just run `supabase/schema.sql` once, in full, as normal.

---

## Troubleshooting

**"Policy already exists" error when running schema.sql**
Your database already has some tables from a previous run. Either drop them first or run only the missing parts.

**Edge Function returns 500**
Check the function logs: Supabase dashboard → **Edge Functions → [function name] → Logs**. The most common cause is a missing secret.

**Google OAuth redirect error**
Make sure the redirect URI in Google Cloud Console exactly matches `https://<your-project-ref>.supabase.co/auth/v1/callback` — no trailing slash.

**QR code shows but scanning says "not shared"**
Sharing is disabled by default. Go to the child's profile → Share → toggle sharing on.
