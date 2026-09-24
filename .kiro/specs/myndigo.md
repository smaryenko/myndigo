# Myndigo — Full Product Spec

## Overview

Myndigo is a web app for parents of children with ASD (Autism Spectrum Disorder) to manage their child's detailed personal, medical, and behavioral profile. The profile can be shared via a QR code or NFC chip as a read-only public page — instantly useful to any caregiver, teacher, or first responder.

---

## 1. Authentication & Security

### Login Methods
- Google OAuth (primary)
- Email + password (fallback)

### MFA
- TOTP via authenticator app (Google Authenticator, Authy, etc.)
- Optional at signup, can be enforced per-account
- Supabase native MFA support

### Sessions
- Short-lived JWT (1 hour) + Supabase refresh token for silent re-auth
- "Remember me" extends refresh token lifetime
- Force re-authentication before sensitive actions:
  - Changing email or password
  - Deleting a child profile
  - Regenerating a share token

### Account Model
- One account = one parent/guardian
- Multiple children per account
- Multiple guardians per child: out of scope for v1

---

## 2. Data Model

All tables have RLS (Row Level Security) policies. Users can only read/write their own data.

```
users (Supabase Auth)
└── children
      ├── id (uuid, PK)
      ├── user_id (FK → auth.users)
      ├── share_token (uuid, unique, immutable unless regenerated)
      ├── sharing_enabled (boolean)
      ├── created_at / updated_at
      │
      ├── personal_info
      │     ├── name
      │     ├── date_of_birth
      │     ├── pronouns
      │     ├── photo (base64-encoded string, size-limited client-side)
      │     └── section_visible (boolean)
      │
      ├── alerts []
      │     ├── type (enum: nut_allergy | food_allergy | epilepsy | diabetes |
      │     │         asthma | elopement_risk | non_swimmer | heart_condition | custom)
      │     ├── label (string — auto-filled for predefined, custom for "custom" type)
      │     ├── note (string — optional, e.g. "carries EpiPen in red pouch")
      │     ├── severity (enum: red | orange)
      │     └── section_visible (boolean) ← strong warning if parent tries to hide
      │
      ├── communication
      │     ├── level (enum: verbal | limited_verbal | non_verbal)
      │     ├── uses_aac (boolean)
      │     ├── aac_device (string)
      │     ├── echolalia (boolean)
      │     ├── instructions [] (short text items, e.g. "Use simple short phrases")
      │     └── section_visible (boolean)
      │
      ├── triggers []
      │     ├── trigger (string)
      │     ├── de_escalation (string)
      │     └── section_visible (boolean) ← per trigger or whole section
      │
      ├── sensory_profile
      │     ├── sensitivities [] (type: sound|light|touch|smell|taste|movement, note)
      │     └── section_visible (boolean)
      │
      ├── routines
      │     ├── items [] (routine description, disruption note)
      │     └── section_visible (boolean)
      │
      ├── medical_info
      │     ├── medications [] (name, dose, frequency, note)
      │     ├── allergies [] (substance, reaction, note)
      │     ├── conditions [] (name, note)
      │     ├── doctors [] (name, specialty, phone)
      │     └── section_visible (boolean)
      │
      ├── emergency_contacts []
      │     ├── name
      │     ├── relation
      │     ├── phone
      │     ├── priority (integer, for ordering)
      │     └── section_visible (boolean)
      │
      └── behavioral_notes
            ├── content (free text / rich text)
            └── section_visible (boolean)
```

### Share Visibility Rules
- Each section has a `section_visible` boolean
- When `sharing_enabled = false`, the `/s/:token` page shows "This profile is not currently shared" — token is preserved
- Alerts section: can be hidden but parent sees a strong warning modal before confirming
- `share_token` persists through hide/unhide cycles; only regenerated on explicit parent action

---

## 3. Shareable Read-Only Page (`/s/:token`)

### Access Pattern
- Public URL, no login required
- Token is a UUID — not the child record ID (prevents enumeration)
- Anonymous Supabase role can only SELECT from `shared_profile` view, filtered by token and `sharing_enabled = true`
- Rate limited to prevent scraping

### PWA / Offline Support
- Service worker caches the last-loaded shared profile
- Works without internet after first load
- Parent portal is always-online (no offline support)

### Layout — Above the Fold (one screen, mobile-first)

```
┌─────────────────────────────────────┐
│  🚨 ALERTS (if section_visible)     │
│  [🥜 NUT ALLERGY] [⚡ EPILEPSY] ... │
│  (top 3 shown, "show all" chip)     │
├─────────────────────────────────────┤
│  [Photo]  Emma, 8  •  She/her       │
│           💬 Non-verbal             │
├─────────────────────────────────────┤
│  🔴 TRIGGERS      💬 TALK TO ME     │
│  • Loud noises    Use simple        │
│  • Crowds         short phrases     │
│  • Changes        Show pictures     │
├─────────────────────────────────────┤
│  📞 Mum +1 555 000 0000  [📲 call]  │
│  📞 Dad +1 555 000 0001  [📲 call]  │
└─────────────────────────────────────┘
```

### Below the Fold (expandable cards)
- Medical Info
- Sensory Profile
- Routines & Preferences
- Behavioral Strategies
- Diagnosis Details

Each card only renders if `section_visible = true`.

### Alert Badge System
| Type | Icon | Color |
|---|---|---|
| Nut allergy | 🥜 | Red |
| Food allergy | 🍽️ | Red |
| Epilepsy / seizures | ⚡ | Orange |
| Diabetes | 💉 | Orange |
| Asthma | 🫁 | Orange |
| Elopement risk | 🚪 | Red |
| Non-swimmer | 🌊 | Red |
| Heart condition | ❤️ | Red |
| Custom | ⚠️ | Red |

