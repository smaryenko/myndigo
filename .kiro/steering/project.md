# Myndigo — Project Overview

## What We're Building

A web app (with potential future mobile extension) for **parents of children with ASD (Autism Spectrum Disorder)**. The app helps parents manage their child's specific information and share it easily with caregivers, teachers, medical staff, or emergency responders.

## Core Features

### 1. Child Profile Management
Parents can create and maintain a detailed profile for their child, including:
- Personal info (name, age, photo)
- Diagnosis details and severity
- Communication style and preferences
- Sensory sensitivities (sounds, textures, lights, etc.)
- Triggers and how to de-escalate
- Preferred routines and what disrupts them
- Emergency contacts
- Medical info (medications, allergies, doctors)
- Behavioral notes and strategies that work

### 2. Shareable Read-Only Page
- Each child profile can be shared via a **public read-only URL**
- The URL is accessible without login
- Shareable via **QR code** or **NFC chip** (e.g., on a card, bracelet, or backpack tag)
- Designed to be immediately useful to a stranger (first responder, teacher, caregiver) who scans it

### 3. Access Control
- Parents control what fields are visible on the public page
- Private fields stay hidden from the shared view

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Linting**: oxlint
- **Package name**: `asdid` (internal), app brand: **Myndigo**

## Internationalisation

- UI strings: `i18next` + `react-i18next`
- User-entered content: translated on-demand via Supabase Edge Function, cached in DB
- Translation provider uses an **adapter pattern** — swap between DeepL, Google Translate, or LibreTranslate by changing one env var (`TRANSLATION_PROVIDER`)
- Default provider: DeepL
- Parents set their UI language and the default language for their shared card
- Viewers can switch language on the shared page; cached after first translation

## Database Schema

- Single source of truth: `supabase/schema.sql`
- No migration files — changes go directly into schema.sql
- **Every** DB change (new table, column, policy, grant, function, trigger) MUST be reflected in `supabase/schema.sql` in the same response that introduces the change — never as a follow-up or afterthought
- When a change requires running SQL on an existing database, output the exact SQL as a **manual step** at the end of the response so the developer can run it in Supabase SQL Editor## Future Considerations
- Authentication / multi-user accounts
- Multiple children per account
- NFC write support (to program chips directly from the app)
- Offline support (PWA)

## Git Workflow

- **Never run `git commit` or `git push` automatically.** Make and verify code changes (build/lint) as normal, but leave committing and pushing to the developer unless they explicitly ask for it in that turn.
- This also means: changes won't auto-deploy via the GitHub Actions Pages workflow (it only triggers on push to `master`) until the developer commits and pushes themselves, or explicitly asks for that to be done.

## Design Principles

- Simple and fast — parents are busy and stressed
- Accessible and calm UI — not overwhelming
- The shared page must work instantly without requiring the viewer to install anything or log in
- Mobile-first design since most sharing happens on phones
