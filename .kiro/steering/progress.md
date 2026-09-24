---
inclusion: auto
name: progress
description: Current build state, decisions made, and what works
---

# Myndigo — Build Progress

## Current State (as of session end)

The app is **fully built and functional**. All core features are implemented and the build is clean.

---

## Tech Stack

- React 19 + TypeScript + Vite + Tailwind CSS
- Supabase (Postgres + Auth + Edge Functions + Storage)
- i18next + react-i18next (11 languages, lazy-loaded except English)
- vite-plugin-pwa (service worker for shared page offline support)
- qrcode.react (QR code generation)
- oxlint (linting)

---

## Database

- Single schema file: `supabase/schema.sql` — run entirely in Supabase SQL Editor
- No migration files — **every** DB change (table, column, policy, grant, function, trigger) MUST go into schema.sql in the same response that introduces it
- When a change requires running SQL on existing DB, output exact SQL as manual step at end of response
- All tables use RLS with `owns_child()` and `child_is_shared()` helper functions
- Enums replaced with plain `text` columns (no CHECK constraints) — validation in app only

### Dynamic profile schema (architecture change — replaced per-section tables)

Child profile data (alerts, communication, triggers, sensory, routines, medications,
conditions, doctors, contacts, behavioral notes, education) moved from ~12 dedicated
SQL tables + 9 dedicated React components into a generic **field-definitions + entries**
model. Reason: parents of children with ASD, deaf/HoH children, and adults with ASD
need different field sets, and hardcoding one table/component per field group made
that impossible without a schema + code change per new profile type.

- `children.profile_type` — plain `text` column (e.g. `'asd_child'`), default `'asd_child'`.
  **Deliberately not constrained by a lookup table or FK** — new profile types are just
  new rows in `section_definitions`/`field_definitions`, no migration needed. Only one
  profile type (`asd_child`) is seeded/used right now — no UI exists yet for choosing
  or switching profile types.
- `section_definitions` — one row per section per profile_type (`section_key`, `label_key`,
  `repeatable`, `render_hint`, `sort_order`, `default_visible`). Metadata only, readable
  by anyone (authenticated + anon), no RLS.
- `field_definitions` — one row per field within a section (`field_key`, `label_key`,
  `field_type`, `options` jsonb, `required`, `translatable`, `can_hide_independently`,
  `sort_order`). `can_hide_independently` generalizes the old one-off
  `personal_info.photo_visible` pattern to any field — not yet exposed in the editor UI
  (`setFieldHidden` exists in `db.ts` but has no UI entry point yet).
- `profile_entries` — the actual data. One row per entry per section per child.
  `values` is a jsonb blob keyed by `field_key`. `hidden_fields text[]` holds per-field
  visibility overrides (filtering happens at the read layer for the shared page, not
  via RLS — same pattern as theme/translation, which were already post-fetch transforms).
  Single-entry sections (communication, behavioral_notes, education) have exactly one
  row per child+section_key.
- RLS on `profile_entries` is 2 policies total (owner full access, anon read if shared),
  replacing what was ~20 policies across the old per-section tables.
- `owns_child()` is written so multi-guardian access (a possible future feature) can be
  added later by changing only that function's body (e.g. to check a `child_guardians`
  join table) — no policy anywhere else needs to change if/when that ships. Not built.
- Removed tables (data now lives in `profile_entries`): `alerts`, `communication`,
  `triggers`, `sensory_sensitivities`, `routines`, `medications`, `medical_conditions`,
  `doctors`, `medical_info_meta`, `emergency_contacts`, `behavioral_notes`, `educational_info`.
- `personal_info` stays a dedicated table on purpose — fixed identity base (name, DOB,
  pronouns, photo), same shape regardless of profile_type. Not part of the dynamic system.
- One-time data migration for an existing DB with real child data:
  `supabase/migrate_to_dynamic_fields.sql` (rename old tables to `old_*`, run new
  `schema.sql`, run the migration script, verify, then drop `old_*` tables). Full
  step-by-step in `DEPLOY.md` under "Database migrations".

### Tables (current)
`children`, `personal_info`, `section_definitions`, `field_definitions`, `profile_entries`, `content_translations`, `share_audit_log`, `user_preferences` — 8 tables total (down from 17).

### RLS Security Model
- `children` table: owner full access (`user_id = auth.uid()`), anon read if shared (`sharing_enabled = true and auth.uid() is null`), authenticated read if shared (`sharing_enabled = true and auth.uid() != user_id`)
- `personal_info` and `profile_entries` (all child data): owner full access via `owns_child()`, anon+authenticated read via `child_is_shared()` which checks `sharing_enabled = true` (no `auth.uid() is null` — gating is on the `children` table). `profile_entries` covers what used to be ~10 separate tables — 2 policies instead of ~20.
- `child_is_shared()` does NOT include `auth.uid() is null` — the `children` table is the gatekeeper
- `section_definitions` / `field_definitions`: no RLS, plain `grant select` to both `authenticated` and `anon` — pure schema metadata, identical for every user
- `share_audit_log`: owner read + delete, inserts via service role only

### Key columns
- `children.share_language text default 'en'` — default language for shared card
- `personal_info.photo_visible boolean default true` — separate photo visibility toggle
- `educational_info` — full table (school, class, teacher, support worker, notes)
- `user_preferences.notify_on_view boolean default true` — email notification toggle
- `share_audit_log.ip_city text`, `share_audit_log.ip_country text` — approximate location resolved server-side from viewer IP (added this session, see "Pending manual migration" below)

---

## Supabase Edge Functions

- `translate` — deployed with `--no-verify-jwt`
  - On-demand content translation with DB cache (`content_translations`)
  - Uses `TRANSLATION_PROVIDER` env var (default: `deepl`), swappable: deepl | google | libre
  - Cache key: `child_id + field_path + target_lang`

- `log-share-view` — deployed with `--no-verify-jwt`
  - Logs shared page views + optional email notification via Resend
  - Uses `RESEND_API_KEY` + `NOTIFICATION_EMAIL_FROM` (both optional)
  - Respects `user_preferences.notify_on_view`
  - **IP geolocation (added this session):** if the browser didn't already supply GPS coords, extracts client IP from `cf-connecting-ip`/`x-forwarded-for` headers and calls `ip-api.com` (free tier, no key, 3s timeout) to resolve approximate city/country. Skips private/loopback IPs. Stores result in `latitude`/`longitude`/`geo_source='ip'` plus new `ip_city`/`ip_country` columns. Browser GPS (`geo_source='browser'`) always takes priority when present. Email notification text also updated to prefer city/country over raw coordinates.