Sorted by severity (red first). Each badge optionally shows a short note on tap.

### Branding
- Small "Powered by Myndigo" footer on shared page

---

## 4. Audit Log

Every view of `/s/:token` logs:
- `child_id` (FK)
- `timestamp`
- `user_agent`
- `geolocation` — browser `navigator.geolocation` with viewer consent; falls back to IP-based rough geo
- No PII collected about the viewer

Parents can view the audit log on the share management page.

Parent receives a **notification** (email for v1, push notifications future) each time the shared page is viewed.

---

## 5. Parent Portal Pages

| Route | Page |
|---|---|
| `/login` | Google OAuth + email/password sign-in |
| `/dashboard` | List of children, quick actions |
| `/children/new` | Add a child profile |
| `/children/:id` | Edit full profile |
| `/children/:id/share` | Share management: toggle sharing, view/regenerate QR code, copy link, write to NFC, view audit log |
| `/account` | Account settings, MFA setup, danger zone |
| `/s/:token` | Public read-only shared profile (no auth) |

---

## 5b. Internationalisation (i18n) & Translation

### Two distinct problems

**UI translation** — labels, buttons, field names, static strings
- Library: `i18next` + `react-i18next`
- Language detection: `i18next-browser-languagedetector`
- Translations stored in `/src/locales/{lang}.json`

**User content translation** — profile data entered by the parent
- **No translation on save** — profile data is stored in the parent's original language only
- **On-demand only**: translation is triggered exclusively when a viewer requests a non-default language on the shared page
- Result is cached in DB — subsequent viewers get the cached version with no API call
- Cache for a field is deleted when the parent edits that field; re-translated on next viewer request
- Zero translation API calls until someone actually needs a different language
- Translation happens server-side via a Supabase Edge Function (keeps API keys secret)

### Translation Provider — Adapter Pattern

All translation logic goes through a single interface. The active provider is controlled by a single environment variable (`TRANSLATION_PROVIDER`). Swapping providers requires no code changes.

```
supabase/functions/translate/
  ├── index.ts              ← Supabase Edge Function entry point
  └── lib/
      ├── types.ts              ← TranslationProvider interface + Language type
      ├── index.ts              ← factory: reads TRANSLATION_PROVIDER env var
      └── providers/
          ├── deepl.ts          ← default
          ├── google.ts
          └── libre.ts          ← free self-hosted fallback
```

```typescript
interface TranslationProvider {
  translate(text: string, targetLang: string, sourceLang?: string): Promise<string>
  translateBatch(texts: string[], targetLang: string, sourceLang?: string): Promise<string[]>
  supportedLanguages(): Promise<Language[]>
}
```

**Default provider: DeepL** (best quality for medical/behavioral nuanced text)
**Fallback: LibreTranslate** (free, self-hosted, no API cost)

### Cache invalidation
- When a parent saves a field, **only the cache rows for that specific field are deleted** — all other cached translations remain intact
- Invalidation is handled by a Supabase database trigger, not the frontend — can't be bypassed
- Cache is only deleted if the field value actually changed (no-op saves don't invalidate)
- Array items (triggers, contacts, etc.) use stable UUIDs as field path keys — not indexes — so reordering doesn't cause stale cache entries (e.g. `triggers.{uuid}.trigger` not `triggers[0].trigger`)
- Re-translation happens on next viewer request for that field, not at save time

### Live updates — no re-sharing needed
- The share token points to the child record, not a snapshot
- All profile changes are reflected automatically on the shared page — parent never needs to re-share
- The QR code and NFC chip stay permanently valid; they always serve the latest data
- The only reason to regenerate the token is if the parent wants to invalidate existing QR codes/NFC chips (explicit action)

1. Parent selects UI language in account settings → interface renders in that language
2. Parent fills profile in their language
3. Parent sets **default language for shared card**
4. Viewer opens `/s/:token` → content shown in default language
5. Viewer selects different language → Edge Function translates + caches → instant on repeat views
6. When parent edits a field → cached translations for that field are invalidated

### Supported languages for v1

English, Spanish, French, German, Portuguese, Italian, Arabic, Chinese (Simplified), Japanese, Polish

### DB translation cache schema

```
content_translations
  ├── child_id (FK)
  ├── field_path (e.g. "triggers[0].trigger", "communication.instructions[1]")
  ├── source_lang
  ├── target_lang
  ├── translated_text
  ├── provider_used
  └── created_at
```

---

## 6. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS |
| Auth | Supabase Auth (Google OAuth + email/password + TOTP MFA) |
| Database | Supabase (Postgres) with RLS |
| Storage | Supabase Storage (private buckets) — not used for photos (base64 in DB) |
| QR Code | `qrcode.react` or similar |
| NFC | Web NFC API (Chrome Android) |
| PWA | Vite PWA plugin (service worker for `/s/:token` only) |
| UI i18n | `i18next` + `react-i18next` + `i18next-browser-languagedetector` |
| Content translation | Supabase Edge Function + adapter pattern (DeepL default, Google/LibreTranslate swappable via env var) |
| Linting | oxlint |

---

## 7. Security Principles

- All tables RLS-protected; no data accessible without valid session
- Share token is the only access path to public data — record IDs never exposed in URLs
- Base64 photos stored in DB, never in public Storage buckets
- Rate limiting on share endpoint
- Force re-auth before destructive/sensitive actions
- Strong warning before hiding the Alerts section
- Audit log for all shared page views
- GDPR-aware: all data deletable, no third-party tracking on shared page

---

## 8. Out of Scope for v1

- Multiple guardians per child
- Push notifications (email only for audit alerts)
- NFC chip writing (viewing NFC-linked page works; writing to chip is future)
- Offline parent portal
- Mobile native app
