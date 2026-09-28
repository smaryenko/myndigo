---
name: i18n-check
description: Audit src/locales/*.json for missing or extra translation keys compared to en.json. Use after adding, renaming, or removing any UI string key, before committing i18n changes, or when asked to check/audit/verify translations or locale completeness.
---

# i18n completeness audit

Myndigo ships 11 locales (`src/locales/*.json`, source of truth is `en.json`).
A locale missing a key doesn't error — it silently falls back to English in
the UI, so drift is invisible until someone notices English text leaking
into a non-English screen. This has happened before (see
`.kiro/steering/progress.md`: 52 keys were found missing across several
locales in one past session, discovered only via a visible UI bug).

## When to run this

- After adding a new key to `en.json` for any new UI string.
- After renaming or removing a key anywhere in `src/locales/`.
- Before committing any change that touches `src/locales/*.json`.
- Whenever asked to "check", "audit", or "verify" translations/locales.

## How to run it

Run the bundled script from the workspace root:

```bash
node .kiro/skills/i18n-check/scripts/check-locales.mjs
```

It flattens every nested key in each locale (e.g. `common.save` becomes one
string) and diffs each non-English locale against `en.json`. Output is one
of:

- `<locale>.json: OK (N keys, matches en.json)` — nothing to do.
- `<locale>.json: DRIFT DETECTED` — followed by two possible lists:
  - **Missing** — keys present in `en.json` but absent here. These are the
    ones silently falling back to English in the UI. Fix by adding the key
    with a real translation (not just copying the English text — if a real
    translation genuinely isn't available yet, say so explicitly rather
    than leaving it silently missing).
  - **Extra** — keys present here but not in `en.json`. Usually a leftover
    from a since-renamed or removed English key. Safe to delete unless the
    key is intentionally locale-specific (rare in this codebase — check
    before removing).

Exit code is non-zero if any locale has drift, zero if all are in sync —
usable as a CI gate later if wanted, not currently wired into any workflow.

## After fixing drift

1. Re-run the script to confirm it now reports all locales as OK.
2. Run `npm run build` to confirm the JSON is still valid and nothing
   broke.
3. Note in `.kiro/steering/progress.md` if this was a non-trivial drift
   (more than a couple of keys) — this has been a recurring issue worth
   tracking.