- `delete-account` — deployed WITHOUT `--no-verify-jwt`
  - Validates caller's JWT manually, uses service role to call `auth.admin.deleteUser()`
  - DB cascade handles all child data deletion
  - Called from AccountPage with user's `access_token`

### Edge Function secrets (set in Supabase Dashboard → Edge Functions → Manage secrets)
- `TRANSLATION_PROVIDER`, `DEEPL_API_KEY` (or `GOOGLE_TRANSLATE_API_KEY`)
- `RESEND_API_KEY`, `NOTIFICATION_EMAIL_FROM` (optional, for email notifications)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` — auto-injected, no manual setup

---

## App Routes

| Route | Page | Auth |
|---|---|---|
| `/` | LandingPage | Public |
| `/login` | LoginPage | Public |
| `/mfa-challenge` | MfaChallengePage | Public (session exists but aal1) |
| `/dashboard` | DashboardPage | Protected |
| `/children/new` | AddChildPage | Protected |
| `/children/:id` | ChildProfilePage | Protected |
| `/children/:id/share` | ShareManagementPage | Protected |
| `/account` | AccountPage | Protected |
| `/s/:token` | SharedProfilePage | Public (anon) |

---

## Key Architecture Decisions

### Authentication
- Supabase Auth: Google OAuth + email/password + TOTP MFA
- `AuthProvider` + `useAuth` hook in `src/lib/auth.tsx`
- `ProtectedRoute` wraps authenticated pages — also checks AAL level
- MFA enforcement: `ProtectedRoute` calls `mfa.getAuthenticatorAssuranceLevel()` + `mfa.listFactors()` in parallel; if TOTP enrolled and session is `aal1`, redirects to `/mfa-challenge` with `location.pathname` in state
- `MfaChallengePage` at `src/pages/MfaChallengePage.tsx` — challenges TOTP, upgrades to aal2, redirects to original destination
- MFA reset by admin: delete from `auth.mfa_factors` where `user_id = '<uuid>'` in SQL Editor
- `supabase.ts` uses `flowType: 'pkce'` and `storage: window.localStorage` explicitly

### Login Page
- Single page toggling between `signin` / `signup` modes
- Signup mode shows a blue banner header + different tagline + "Sign up with Google" button label
- Modes: `signin` (default) and `signup`

### Shared Profile (Public Page)
- Token-based access (`/s/:token`) — works for both anon and authenticated users
- `sharing_enabled` toggle per child — token persists when disabled
- `share_language` sets default language for viewers
- Viewer can switch language — triggers `translate` Edge Function
- Translation only fires when viewer explicitly switches language
- PWA service worker caches all Supabase REST responses (`StaleWhileRevalidate`)

### Share Management Page
- QR code display + copy link + open in new tab button (both `flex-1 min-w-0` so long translated button labels wrap/shrink instead of overflowing the card)
- Sharing toggle, default language selector, theme picker (professional/warm/playful)
- Regenerate token (with confirm) — via `DangerZone` component
- Audit log: 10 per page, load more, total count shown
  - Each entry shows timestamp, user agent (now `break-all select-all`, no truncation — full text always readable/copyable), and location line: prefers `ip_city`/`ip_country` ("City, Country (approx. via IP)"), falls back to raw lat/lon with a "(GPS)" label when `geo_source==='browser'`
- **Clear history** button (appears when entries exist) — uses `ConfirmAction` with `expandBelow` prop (see below), calls `clearAuditLog()` in db.ts
- **Print Badge** button (added this session) — opens `BadgePreviewModal`, see dedicated section below
- Header row for audit log uses `flex-wrap` + `whitespace-nowrap` on title/counter so long translated strings don't break the layout (Ukrainian "View history" counter was overlapping before this fix)

### ConfirmAction component (`src/components/ui/ConfirmAction.tsx`)
- Default behavior: trigger button is replaced inline by the warning + confirm/cancel row
- New `expandBelow` prop (added this session): trigger button stays visible, confirm panel renders in a bordered red box *below* it instead of replacing it inline. Use this whenever the trigger lives inside a `flex` row with other siblings (e.g. a header) — inline replacement was breaking those layouts when the panel's content was wider/taller than the trigger.

### Print Badge feature (added this session)
- `src/components/BadgePreviewModal.tsx` — modal opened from ShareManagementPage, next to "Download QR code"
- Renders a CR80-portrait badge (54mm × 86mm physical size) with a warm sunflower/floral SVG background (hand-authored, not a stock asset), child's name, a translated message, and the share QR code
- **Preview** is plain React/HTML+SVG at a fixed 238×380px (matches 54:86mm ratio at ~4.4px/mm)
- **Print** does NOT use `window.print()` on the live page (that caused A4-page + wrong-scale bugs). Instead:
  1. Grabs the live QR `<svg>` from the DOM via `qrRef`
  2. Builds a self-contained SVG string (`buildBadgeSVG()`) with the same background geometry as the preview
  3. Text (name label, child name, bottom message) is rendered via `<foreignObject>` + real HTML `<p>` tags, NOT SVG `<text>` — this was a deliberate fix after a character-count-based line-wrapping heuristic (`wrapText()`, now deleted) broke for non-English languages (e.g. Ukrainian text overflowed past its pill in print but looked fine in the HTML preview, because SVG `<text>` never wraps on its own). `<foreignObject>` uses the browser's real HTML layout engine so wrapping matches the preview exactly regardless of language/script.
  4. Writes a full HTML document (`@page { size: 54mm 86mm; margin: 0 }`, body/svg both sized in `mm`) into a hidden `<iframe>`, then calls `iframe.contentWindow.print()` — this guarantees exact physical dimensions with no browser auto-scaling, unlike printing the live page.
- All badge text (`printBadgeNameLabel`, `printBadgeMessageShort`, plus button/modal labels) is translated via `t()` — pulled from `share.*` i18n keys, present in all 11 locales
- No `@media print` CSS is used anymore for this feature (an earlier attempt using a `.badge-print-area` class + `@media print` in `index.css` was removed — it printed the whole app page scaled to fit A4, not just the badge)

### Translation System
- UI strings: i18next (11 languages, lazy-loaded)
- User content: Edge Function → DeepL → cached in `content_translations`
- Cache invalidated by DB trigger when parent edits a field

### i18n
- English loaded eagerly, all others lazy-loaded via `loadLanguage(code)`
- `LanguageSelector` uses `appearance-none` + SVG background arrow (no native browser arrow)
- All `<select>` elements in the app use `appearance-none` + SVG chevron bg image + `pr-8`
- Supported: en, uk, es, fr, de, pt, it, ar, zh, ja, pl

### Navigation (AppLayout)
- Mobile: home icon (dashboard) + person icon (account) + sign out text
- Desktop: "Dashboard" text + email text (links to account) + sign out text
- `src/components/AppLayout.tsx`

### Account Deletion
- Calls `delete-account` Edge Function with user's JWT
- Edge Function uses `auth.admin.deleteUser()` — fully removes from `auth.users`
- DB cascade deletes all child data
- No longer manually deletes children rows first

---

## Profile Editor Sections (post dynamic-fields migration)

`src/components/profile/`:

- `PersonalInfoSection` — unchanged, still a dedicated component (fixed identity base,
  not part of the dynamic system). Name, DOB, responds-to, photo + separate photo
  visibility toggle, auto-save.
- `DynamicSection` — replaces the old `AlertsSection`, `CommunicationSection`,
  `TriggersSection`, `SensorySection`, `RoutinesSection`, `MedicalSection` (medications/
  conditions/doctors), `EmergencyContactsSection`, `BehavioralNotesSection`,
  `EducationalInfoSection` (9 components → 1). `ChildProfilePage` renders one
  `<DynamicSection>` per `section_definitions` row for the child's `profile_type`, in
  `sort_order`. Internally dispatches on `section.repeatable` + `section.render_hint`:
  - `ListSection` — generic repeatable card list (triggers, sensory, routines,
    medications, conditions, doctors)
  - `ContactListSection` — `render_hint: 'contact_list'`, priority-ordered, numbered,
    tap-to-call (emergency contacts)
  - `AlertBarSection` — `render_hint: 'alert_bar'`, severity-coloured cards, alert type
    select + optional note, hide-warning preserved
  - `SingleEntrySection` — `repeatable: false` sections (communication, behavioral_notes,
    education), one flat auto-saving form; `text_list` fields (communication
    instructions) get a dedicated add/edit/remove list sub-component
- `FieldInput` — renders the correct widget for one field based on `field.field_type`
  (text/longtext/select/boolean/phone/severity_enum/priority_int/text_list). This is
  the one place that needs a new `case` when a genuinely new field_type is introduced;
  everything else (which fields exist, in what order, for which section) is pure data
  in `field_definitions`.

All sections: visibility toggle (👁/🙈) via `setSectionVisibility()` (bulk, all entries
in a section) or `setEntryVisibility()` (single entry, e.g. one contact). Per-field
hide (`setFieldHidden()` in `db.ts`, backed by `profile_entries.hidden_fields`) exists
in the data layer but has **no UI entry point yet** — `field_definitions.can_hide_independently`
is seeded but nothing in the editor currently lets a parent toggle it. Fast-follow if wanted.

---

## Shared Profile Page Design

- Background: `bg-slate-200`, cards: `bg-white border-slate-300`
- Alert banner: `bg-red-700`, alert badges: `bg-red-800 text-red-100`
- Footer: `fixed bottom-0` centered `max-w-lg`
- Language selector: top-right, outside cards

### Above-fold order
1. Language selector (top right)
2. Alerts banner (red, always first)
3. Identity card (photo + name + responds-to + comms badge)
4. Emergency contacts
5. Triggers + Talk to me (two-column)

### Below-fold (expandable)
Sensory, Routines, Medical, More contacts, Behavioral strategies, Educational details

---

## Alert Types
`food_allergy`, `epilepsy`, `diabetes`, `asthma`, `elopement_risk`, `non_swimmer`, `heart_condition`, `custom`

---

## Known Pending Items
- **Pending manual migration (not yet run against the live DB as of session end):**
  ```sql
  alter table share_audit_log
    add column if not exists ip_city    text,
    add column if not exists ip_country text;
  ```
  Documented in `DEPLOY.md` under "Database migrations". Must be run in Supabase SQL Editor, then redeploy `log-share-view --no-verify-jwt`.
- Deploy Edge Functions after code changes:
  - `supabase functions deploy translate --no-verify-jwt`
  - `supabase functions deploy log-share-view --no-verify-jwt` (must redeploy — changed this session for IP geolocation)
  - `supabase functions deploy delete-account`
- Locale files (es, fr, de, pt, it, ar, zh, ja, pl, uk) are AI-translated — may need human review
  - This session: fixed a real i18n coverage gap — 52 keys (uk had 33) were missing entirely from non-English locales and silently falling back to English in the UI (found via Danger Zone / "Invalidate QR code & NFC chip" showing English in Ukrainian UI). All locales are now key-complete relative to en.json (verified via diff script). New keys covered: `common.*`, `landing.mockProfile.*`, `child.sections/personalInfo/education.*`, `share.invalidateQr*`, `sharedPage.*` (incl. `alertTypes.*`), `account.mfaIncorrectCode`, plus the new `share.printBadge*` keys for the badge feature.
  - Worth periodically re-running a key-diff audit against en.json when adding new UI strings — it's easy for a locale to silently drift when only en.json gets updated in a response.
- NFC chip writing (out of scope v1)
- Multiple guardians per child (out of scope v1, but RLS was deliberately kept ready for it — see "Dynamic profile schema" above)
- Push notifications (email only via Resend, v1)
- **Dynamic profile schema fast-follows (deliberately deferred, not built):**
  - Per-field visibility has no UI yet (`setFieldHidden()` exists, unused by any component)
  - Only `asd_child` profile_type exists — no UI to create a child with a different profile_type, and no second profile_type (e.g. `deaf_child`) has been seeded
  - Migration script `supabase/migrate_to_dynamic_fields.sql` has not been run against the live DB yet — must be run manually per `DEPLOY.md` before the old per-section tables can be dropped

### Dynamic profile schema — live DB migration status (as of this session's end)

Ran `supabase/schema.sql` directly against the live DB step by step in the SQL Editor
(rather than the rename-old-tables-first approach originally documented) and hit/fixed
several real issues along the way. `schema.sql` itself now has all these fixes baked in
— running it fresh on a new project needs none of this, but re-running it against THIS
project again needs the sequence below understood:

- **Every `create table`/`create index` in `schema.sql` is now `if not exists`, and every
  `create trigger`/`create policy` is preceded by `drop ... if exists`.** This was added
  incrementally after hitting "relation already exists" errors on `children`,
  `personal_info`, indexes, triggers, policies, `section_definitions`, and finally
  `profile_entries` itself — each fixed one at a time as the live DB accumulated more
  successfully-created objects across repeated runs. The file is now safe to run
  end-to-end multiple times without manual editing.
- **RLS bug (found and fixed):** `section_definitions` and `field_definitions` had RLS
  auto-enabled by Supabase with zero policies defined, which silently blocks ALL access
  (including the owner) despite correct `grant select` statements — grants are necessary
  but not sufficient when RLS is on with no policies. Fixed with explicit
  `alter table ... disable row level security` on both tables (now in `schema.sql`,
  right before their grants). If sections don't appear in the editor after a fresh
  schema run on a new project, check `pg_class.relrowsecurity` on these two tables first.
- **Seed data bug (found and fixed):** the seed insert for `doctors.phone` had an extra
  stray value causing "INSERT has more expressions than target columns". Fixed.
- **label_key vs placeholder_key (found and fixed):** originally `field_definitions` only
  had `label_key`, and seed data populated it with placeholder-style text (e.g.
  "e.g. Ms Johnson"). `SingleEntrySection` renders `label_key` as both the `<label>`
  above the input AND (via `FieldInput`) the placeholder — causing visibly duplicated
  text for single-entry sections (communication, behavioral_notes, education). Fixed by
  adding a separate `placeholder_key` column to `field_definitions` (nullable, falls
  back to `label_key` if absent) and rewriting all seed data to use proper distinct
  label/placeholder i18n keys. `ListSection`/`ContactListSection`/`AlertBarSection` never
  render `label_key` as a visible label at all (only the placeholder shows), so this bug
  only visibly affected single-entry sections — but seed data was corrected for all
  sections regardless, for consistency.
- **Medical sections had duplicate titles (found and fixed):** `medications`,
  `conditions`, `doctors` were all seeded with the same `label_key`
  (`child.sections.medicalInfo`, "Medical Info"), rendering three identically-titled
  cards. Fixed by giving each its own existing i18n key (`child.medical.medications`,
  `child.medical.conditions`, `child.medical.doctors`).
- **What's confirmed working on the live DB:** child profile editor loads and renders
  all 11 `asd_child` sections correctly, values persist, distinct medical section titles,
  no duplicated label/placeholder text.
- **What's NOT yet done on the live DB:**
  - The stale `asd_child` seed rows (inserted before the label_key/placeholder_key fix
    and before the medical-titles fix) need to be cleared and re-seeded:
    ```sql
    delete from field_definitions where section_id in (
      select id from section_definitions where profile_type = 'asd_child'
    );
    delete from section_definitions where profile_type = 'asd_child';
    ```
    then re-run the full current `supabase/schema.sql`. This only touches metadata
    tables (`section_definitions`/`field_definitions`) — `profile_entries` and
    `personal_info` (the actual child data) are untouched by this delete or re-seed.
  - The old per-section tables (`alerts`, `triggers`, `emergency_contacts`, etc.) were
    never formally renamed-then-migrated via `supabase/migrate_to_dynamic_fields.sql`
    in this session — the live DB already had `profile_entries` populated from an
    earlier point not fully captured in chat history. Before trusting this fully,
    sanity-check `select count(*) from profile_entries;` and compare against what's
    visible in the app, and confirm whether the original old tables still exist
    alongside the new ones (if so, they're just dead weight now, safe to drop once
    confirmed unused — check via `select * from information_schema.tables where
    table_name in ('alerts','triggers','sensory_sensitivities','routines',
    'medications','medical_conditions','doctors','medical_info_meta',
    'emergency_contacts','behavioral_notes','educational_info');`).

---

## Architecture decision — RLS stays as the sole authorization layer (for now)

Discussed adding redundant app-layer ownership checks in `db.ts` (e.g. explicitly
verifying `child.user_id === currentUser.id` before returning/mutating) so that
authorization wouldn't live exclusively in Postgres RLS policies (`owns_child()`,
`child_is_shared()`) — this would matter if the app ever migrated off
Postgres/Supabase, since a non-RLS backend has no equivalent safety net.

**Decision: not doing this now.** There is no active plan to leave Supabase — it's a
"maybe someday" consideration, not a scheduled migration. Duplicating every ownership
check in both RLS and `db.ts` today would be real, ongoing maintenance cost (two
places to keep in sync as tables/policies change) for a migration that isn't
happening. RLS remains the single source of truth for authorization: owner-only
read/write on `children`/`personal_info`/`profile_entries`, anon-read-if-shared for
the public `/s/:token` page. `getChildren()` in `db.ts` also filters by `user_id`
explicitly today, but that's a query-scoping optimization, not a redundant security
check — RLS is what actually prevents cross-user access if that filter were ever
missing or wrong.

Revisit this only if/when an actual migration off Postgres or off RLS-based access
control gets scheduled — at that point, add the app-layer checks as part of that
migration work, not preemptively.

---

## File Structure Notes
- `src/lib/db.ts` — all Supabase queries; `getChildren()` filters by `user_id` explicitly; `clearAuditLog()` at bottom; generic `upsertProfileEntry`/`deleteProfileEntry`/`upsertSingleEntry`/`setSectionVisibility`/`setEntryVisibility`/`setFieldHidden` replace the old ~8 per-section CRUD pairs
- `src/lib/types.ts` — `SectionDefinition`, `FieldDefinition`, `ProfileEntryRow`, `ChildProfile` (now `{ child, personalInfo, entries, sections, fieldsBySection }`) + `ALERT_DISPLAY` constant (still used for alert emoji/severity lookup by `DynamicSection`/`SharedProfilePage`)
- `src/lib/languages.ts` — single source of truth for 11 supported languages
- `src/lib/supabase.ts` — `flowType: 'pkce'`, `storage: window.localStorage`
- `src/components/ProtectedRoute.tsx` — checks session + AAL, redirects to `/mfa-challenge` if needed
- `src/pages/MfaChallengePage.tsx` — TOTP challenge page for post-OAuth MFA step-up
- `supabase/schema.sql` — single SQL file, run in Supabase SQL Editor; ends with seed data (`insert into section_definitions/field_definitions ...`) for the `asd_child` profile_type
- `supabase/migrate_to_dynamic_fields.sql` — one-time data migration from the old per-section tables into `profile_entries`, for databases with existing child data (see DEPLOY.md)
- `supabase/functions/translate/` — pure Deno, no imports
- `supabase/functions/log-share-view/` — pure Deno, no imports; now also does IP geolocation (see above)
- `supabase/functions/delete-account/` — pure Deno, validates JWT + uses admin client
- `DEPLOY.md` — step-by-step deployment guide; has a "Database migrations" section for post-initial-deploy schema changes (`ip_city`/`ip_country`, and the dynamic-fields migration)
- `src/components/BadgePreviewModal.tsx` — the Print Badge modal
- `src/components/ui/ConfirmAction.tsx` — supports `expandBelow` prop
- `src/components/profile/DynamicSection.tsx` — generic section renderer (see "Profile Editor Sections" above)
- `src/components/profile/FieldInput.tsx` — per-`field_type` input widget renderer

---

## Session notes — shared page photo protection

- Shared profile page photo (thumbnail + lightbox) has basic anti-download hardening: `onContextMenu` prevented, `pointer-events-none` + `draggable={false}` on the `<img>`, `select-none` on containers. This deters casual right-click/drag-save but does NOT prevent DevTools inspection or screenshots — documented as a known limitation, not a security boundary.
- Lightbox (click-to-enlarge) behavior was intentionally kept — only download vectors were blocked, not the enlarge-on-click UX.

---

## Session update — full security/code review + fixes, then two rounds of translation bug fixing

This session started with a senior-level code review of the whole project, then
implemented every fix, then debugged two real production translation bugs live
against the actual deployed Supabase project (CLI-linked to the project's Supabase ref).
**No git repo exists in this workspace** (`git status` fails — not a git repo) and
there is no Vercel CLI available here — frontend deploys happen some other way
(per `DEPLOY.md`, via GitHub push → Vercel). Only Supabase (DB + Edge Functions) was
directly deployable from this workspace via the linked Supabase CLI.

### Security/architecture fixes from the code review (all implemented)

- **`translate` Edge Function was completely broken against the current schema** —
  it queried old, dropped tables (`triggers`, `alerts`, `communication`, etc. as
  standalone tables) instead of `profile_entries`. Rewritten to query
  `profile_entries` + `field_definitions` (filtered by `translatable = true`), and
  wired to the existing (previously unused) `supabase/functions/translate/providers/`
  adapter module (`createTranslationProvider()`) instead of a separate inline
  DeepL/Google/Libre reimplementation that had drifted from it.
- **Critical cross-child data leak, fixed:** `translate` and `log-share-view` are
  deployed `--no-verify-jwt` (required, since they're called from the anonymous
  public share page) and use the **service-role key**, which bypasses RLS entirely.
  Neither function checked `children.sharing_enabled` before touching data — meaning
  anyone with a `child_id` UUID (leaked, logged, guessed) could get medical/behavioral
  data translated, or spam a parent's audit log + trigger unwanted "someone viewed
  your child's profile" emails, even for children never actually shared. Both
  functions now fetch `children.sharing_enabled` first and bail (returning the same
  response shape as "not found", to avoid confirming which child IDs exist) if not
  shared.
- **`notifyParent()` bug in `log-share-view`, fixed:** it queried
  `user_preferences?user_id=eq.${childId}` — using the **child's ID as a user ID**,
  which can never match, so the "email me when someone views" opt-out preference was
  silently never respected. Now resolves the real `user_id` from the `children` row
  already fetched for the sharing-enabled check.
- **Rate limiting added:** `log-share-view`'s `notifyParent()` now has a 5-minute
  per-child cooldown (checks recent `share_audit_log` rows) before sending another
  view-notification email, to stop inbox-spam from repeat/malicious viewing.
- **CORS tightened on `delete-account`:** now reads `APP_ORIGIN` env var (falls back
  to `*` if unset) instead of hardcoded `*` — this Edge Function is only ever called
  from the app's own authenticated frontend, unlike translate/log-share-view which
  legitimately need to accept any origin. **`APP_ORIGIN` has not actually been set**
  in Edge Function secrets yet — currently still behaves as `*` until set.
- **Error responses sanitized:** `translate` and `delete-account` no longer echo raw
  `String(err)`/Postgres/Admin-API error text to unauthenticated callers.
- **`get_shared_profile(p_token uuid)` Postgres function added** (in `schema.sql`,
  `security definer`, checks `sharing_enabled` internally) — the shared page now
  calls this RPC via `getSharedProfile()` in `db.ts` instead of doing
  `select('*')` across `children`/`personal_info`/`profile_entries` directly. This:
  - returns only the specific columns the shared page needs (no risk of a future
    column addition leaking to anon viewers by default)
  - **strips `hidden_fields` out of each entry's `values` jsonb server-side** —
    previously a parent hiding one field within a visible entry still sent the full
    value to the browser and only hid it in the UI, visible via devtools/Network tab
    on this no-login public page. Now stripped before it ever leaves Postgres.
  - New types in `src/lib/types.ts`: `SharedProfile`/`SharedChildInfo`/
    `SharedPersonalInfo`/`SharedProfileEntry` — deliberately narrower than the
    owner-editing `ChildProfile` type, used only by `SharedProfilePage.tsx`.
- **PWA caching fixed (`vite.config.ts`):** removed blanket `StaleWhileRevalidate`
  7-day caching of all Supabase REST responses — this was persisting medical/
  behavioral data in browser Cache Storage on whatever device viewed the shared
  page (classroom computer, hospital kiosk), surviving even after a parent revoked
  sharing or corrected a field. The `/s/:token` page shell cache is now `NetworkFirst`
  with a 5-minute TTL instead of `CacheFirst` for 7 days. Actual Supabase data fetch
  is via the RPC above anyway, which is a POST and was never cached by workbox's
  default GET-only caching regardless.
- **`ShareManagementPage.tsx` direct-Supabase-call bugs fixed:** language/theme
  change and audit-log "load more" pagination previously called `supabase.from(...)`
  directly (bypassing `db.ts`), discarded `error`, and updated local state
  optimistically *before* confirming the write succeeded — a failed save was
  invisible to the parent. Added `setChildShareLanguage`/`setChildShareTheme`/
  `getAuditLogPage` to `db.ts`; page now rolls back optimistic state on failure and
  shows an `actionError` banner.
- **`auth.tsx` / `ProtectedRoute.tsx` stuck-spinner bugs fixed:** `getSession()` and
  the MFA/AAL check (`getAuthenticatorAssuranceLevel`/`listFactors`) had no
  `.catch()` — a rejected promise (network failure, corrupted localStorage token)
  left `loading`/`aalStatus` stuck forever with no recovery path. Both now fail
  closed (empty session / redirect to `/login`) instead of hanging indefinitely.
- **Theme metadata deduplicated:** new `src/lib/themes.ts` (`THEME_KEYS`,
  `BuiltInTheme`) is now the single source of truth for which themes exist;
  `ShareManagementPage`'s `SHARE_THEME_CONFIG` and `SharedProfilePage`'s `THEMES`
  are both typed against it so adding/removing a theme causes a compile error in
  both files until updated, rather than silently drifting.
- **`ProfileEntryRow`/`SharedProfileEntry`/`FieldInput`'s `FieldValue` type** now
  include `number` in the values union (was missing despite `priority_int` field
  type existing) — currently unexercised in practice since priority is derived from
  list `sort_order`, not an editable `values.priority`, but the type was wrong
  regardless.
- Cosmetic: fixed a malformed missing-linebreak in
  `ShareManagementPage.handleClearHistory`.

### Translation bugs found and fixed (two separate real production bugs, found by
### live-debugging the actual deployed Supabase project, not just reading code)

**Bug 1 — field values (triggers, sensory notes, etc.) not translating at all:**
Root cause was **NOT** a DeepL/provider issue (verified directly by curling the real
DeepL API with the exact failing strings — translated fine every time, disproving
an earlier `tag_handling: 'xml'`/`outline_detection` theory that was tried and
reverted). The actual cause: **`service_role` had no table-level GRANTs** on
`children`, `section_definitions`, `field_definitions`, `profile_entries`,
`personal_info`, or `user_preferences` in `schema.sql` — only
`grant insert on share_audit_log to service_role` existed. RLS bypass and
table-level grants are separate Postgres mechanisms; bypassing RLS does nothing if
the role has no grant on the table at all. Every `translate` call was silently
hitting `permission denied for table profile_entries`, returning zero entries, and
falling through to the empty-response branch — meaning the shared page had been
returning `{translations: {}}` for every single request, for entirely unrelated
reasons than believed at the time. Found by temporarily deploying a debug build of
`translate/index.ts` that echoed the raw Postgres error in the response body, and
calling the live deployed function directly with curl using the real anon key +
a real shared child_id pulled from the DB. **`schema.sql` now has an explicit
`service_role` grants block** (select on children/section_definitions/
field_definitions/profile_entries/personal_info/user_preferences, select+insert+
update on content_translations, select+insert on share_audit_log) with a comment
explaining why it's needed — this was applied directly to the live DB via
`supabase db query --linked` during this session, and is also baked into
`schema.sql` for any fresh project.

**Bug 2 — alert type badges ("Non-Swimmer", "Elopement Risk") never translate:**
Different mechanism entirely from Bug 1 — these render via i18next
(`t('...')`), not the translate Edge Function, because `alerts.label` is a cached
English display string set at creation time (`translatable: false` by design) for
built-in alert types. The actual bug: **wrong i18n key nesting**. Code called
`t('alertTypes.${alertType}')` but every locale file nests it one level deeper at
`sharedPage.alertTypes.${alertType}` — the key never existed at the looked-up path,
so `t()` always fell through to the English `defaultValue`. Fixed in
`SharedProfilePage.tsx`'s `AlertBadge`. Also found the **identical bug in the
editor's alert-type/severity dropdowns** — `field_definitions.options[].label_key`
seed values in `schema.sql` were `"alertTypes.food_allergy"` etc. (missing the
`sharedPage.` prefix), same root cause, meaning the parent's own "Alert Type"
picker in the child profile editor has also been showing English regardless of UI
language. Fixed in `schema.sql` seed data. **Also discovered while fixing this:**
`severityRed`/`severityOrange` i18n keys were referenced by the severity picker
but **did not exist in ANY locale file, including en.json** — the severity buttons
were rendering the literal untranslated key string as their label. Added
`sharedPage.alertTypes.severityRed`/`severityOrange` ("Critical"/"Important") to
all 11 locale files.

### Manual steps the user still needs to run (not yet confirmed done)

- `schema.sql`'s new `service_role` grants block **was already applied directly to
  the live DB this session** via `supabase db query --linked` — this part is done
  and confirmed working (verified translate returns real Ukrainian translations for
  a real child). Re-running full `schema.sql` again is still safe/idempotent and
  would just re-apply the same grants.
- **Still needs a manual SQL step** for the alert dropdown option label_key fix
  (schema.sql seed data was corrected in the file, but the *existing* rows in the
  live `field_definitions` table still have the old un-prefixed `label_key` values
  baked into their `options` jsonb — was given to the user as an `update ... set
  options = '[...]'::jsonb` statement, not yet confirmed run).
- Frontend changes (AlertBadge key fix, ShareManagementPage error handling, theme
  dedup, PWA caching, get_shared_profile RPC usage, etc.) require a frontend
  rebuild + redeploy to take effect — **this workspace has no git repo and no
  Vercel CLI**, so deployment of frontend changes is entirely on the user's side
  via however they normally push to their GitHub→Vercel pipeline. Confirmed during
  this session that after a real frontend deploy, all `tx()`-based field
  translations started working — only the two i18n-key-path bugs (alert type
  labels, severity labels) remained after that, now also fixed in code but NOT
  YET deployed as of session end.
- `translate` and `log-share-view` Edge Functions were redeployed multiple times
  during this session via `supabase functions deploy <name> --no-verify-jwt` from
  this workspace directly (CLI is linked) — these are live and current as of
  session end. `delete-account` was not redeployed this session (no code changes
  needed beyond the CORS/error-message change from the earlier review round — verify
  that one's been deployed if not already).

### Tooling notes for next session

- Supabase CLI (`supabase`, v2.117.0) is installed and linked to this project's
  Supabase project ref in this workspace — `supabase functions deploy <name>` and
  `supabase db query --linked --file <path>` both work directly and were used
  extensively this session for live debugging. There is **no** `supabase functions
  logs` subcommand in this CLI version — the only way to see what an Edge Function
  is actually doing server-side (short of the web dashboard, which isn't
  accessible from here) is to temporarily add debug fields to the JSON response
  body, deploy, curl it directly, then revert. This is what found both bugs above.
- No git repo in this workspace. No Vercel CLI. Frontend deploy pipeline is
  external to this workspace.
- `.env` contains real, live credentials (Supabase anon key, DeepL API key) — these
  were used directly (curl, CLI) to debug against the real production project
  during this session, not just local/test values.

## Session update — GitHub publish + GitHub Pages deployment + migration/security review

This session covered: assessing Supabase migration difficulty, publishing the repo to
GitHub, standing up GitHub Pages hosting, fixing several bugs found while getting the
live site actually working end-to-end, and one i18n correction.

### Supabase migration assessment (discussion only, no architecture change)

- Discussed how hard it would be to leave Supabase. Conclusion: data layer (`db.ts`,
  ~20 functions) is a clean seam; RLS is the real coupling point (owner-only access +
  anon-read-if-shared for `/s/:token` currently lives only in Postgres policies,
  `owns_child()`/`child_is_shared()`).
- **Decision recorded, no code changed:** did NOT add redundant app-layer ownership
  checks in `db.ts`. There's no active plan to leave Supabase — duplicating every
  ownership check in both RLS and application code would be real ongoing maintenance
  cost for a migration that isn't scheduled. RLS remains the sole authorization layer.
  Revisit only if/when an actual migration is scheduled. (See "Architecture decision —
  RLS stays as the sole authorization layer" section above, added same session.)
- Centralized remaining direct Supabase SDK usage as prep work (this part WAS done):
  `auth.tsx` now wraps all MFA/AAL/account operations (`getAccessToken`,
  `checkAalStepUp`, `getVerifiedTotpFactor`, `enrollTotp`, `challengeTotp`,
  `verifyTotp`, `unenrollTotp`) — previously called directly via raw `supabase.auth.*`
  from `AccountPage.tsx`, `MfaChallengePage.tsx`, `ProtectedRoute.tsx`. `db.ts` gained
  `getShareManagementData()` to remove the one remaining direct `supabase.from()` call
  in `ShareManagementPage.tsx`. No component/page now imports the raw `supabase`
  client — everything goes through `db.ts` or `auth.tsx`.

### Published to GitHub + pre-publish secret audit

- Repo pushed to `git@github.com:smaryenko/myndigo.git` (`smaryenko/myndigo`, branch
  `master`). This workspace now has a real `.git` (previously did not).
- Pre-publish audit found and fixed two real gaps before the first push:
  - `supabase/.temp/` (Supabase CLI local link-state — project ref, pooler/DB
    connection string) was untracked but **not** gitignored. Added to `.gitignore`.
  - The real Supabase project ref was written in plain prose in this progress.md
    file (added by a previous session) — scrubbed to generic phrasing before
    publishing, since this file is now in a public repo.
  - `.env` (live DeepL key, Supabase URL/anon key) was already correctly gitignored
    and confirmed via `git check-ignore` + `git add -A --dry-run` before every push.
  - **Live DeepL API key was echoed into this chat session multiple times** (both by
    the user pasting `.env` into the editor context and by file reads) — flagged as
    exposed regardless of the git-ignore outcome and the user was told to rotate it.
    Not confirmed whether it was actually rotated.

### GitHub Pages deployment (chosen over Vercel — user wants the `github.io` URL)

Target: `https://smaryenko.github.io/myndigo/`. Vercel was discussed first (matches
existing `DEPLOY.md` Step 9) but user wants the GitHub Pages URL specifically, so
Vercel steps are skipped entirely — the two are alternatives, not both-required.

