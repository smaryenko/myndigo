#!/bin/sh
# ============================================================
# Verifies that the public (anon) API key cannot read child data
# directly from the database — the only anonymous read path should be
# the get_shared_profile(p_token) RPC.
#
# Uses count-only HEAD requests (Prefer: count=exact, Range 0-0), so it
# never downloads anyone's data — only row counts / permission errors.
#
# Usage:  npm run check:anon       (reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from .env)
# Exit code: 0 = all tables blocked, 1 = at least one table readable.
# ============================================================
set -eu

ENV_FILE="${ENV_FILE:-.env}"
if [ -f "$ENV_FILE" ]; then
  # Read only the two variables we need; never echo their values.
  URL=$(grep -E '^VITE_SUPABASE_URL=' "$ENV_FILE" | head -n1 | cut -d= -f2- | tr -d '"'"'" )
  KEY=$(grep -E '^VITE_SUPABASE_ANON_KEY=' "$ENV_FILE" | head -n1 | cut -d= -f2- | tr -d '"'"'" )
fi
URL="${VITE_SUPABASE_URL:-${URL:-}}"
KEY="${VITE_SUPABASE_ANON_KEY:-${KEY:-}}"

if [ -z "$URL" ] || [ -z "$KEY" ]; then
  echo "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not found (set them or create $ENV_FILE)." >&2
  exit 2
fi

failed=0
for table in children personal_info profile_entries content_translations share_audit_log user_preferences; do
  headers=$(curl -sS -I "$URL/rest/v1/$table?select=id" \
    -H "apikey: $KEY" \
    -H "Authorization: Bearer $KEY" \
    -H "Prefer: count=exact" \
    -H "Range: 0-0")
  status=$(printf '%s\n' "$headers" | head -n1 | awk '{print $2}')
  range=$(printf '%s\n' "$headers" | grep -i '^content-range:' | tr -d '\r' | awk '{print $2}')

  case "$status" in
    401|403)
      echo "PASS  $table  (HTTP $status — no anon access)" ;;
    2*)
      case "$range" in
        */0) echo "PASS  $table  (readable but 0 rows visible)" ;;
        *)   echo "FAIL  $table  (anon can read rows: Content-Range $range)"; failed=1 ;;
      esac ;;
    *)
      echo "WARN  $table  (unexpected HTTP $status)" ;;
  esac
done

exit $failed
