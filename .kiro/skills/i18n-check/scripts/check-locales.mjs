#!/usr/bin/env node
// Flat key-diff audit: compares every locale in src/locales/*.json against
// en.json (the source of truth) and reports any keys that are missing or
// extra in each locale. Exits non-zero if any locale is out of sync, so it
// can be wired into CI later if wanted.
//
// Usage: node .kiro/skills/i18n-check/scripts/check-locales.mjs

import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
// Skill lives at .kiro/skills/i18n-check/scripts/ — locales are at src/locales/
// relative to the workspace root, four levels up from this script.
const localesDir = join(__dirname, '../../../../src/locales')
const SOURCE_LOCALE = 'en.json'

function flattenKeys(obj, prefix = '') {
  const keys = []
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, path))
    } else {
      keys.push(path)
    }
  }
  return keys
}

function loadLocale(filename) {
  const raw = readFileSync(join(localesDir, filename), 'utf-8')
  return JSON.parse(raw)
}

function main() {
  const files = readdirSync(localesDir).filter(f => f.endsWith('.json'))
  if (!files.includes(SOURCE_LOCALE)) {
    console.error(`Source locale ${SOURCE_LOCALE} not found in ${localesDir}`)
    process.exit(1)
  }

  const sourceKeys = new Set(flattenKeys(loadLocale(SOURCE_LOCALE)))
  const targetFiles = files.filter(f => f !== SOURCE_LOCALE).sort()

  let hasDrift = false

  for (const file of targetFiles) {
    let targetKeys
    try {
      targetKeys = new Set(flattenKeys(loadLocale(file)))
    } catch (err) {
      console.log(`\n${file}: FAILED TO PARSE — ${err.message}`)
      hasDrift = true
      continue
    }

    const missing = [...sourceKeys].filter(k => !targetKeys.has(k)).sort()
    const extra = [...targetKeys].filter(k => !sourceKeys.has(k)).sort()

    if (missing.length === 0 && extra.length === 0) {
      console.log(`${file}: OK (${targetKeys.size} keys, matches ${SOURCE_LOCALE})`)
      continue
    }

    hasDrift = true
    console.log(`\n${file}: DRIFT DETECTED`)
    if (missing.length > 0) {
      console.log(`  Missing (${missing.length}) — will silently fall back to English in the UI:`)
      for (const k of missing) console.log(`    - ${k}`)
    }
    if (extra.length > 0) {
      console.log(`  Extra (${extra.length}) — present here but not in ${SOURCE_LOCALE} (likely dead or renamed keys):`)
      for (const k of extra) console.log(`    - ${k}`)
    }
  }

  console.log()
  if (hasDrift) {
    console.log('Result: one or more locales are out of sync with en.json.')
    process.exit(1)
  } else {
    console.log(`Result: all ${targetFiles.length} locales are key-complete relative to ${SOURCE_LOCALE}.`)
    process.exit(0)
  }
}

main()