- `vite.config.ts`: `base = process.env.BASE_PATH ?? '/'` (defaults to root for
  Vercel/local dev; the workflow sets `BASE_PATH=/myndigo/`). Also had to fix the
  PWA `manifest.icons[0].src` (build-time, fine) and the `urlPattern` function for
  the `/s/` route cache rule — **that function is serialized as a string into the
  generated `sw.js` and runs in the service worker's own scope**, so it cannot close
  over the `base` variable from this Node config module. First attempt did close
  over it and broke production with `Uncaught ReferenceError: base is not defined`
  in `sw.js`. Fixed by using `new Function(...)` to bake the literal path string in
  before Workbox stringifies it — verified by grepping the built `sw.js` for a bare
  `base` identifier (none) and confirming the literal `"/myndigo/s/"` is present.
- `src/App.tsx`: `BrowserRouter` now takes `basename={import.meta.env.BASE_URL.replace(/\/$/, '')}`
  so React Router resolves correctly under the `/myndigo` subpath.
- `index.html` / `public/404.html`: added the standard SPA-on-GitHub-Pages redirect
  trick (rafgraph/spa-github-pages pattern) — GitHub Pages has no server-side
  rewrites, so a direct visit or refresh on a client route (e.g. `/myndigo/s/token`)
  would otherwise 404. `404.html` redirects to `/?/<path>`, and a small inline
  script in `index.html`'s `<head>` restores the real path via
  `history.replaceState` before React mounts. No-op on any other host.
- `.github/workflows/deploy-pages.yml`: builds on push to `master` (+ manual
  `workflow_dispatch`), sets `BASE_PATH=/myndigo/` and reads
  `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` from GitHub Actions secrets, uses
  `actions/upload-pages-artifact` + `actions/deploy-pages@v4`. The `build` job also
  declares `environment: github-pages` (added after a real failure — see below) so
  it can read secrets regardless of whether they were added as repo-level or
  environment-scoped secrets.
- **`window.location.origin` never includes a path** — three call sites needed a
  base-aware helper instead, or they'd 404 one level too high on GitHub Pages
  (`https://host/dashboard` instead of `https://host/myndigo/dashboard`):
  - `src/lib/auth.tsx` — added `appOrigin()` helper (`window.location.origin` +
    `import.meta.env.BASE_URL` trimmed), used by `signInWithGoogle()`'s `redirectTo`
    and `signUpWithEmail()`'s `emailRedirectTo`.
  - `src/pages/ShareManagementPage.tsx` — the QR-code/share-link `shareUrl` builder
    needed the same fix (this one matters most in practice — it's what gets printed
    on physical badges/QR codes).

### Real deploy failures hit and fixed, in the order encountered

1. **404 at the root URL** — first workflow run failed outright:
   `actions/deploy-pages@v4` errored `Failed to create deployment ... Ensure GitHub
   Pages has been enabled`. Root cause: repo Settings → Pages → Source was still
   "Deploy from a branch" (GitHub's default), not "GitHub Actions". This also meant
   GitHub's own auto-generated `pages-build-deployment` (Jekyll) workflow existed
   alongside ours and was the one actually serving content — confirmed via
   `GET /repos/.../actions/workflows` showing two active workflows. Fixed by the
   user switching the Source dropdown to "GitHub Actions" in repo settings (manual,
   requires GitHub web UI — not something doable from this workspace).
2. **`Missing Supabase environment variables` at runtime, blank page** — the
   `build` job ran successfully but baked in empty strings for
   `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`. Root cause: repo secrets weren't
   visible to the `build` job. Fixed by adding `environment: github-pages` to the
   `build` job in the workflow (in case secrets were added as environment-scoped
   rather than repository-scoped) — see workflow section above.
3. **`sw.js` runtime crash** (`Uncaught ReferenceError: base is not defined`) — see
   the `vite.config.ts` `urlPattern` bug described above. Fixed by baking the base
   path into the function's source text via `new Function(...)` before Workbox
   serializes it, instead of closing over the config-module-level `base` const.
4. **Google OAuth redirect landed on `http://localhost:3000/?code=...`** — Supabase
   falls back to the Site URL when `redirectTo` doesn't match anything in the
   Redirect URLs allowlist; the allowlist still had Supabase's default. Fixed by the
   user updating Supabase dashboard → Authentication → URL Configuration: Site URL
   → `https://smaryenko.github.io/myndigo/`, Redirect URLs →
   `https://smaryenko.github.io/myndigo/**`, `.../dashboard`, and later
   `http://localhost:5173/**` for local dev (see below).
5. **OAuth redirect landed on `https://smaryenko.github.io/dashboard` (404, missing
   `/myndigo`)** — root cause was the `window.location.origin`-without-base bug
   described above, not a Supabase config issue this time. Fixed in code
   (`appOrigin()` helper).
6. **Local dev Google login still redirected to production** — root cause was a
   **typo** in the Supabase Redirect URLs allowlist: `ttp://localhost:5173/**`
   (missing the leading `h`). User confirmed via screenshot and fixed it directly
   in the Supabase dashboard. Both local (`localhost:5173`) and production
   (`github.io/myndigo`) redirect URLs now coexist in the same allowlist — this
   requires no code branching since the app builds `redirectTo` from
   `window.location.origin` + base at runtime, which is already environment-aware.

### Mobile UX fix — SectionCard visibility toggle label

- `SectionCard.tsx`'s per-section visibility toggle had its text label
  (`t('share.sectionVisible')` / `t('share.sectionHidden')`) wrapped in
  `hidden sm:inline` — on mobile this left only the 👁/🙈 emoji pair visible, which
  read as ambiguous (nearly identical at small size, subtle color-only
  differentiation). Fixed by always showing the label; header now uses
  `flex-wrap` so it drops to a second line on narrow screens instead of truncating
  the section title or cramping the toggle.

### Bug fix — visibility toggle silently no-ops on empty sections (real schema change)

User reported the hide/show toggle does nothing when a section has no content yet
(specifically: communication section with only Verbal/non-verbal selected; also
Emergency Contacts with zero contacts added). Root cause, in two parts:

- **Single-entry sections** (communication, behavioral_notes, education):
  `SingleEntrySection`'s `handleVisibility` in `DynamicSection.tsx` returned early
  if `entry` was `null` — no row existed yet, so there was nothing to persist the
  flag to, and the toggle just silently did nothing. Fixed: now creates the entry
  (using whatever's in the in-memory `values`, even empty/partial) via
  `upsertProfileEntry` when no entry exists yet, instead of no-op'ing.
- **Repeatable list sections** (triggers, contacts, medications, conditions,
  doctors, sensory, routines, alerts): `handleVisibility` called
  `setSectionVisibility(entries.map(e => e.id), visible)` — with zero entries this
  is an update over an empty ID list, inherently a no-op, and `sectionVisible` was
  always computed as `entries[0]?.section_visible ?? section.default_visible`,
  which can never read as anything but the static `default_visible` when empty.
  There was no per-child place to persist "hide this while it's empty."
  **Real schema change**, reflected in `supabase/schema.sql` same response per
  project rules: added `children.hidden_empty_sections text[] not null default
  '{}'` — section_keys the parent explicitly hid while the section had zero
  entries. `ListSection`/`ContactListSection`/`AlertBarSection` now read/write this
  when `entries.length === 0`, and the first entry added to a previously-empty
  section inherits this preference as its initial `section_visible`. New `db.ts`
  function: `setEmptySectionHidden(childId, sectionKey, hidden)`. `ChildRow` type
  gained `hidden_empty_sections: string[]`. `DynamicSection`'s `Props` gained
  `hiddenEmptySections`/`onHiddenEmptySectionsChange`, threaded from
  `ChildProfilePage.tsx`.
  **Manual migration step, given to and run by the user:**
  ```sql
  alter table children add column if not exists hidden_empty_sections text[] not null default '{}';
  ```
  User confirmed this was run against the live DB.
- Also added error surfacing to all four `handleVisibility` implementations in
  `DynamicSection.tsx` (single-entry + all three repeatable variants) — previously
  none of them had any try/catch anywhere in the call chain, so a failure (RLS
  rejection, network error) would produce a silent unhandled promise rejection with
  zero UI feedback. Now shows a red inline error message on failure.

### i18n fix — Ukrainian communication level labels

- `sharedPage.communicationLevels.*` in `uk.json` used neuter adjective endings
  (`Вербальне`, `Обмежено вербальне`, `Невербальне`) where masculine agreement is
  grammatically correct for a standalone label (implied "рівень" — level, masculine).
  User flagged `non_verbal` specifically; fixed all three for consistent agreement:
  `Вербальний` / `Обмежено вербальний` / `Невербальний`. This single key is shared
  between the profile editor's level-select buttons and the public shared-page
  communication badge (`field_definitions` seed data in `schema.sql` points
  `option.label_key` at the same `sharedPage.communicationLevels.*` keys) — one fix
  covers both surfaces.

### New standing rule — git workflow (added to `.kiro/steering/project.md`)

User asked to never auto-commit/push. Added a "Git Workflow" section to the
always-included `project.md` steering file: changes are made and verified
(build/lint) locally but never committed or pushed without an explicit ask in that
turn. Also noted this means changes won't auto-deploy via the Pages workflow until
the developer (or an explicit request) pushes them.

### Commits made this session (all pushed, in order)

1. `426cc17` — Initial commit (first publish to GitHub)
2. `5029706` — Add GitHub Pages deployment support
3. `d60493a` — Allow build job to read github-pages environment secrets
4. `a357003` — Fix service worker: bake base path into urlPattern instead of closing over it
5. `9cf00d9` — Fix OAuth/email redirects and share URLs to respect base path
6. `da75756` — Show visibility toggle label on mobile (was hidden below sm breakpoint)
7. `1dbb8f8` — Fix visibility toggles that no-op on empty sections; add git workflow steering rule
8. `08eed01` — Fix Ukrainian communication level labels to masculine agreement

### State at end of session

- Live at `https://smaryenko.github.io/myndigo/`, deploying via GitHub Actions on
  every push to `master`. Google OAuth confirmed working in this session (both
  local dev on `localhost:5173` and production).
- `hidden_empty_sections` migration has been run against the live DB — the empty-
  section visibility fix should be fully functional in production once the latest
  push's deploy finishes.
- DeepL API key rotation: confirmed done by the user. The old key (exposed via chat
  context earlier this session) should be treated as fully retired — if
  `.env`/Supabase Edge Function secrets still reference the old value anywhere,
  that's now stale and should be updated to the new key, not the one seen earlier
  in this session's transcript.
- **Not verified end-to-end by the agent** (would require actually clicking through
  the live site as a user): whether the empty-section visibility fix behaves
  correctly after deploy, whether the Ukrainian label fix rendered correctly on the
  live shared page. These were verified via `npm run build`/`npm run lint` locally
  only, plus the user's own testing feedback during the session.
