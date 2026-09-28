-- ============================================================
-- Myndigo — Complete Database Schema
-- ============================================================
-- Paste this entire file into Supabase SQL Editor and run it.
-- Dashboard → SQL Editor → New query → paste → Run
-- ============================================================

-- Enable UUID extension (usually already enabled on Supabase)
create extension if not exists "pgcrypto";

-- ============================================================
-- CHILDREN
-- Core record per child. One parent can have many children.
-- share_token is generated automatically on insert.
-- sharing_enabled defaults to false — parent must opt in.
-- profile_type is a plain text tag (e.g. 'asd_child') that selects
-- which section_definitions/field_definitions apply to this child.
-- Not constrained by a lookup table on purpose — same convention as
-- share_theme below — new profile types are just new seed data.
-- ============================================================
create table if not exists children (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  share_token           uuid not null unique default gen_random_uuid(),
  sharing_enabled       boolean not null default false,
  share_language        text not null default 'en',
  share_theme           text not null default 'professional',
  profile_type          text not null default 'asd_child',
  hidden_empty_sections text[] not null default '{}',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Safe to re-run on a database that already had `children` before
-- profile_type existed — adds the column only if it's missing.
alter table children add column if not exists profile_type text not null default 'asd_child';

-- Tracks which repeatable sections (triggers, contacts, medications, etc.)
-- a parent explicitly hid *while the section had zero entries*. Needed
-- because a repeatable section's visibility otherwise lives on
-- profile_entries.section_visible — which doesn't exist yet when there
-- are no entries, so the visibility toggle had nothing to persist to and
-- silently did nothing on an empty section. Once the first entry is
-- added, this preference seeds that entry's section_visible and this
-- array entry becomes irrelevant again until the section is emptied out.
alter table children add column if not exists hidden_empty_sections text[] not null default '{}';

-- ============================================================
-- PERSONAL INFO
-- Fixed identity base — same shape regardless of profile_type.
-- ============================================================
create table if not exists personal_info (
  id              uuid primary key default gen_random_uuid(),
  child_id        uuid not null unique references children(id) on delete cascade,
  name            text not null default '',
  date_of_birth   date,
  pronouns        text,
  photo_base64    text,
  photo_visible   boolean not null default true,
  section_visible boolean not null default true,
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- SECTION DEFINITIONS
-- One row per section (Alerts, Triggers, ...) per profile_type.
-- Controls ordering and how the section behaves (repeatable list
-- vs single entry). Metadata only — no user data, readable by anyone.
-- ============================================================
create table if not exists section_definitions (
  id              uuid primary key default gen_random_uuid(),
  profile_type    text not null,             -- 'asd_child' — plain tag, matches children.profile_type
  section_key     text not null,             -- 'alerts', 'triggers', 'contacts'
  label_key       text not null,             -- i18n key, e.g. 'child.sections.triggers'
  repeatable      boolean not null default true,   -- true: list of entries. false: single entry per child
  render_hint     text not null default 'list',     -- 'list' | 'single' | 'alert_bar' | 'contact_list'
  sort_order      int not null default 0,
  default_visible boolean not null default true,
  -- Shared (public) page presentation. Both optional:
  --   share_label_key       — title on the shared page; falls back to label_key
  --   share_group_label_key — sections with the same value render inside one
  --                           expandable card with that title (e.g. medications,
  --                           conditions and doctors under "Medical information"),
  --                           each with its own share_label_key as a sub-heading
  share_label_key       text,
  share_group_label_key text,
  unique (profile_type, section_key)
);

alter table section_definitions add column if not exists share_label_key text;
alter table section_definitions add column if not exists share_group_label_key text;

-- ============================================================
-- FIELD DEFINITIONS
-- One row per field within a section.
-- field_type drives which input/display widget renders it.
-- can_hide_independently: parent can toggle this specific field's
-- visibility on the shared page without hiding the whole entry
-- (generalizes personal_info.photo_visible to any field).
-- ============================================================
create table if not exists field_definitions (
  id                     uuid primary key default gen_random_uuid(),
  section_id             uuid not null references section_definitions(id) on delete cascade,
  field_key              text not null,             -- 'trigger_text', 'phone', 'severity'
  label_key              text not null,             -- i18n key for the <label> shown above the input
  placeholder_key        text,                       -- i18n key for input placeholder text; falls back to label_key if null
  field_type             text not null,             -- 'text' | 'longtext' | 'select' | 'boolean' | 'phone' | 'severity_enum' | 'priority_int'
  options                jsonb,                      -- for 'select'/'severity_enum': [{ "value": "red", "label_key": "..." }]
  required               boolean not null default false,
  translatable           boolean not null default true,
  can_hide_independently boolean not null default false,
  sort_order             int not null default 0,
  unique (section_id, field_key)
);

alter table field_definitions add column if not exists placeholder_key text;

-- ============================================================
-- PROFILE ENTRIES
-- The actual data. One row per entry per section per child.
-- For non-repeatable sections (communication, behavioral_notes),
-- there is exactly one row per child+section.
-- hidden_fields: field_keys hidden from the shared page even though
-- section_visible = true (per-field visibility override).
-- ============================================================
create table if not exists profile_entries (
  id              uuid primary key default gen_random_uuid(),
  child_id        uuid not null references children(id) on delete cascade,
  section_key     text not null,
  sort_order      int not null default 0,
  section_visible boolean not null default true,
  hidden_fields   text[] not null default '{}',
  values          jsonb not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists profile_entries_child_id_idx on profile_entries(child_id);
create index if not exists profile_entries_child_section_idx on profile_entries(child_id, section_key);

-- ============================================================
-- TRANSLATION CACHE
-- On-demand translations, cached per field path.
-- Only populated when a viewer requests a non-default language.
-- Cache is invalidated per-entry when the parent edits content.
-- ============================================================
create table if not exists content_translations (
  id              uuid primary key default gen_random_uuid(),
  child_id        uuid not null references children(id) on delete cascade,
  field_path      text not null,   -- e.g. "profile_entries.{uuid}.trigger_text"
  source_lang     text not null,
  target_lang     text not null,
  translated_text text not null,
  provider_used   text not null,
  created_at      timestamptz not null default now(),
  unique (child_id, field_path, target_lang)
);

-- ============================================================
-- AUDIT LOG
-- Every view of the shared page is logged.
-- Inserts via service role only (from log-share-view Edge Function).
-- ============================================================
create table if not exists share_audit_log (
  id          uuid primary key default gen_random_uuid(),
  child_id    uuid not null references children(id) on delete cascade,
  viewed_at   timestamptz not null default now(),
  user_agent  text,
  latitude    double precision,
  longitude   double precision,
  geo_source  text,  -- 'browser' | 'ip'
  ip_city     text,
  ip_country  text
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists children_user_id_idx on children(user_id);
create index if not exists children_share_token_idx on children(share_token);
create index if not exists content_translations_child_id_idx on content_translations(child_id);
create index if not exists share_audit_log_child_id_idx on share_audit_log(child_id);

-- ============================================================
-- FUNCTION: update_updated_at
-- Automatically stamps updated_at on row changes
-- ============================================================
-- search_path = '' like every other function here; now() resolves from
-- pg_catalog (always implicitly searched) and updated_at is a record field,
-- so an empty search_path is safe.
create or replace function update_updated_at()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists children_updated_at on children;
create trigger children_updated_at
  before update on children
  for each row execute function update_updated_at();

drop trigger if exists personal_info_updated_at on personal_info;
create trigger personal_info_updated_at
  before update on personal_info
  for each row execute function update_updated_at();

drop trigger if exists profile_entries_updated_at on profile_entries;
create trigger profile_entries_updated_at
  before update on profile_entries
  for each row execute function update_updated_at();

-- ============================================================
-- FUNCTION: invalidate_translation_cache
-- Deletes cached translations for exactly one entry when its
-- source content is updated or the entry is deleted. All other
-- cached translations (including other entries in the same
-- section) remain intact.
--
-- field_path format — one convention for every section, shared by
-- the translate Edge Function and the shared page (see
-- src/lib/fieldPath.ts and supabase/functions/_shared/fieldPath.ts):
--   "{section_key}.{entry_id}.{field_key}"        e.g. triggers.<uuid>.trigger_text
--   "{section_key}.{entry_id}.{field_key}.{i}"    list items (text_list fields)
-- Prefix match uses left() rather than LIKE so '_' in section keys
-- (e.g. behavioral_notes) isn't treated as a wildcard.
-- ============================================================
create or replace function invalidate_translation_cache()
returns trigger language plpgsql
set search_path = ''
as $$
declare
  v_row    public.profile_entries := coalesce(new, old);
  v_prefix text := v_row.section_key || '.' || v_row.id::text || '.';
begin
  -- Visibility toggles / reordering don't change the source text.
  if tg_op = 'UPDATE' and new.values is not distinct from old.values then
    return new;
  end if;
  delete from public.content_translations
  where child_id = v_row.child_id
    and left(field_path, length(v_prefix)) = v_prefix;
  return v_row;
end;
$$;

drop trigger if exists profile_entries_translation_invalidate on profile_entries;
create trigger profile_entries_translation_invalidate
  after update or delete on profile_entries
  for each row execute function invalidate_translation_cache();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Removed helpers (were never referenced by any policy or client code).
-- log_share_view existed in two shapes across the life of this project and
-- BOTH must be dropped by exact signature — `drop function` matches on
-- arguments, so the 7-arg drop below silently no-op'd while the live 5-arg
-- version survived as an anon-executable SECURITY DEFINER function that could
-- insert forged share_audit_log rows (audit inserts are service_role only, via
-- the log-share-view Edge Function). Confirmed live on 2026-09-28 and dropped.
drop function if exists auth_uid();
drop function if exists log_share_view(uuid, text, double precision, double precision, text);
drop function if exists log_share_view(uuid, text, double precision, double precision, text, text, text);

-- Helper: does the current user own this child?
-- NOTE: if multi-guardian access is added later, only this function
-- body changes (e.g. to check a child_guardians join table) — every
-- policy across the schema that calls owns_child() keeps working
-- without modification.
create or replace function owns_child(p_child_id uuid)
returns boolean language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.children
    where id = p_child_id and user_id = auth.uid()
  );
$$;

-- anon never needs this (it has no table access to reach a policy that calls
-- it). `authenticated` MUST keep EXECUTE: the owner RLS policies below invoke
-- owns_child(), and function-execute permission is checked against the calling
-- role — revoking it here would break every owner policy in the schema.
revoke execute on function owns_child(uuid) from public, anon;
grant execute on function owns_child(uuid) to authenticated;

-- child_is_shared() used to back anonymous read policies; both were
-- removed — see "Anonymous access" below.

-- Enable RLS on all tables
alter table children enable row level security;
alter table personal_info enable row level security;
alter table profile_entries enable row level security;
alter table content_translations enable row level security;
alter table share_audit_log enable row level security;

-- ------------------------------------------------------------
-- Anonymous access
-- There are deliberately NO row policies granting anon (or
-- authenticated non-owners) read access to children, personal_info,
-- profile_entries or content_translations. The share token is the
-- only credential for the public page, and PostgREST lets callers
-- choose their own filters — a policy like "sharing_enabled = true"
-- lets anyone with the (public) anon key list every shared child,
-- their share tokens, photos and hidden fields without knowing any
-- token. The shared page reads exclusively through
-- get_shared_profile(p_token) (security definer, below), and the
-- translate / log-share-view Edge Functions use service_role.
-- ------------------------------------------------------------
drop policy if exists "public read if shared" on children;
drop policy if exists "anon read if shared" on personal_info;
drop policy if exists "anon read if shared" on profile_entries;
drop policy if exists "anon read if shared" on content_translations;
drop function if exists child_is_shared(uuid);

-- children: owner only
drop policy if exists "owners can do everything on their children" on children;
create policy "owners can do everything on their children"
  on children for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- personal_info
drop policy if exists "owner full access" on personal_info;
create policy "owner full access" on personal_info for all
  using (owns_child(child_id)) with check (owns_child(child_id));

-- profile_entries — one policy pair for every section.
drop policy if exists "owner full access" on profile_entries;
create policy "owner full access" on profile_entries for all
  using (owns_child(child_id)) with check (owns_child(child_id));

-- content_translations
drop policy if exists "owner full access" on content_translations;
create policy "owner full access" on content_translations for all
  using (owns_child(child_id)) with check (owns_child(child_id));

-- share_audit_log: owner read + delete; inserts only via service role (Edge Function)
drop policy if exists "owner read" on share_audit_log;
create policy "owner read" on share_audit_log for select
  using (owns_child(child_id));

drop policy if exists "owner delete" on share_audit_log;
create policy "owner delete" on share_audit_log for delete
  using (owns_child(child_id));

-- ============================================================
-- USER PREFERENCES
-- ============================================================
create table if not exists user_preferences (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique references auth.users(id) on delete cascade,
  notify_on_view  boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists user_preferences_updated_at on user_preferences;
create trigger user_preferences_updated_at
  before update on user_preferences
  for each row execute function update_updated_at();

alter table user_preferences enable row level security;

drop policy if exists "owner full access" on user_preferences;
create policy "owner full access"
  on user_preferences for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================
-- TABLE-LEVEL GRANTS
-- RLS policies control row access, but grants control table access.
-- Authenticated users get full CRUD on their own data (RLS enforces ownership).
-- Anon gets no table access to child data at all — only EXECUTE on
-- get_shared_profile() and SELECT on the definitions metadata.
-- ============================================================

grant select, insert, update, delete on children to authenticated;
grant select, insert, update, delete on personal_info to authenticated;
grant select, insert, update, delete on profile_entries to authenticated;
grant select, insert, update, delete on content_translations to authenticated;
grant select, insert, update, delete on user_preferences to authenticated;

-- Audit log: authenticated users read + delete (inserts via service role Edge Function)
grant select, delete on share_audit_log to authenticated;
grant select, insert on share_audit_log to service_role;

-- Anon: no direct access to child data (see "Anonymous access" above).
revoke all on children from anon;
revoke all on personal_info from anon;
revoke all on profile_entries from anon;
revoke all on content_translations from anon;
revoke all on share_audit_log from anon;
revoke all on user_preferences from anon;

-- section_definitions / field_definitions: pure schema metadata, same for
-- every user regardless of who's looking or which child — every role may read
-- it, nobody but the owner may write it.
--
-- RLS is ENABLED with an explicitly permissive SELECT policy rather than
-- disabled. This project has an `ensure_rls` event trigger (ddl_command_end →
-- rls_auto_enable()) that turns RLS back on for tables in public, so
-- `disable row level security` here was a workaround that any future DDL on
-- these two tables could undo — and with zero policies that means every read
-- returns nothing. Both the editor and the shared page render from these
-- definitions, so that failure mode is the whole app going blank with no error.
-- A permissive policy is equivalent in effect and immune to the trigger.
-- Writes: no policy → owner/service_role only (service_role bypasses RLS, so
-- the translate Edge Function is unaffected).
alter table section_definitions enable row level security;
alter table field_definitions  enable row level security;

drop policy if exists "definitions readable by all" on section_definitions;
create policy "definitions readable by all" on section_definitions
  for select to anon, authenticated using (true);

drop policy if exists "definitions readable by all" on field_definitions;
create policy "definitions readable by all" on field_definitions
  for select to anon, authenticated using (true);

grant select on section_definitions to authenticated, anon;
grant select on field_definitions to authenticated, anon;

-- service_role (used by the translate / log-share-view / delete-account Edge
-- Functions): RLS is bypassed automatically for this role, but table-level
-- GRANTs are a separate mechanism and are NOT automatically bypassed — on
-- this project no table had ever been explicitly granted to service_role
-- (only share_audit_log insert existed above), which meant every service-role
-- query from these Edge Functions failed with "permission denied for table
-- ..." and silently produced empty results (translate returned
-- {translations: {}} for every request, with no error surfaced to the
-- viewer). Grant everything the Edge Functions actually touch:
--   - translate: children, section_definitions, field_definitions,
--     profile_entries, content_translations (select+insert for the cache)
--   - log-share-view: children, personal_info, user_preferences (all
--     select-only reads inside notifyParent), share_audit_log insert
--   - delete-account: calls the Auth admin API (DELETE /auth/v1/admin/users),
--     not direct table access, so nothing additional needed here
grant select on children to service_role;
grant select on section_definitions to service_role;
grant select on field_definitions to service_role;
grant select on profile_entries to service_role;
grant select, insert, update on content_translations to service_role;
grant select on personal_info to service_role;
grant select on user_preferences to service_role;

-- ============================================================
-- FUNCTION: regenerate_share_token
-- Generates a new UUID share token for a child.
-- Old QR codes and NFC chips pointing to the previous token
-- will stop working immediately.
-- ============================================================
create or replace function regenerate_share_token(p_child_id uuid)
returns uuid language plpgsql security definer
set search_path = ''
as $$
declare
  v_new_token uuid;
begin
  if not public.owns_child(p_child_id) then
    raise exception 'Not authorised';
  end if;

  v_new_token := gen_random_uuid();

  update public.children
  set share_token = v_new_token
  where id = p_child_id;

  return v_new_token;
end;
$$;

revoke execute on function regenerate_share_token(uuid) from public, anon;
grant execute on function regenerate_share_token(uuid) to authenticated;

-- ============================================================
-- FUNCTION: create_child
-- Creates the children row and its personal_info row in one
-- transaction, so a failure can't leave an orphan child without
-- personal info. Runs as the caller (security invoker) — the normal
-- owner RLS policies apply to both inserts.
-- ============================================================
create or replace function create_child(
  p_name          text,
  p_date_of_birth date default null,
  p_pronouns      text default null
)
returns public.children language plpgsql
set search_path = ''
as $$
declare
  v_child public.children;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.children (user_id)
  values (auth.uid())
  returning * into v_child;

  insert into public.personal_info (child_id, name, date_of_birth, pronouns)
  values (v_child.id, coalesce(trim(p_name), ''), p_date_of_birth, nullif(trim(p_pronouns), ''));

  return v_child;
end;
$$;

revoke execute on function create_child(text, date, text) from public, anon;
grant execute on function create_child(text, date, text) to authenticated;

-- ============================================================
-- FUNCTION: set_empty_section_hidden
-- Adds/removes one section_key in children.hidden_empty_sections
-- atomically (array_append/array_remove in a single UPDATE), instead
-- of the client reading the array and writing it back — two tabs
-- toggling different sections could otherwise overwrite each other.
-- Security invoker: owner RLS on children applies.
-- ============================================================
create or replace function set_empty_section_hidden(
  p_child_id    uuid,
  p_section_key text,
  p_hidden      boolean
)
returns text[] language sql
set search_path = ''
as $$
  update public.children
  set hidden_empty_sections = case
    when p_hidden then array_append(array_remove(hidden_empty_sections, p_section_key), p_section_key)
    else array_remove(hidden_empty_sections, p_section_key)
  end
  where id = p_child_id
  returning hidden_empty_sections;
$$;

revoke execute on function set_empty_section_hidden(uuid, text, boolean) from public, anon;
grant execute on function set_empty_section_hidden(uuid, text, boolean) to authenticated;

-- ============================================================
-- SEED DATA — section_definitions / field_definitions for 'asd_child'
-- This is the only profile_type in use right now. New profile types
-- (e.g. a future 'deaf_child') are added purely as new rows here —
-- no schema change required.
-- ============================================================

insert into section_definitions (profile_type, section_key, label_key, repeatable, render_hint, sort_order) values
  ('asd_child', 'alerts',           'child.sections.alerts',           true,  'alert_bar',    10),
  ('asd_child', 'contacts',         'child.sections.emergencyContacts',true,  'contact_list', 20),
  ('asd_child', 'communication',    'child.sections.communication',    false, 'single',       30),
  ('asd_child', 'triggers',         'child.sections.triggers',         true,  'list',         40),
  ('asd_child', 'sensory',          'child.sections.sensoryProfile',   true,  'list',         50),
  ('asd_child', 'routines',         'child.sections.routines',         true,  'list',         60),
  ('asd_child', 'medications',      'child.medical.medications',       true,  'list',         70),
  ('asd_child', 'conditions',       'child.medical.conditions',        true,  'list',         71),
  ('asd_child', 'doctors',          'child.medical.doctors',           true,  'list',         72),
  ('asd_child', 'behavioral_notes', 'child.sections.behavioralNotes',  false, 'single',       80),
  ('asd_child', 'education',        'child.sections.educationalInfo',  false, 'single',       90)
on conflict (profile_type, section_key) do nothing;

-- Shared-page titles / grouping (idempotent — applies to existing rows too).
update section_definitions set share_label_key = v.share_label_key, share_group_label_key = v.group_key
from (values
  ('contacts',         'sharedPage.sections.moreContacts',   null),
  ('triggers',         'sharedPage.sections.allTriggers',    null),
  ('sensory',          'sharedPage.sensorySections.title',   null),
  ('routines',         'sharedPage.sections.routines',       null),
  ('medications',      'sharedPage.sections.medications',    'sharedPage.sections.medical'),
  ('conditions',       'sharedPage.sections.conditions',     'sharedPage.sections.medical'),
  ('doctors',          'sharedPage.sections.doctors',        'sharedPage.sections.medical'),
  ('behavioral_notes', 'sharedPage.sections.behavioral',     null)
) as v(section_key, share_label_key, group_key)
where section_definitions.profile_type = 'asd_child'
  and section_definitions.section_key = v.section_key;

-- alerts
insert into field_definitions (section_id, field_key, label_key, field_type, options, required, translatable, sort_order)
select id, 'alert_type', 'child.alerts.alertType', 'select',
  '[{"value":"food_allergy","label_key":"sharedPage.alertTypes.food_allergy"},
    {"value":"epilepsy","label_key":"sharedPage.alertTypes.epilepsy"},
    {"value":"diabetes","label_key":"sharedPage.alertTypes.diabetes"},
    {"value":"asthma","label_key":"sharedPage.alertTypes.asthma"},
    {"value":"elopement_risk","label_key":"sharedPage.alertTypes.elopement_risk"},
    {"value":"non_swimmer","label_key":"sharedPage.alertTypes.non_swimmer"},
    {"value":"heart_condition","label_key":"sharedPage.alertTypes.heart_condition"},
    {"value":"custom","label_key":"sharedPage.alertTypes.custom"}]'::jsonb,
  true, false, 10
from section_definitions where profile_type = 'asd_child' and section_key = 'alerts'
on conflict (section_id, field_key) do nothing;

-- label is only stored for alert_type = 'custom' (parent-authored text, so
-- translatable); built-in types are labelled from the alert_type option's
-- label_key at render time and never store a label.
insert into field_definitions (section_id, field_key, label_key, field_type, translatable, sort_order)
select id, 'label', 'child.alerts.alertLabel', 'text', true, 20
from section_definitions where profile_type = 'asd_child' and section_key = 'alerts'
on conflict (section_id, field_key) do nothing;

update field_definitions set translatable = true
where field_key = 'label'
  and section_id in (select id from section_definitions where profile_type = 'asd_child' and section_key = 'alerts');

insert into field_definitions (section_id, field_key, label_key, field_type, options, required, translatable, sort_order)
select id, 'severity', 'child.alerts.severity', 'severity_enum',
  '[{"value":"red","label_key":"sharedPage.alertTypes.severityRed"},{"value":"orange","label_key":"sharedPage.alertTypes.severityOrange"}]'::jsonb,
  true, false, 30
from section_definitions where profile_type = 'asd_child' and section_key = 'alerts'
on conflict (section_id, field_key) do nothing;

insert into field_definitions (section_id, field_key, label_key, placeholder_key, field_type, translatable, sort_order)
select id, 'note', 'child.alerts.note', 'child.alerts.notePlaceholder', 'longtext', true, 40
from section_definitions where profile_type = 'asd_child' and section_key = 'alerts'
on conflict (section_id, field_key) do nothing;

-- contacts
insert into field_definitions (section_id, field_key, label_key, placeholder_key, field_type, required, translatable, sort_order)
select id, 'name', 'child.contacts.name', 'child.contacts.namePlaceholder', 'text', true, false, 10
from section_definitions where profile_type = 'asd_child' and section_key = 'contacts'
on conflict (section_id, field_key) do nothing;

insert into field_definitions (section_id, field_key, label_key, placeholder_key, field_type, translatable, sort_order)
select id, 'relation', 'child.contacts.relation', 'child.contacts.relationPlaceholder', 'text', true, 20
from section_definitions where profile_type = 'asd_child' and section_key = 'contacts'
on conflict (section_id, field_key) do nothing;

insert into field_definitions (section_id, field_key, label_key, placeholder_key, field_type, required, translatable, sort_order)
select id, 'phone', 'child.contacts.phone', 'child.contacts.phonePlaceholder', 'phone', true, false, 30
from section_definitions where profile_type = 'asd_child' and section_key = 'contacts'
on conflict (section_id, field_key) do nothing;

insert into field_definitions (section_id, field_key, label_key, field_type, sort_order)
select id, 'priority', 'child.contacts.priority', 'priority_int', 40
from section_definitions where profile_type = 'asd_child' and section_key = 'contacts'
on conflict (section_id, field_key) do nothing;

-- communication (single entry)
insert into field_definitions (section_id, field_key, label_key, field_type, options, required, translatable, sort_order)
select id, 'level', 'child.communication.level', 'select',
  '[{"value":"verbal","label_key":"sharedPage.communicationLevels.verbal"},
    {"value":"limited_verbal","label_key":"sharedPage.communicationLevels.limited_verbal"},
    {"value":"non_verbal","label_key":"sharedPage.communicationLevels.non_verbal"}]'::jsonb,
  true, false, 10
from section_definitions where profile_type = 'asd_child' and section_key = 'communication'
on conflict (section_id, field_key) do nothing;

insert into field_definitions (section_id, field_key, label_key, field_type, translatable, sort_order)
select id, 'uses_aac', 'child.communication.usesAac', 'boolean', false, 20
from section_definitions where profile_type = 'asd_child' and section_key = 'communication'
on conflict (section_id, field_key) do nothing;

-- aac_device is a product/device name (e.g. "Proloquo2Go") — not translatable content.
insert into field_definitions (section_id, field_key, label_key, placeholder_key, field_type, translatable, sort_order)
select id, 'aac_device', 'child.communication.deviceName', 'child.communication.devicePlaceholder', 'text', false, 30
from section_definitions where profile_type = 'asd_child' and section_key = 'communication'
on conflict (section_id, field_key) do nothing;

insert into field_definitions (section_id, field_key, label_key, field_type, translatable, sort_order)
select id, 'echolalia', 'child.communication.echolalia', 'boolean', false, 40
from section_definitions where profile_type = 'asd_child' and section_key = 'communication'
on conflict (section_id, field_key) do nothing;

insert into field_definitions (section_id, field_key, label_key, placeholder_key, field_type, translatable, sort_order)
select id, 'instructions', 'child.communication.instructions', 'child.communication.instructionPlaceholder', 'text_list', true, 50
from section_definitions where profile_type = 'asd_child' and section_key = 'communication'
on conflict (section_id, field_key) do nothing;

update field_definitions set placeholder_key = 'child.communication.instructionPlaceholder'
where field_key = 'instructions' and placeholder_key is null
  and section_id in (select id from section_definitions where profile_type = 'asd_child' and section_key = 'communication');

-- triggers
insert into field_definitions (section_id, field_key, label_key, placeholder_key, field_type, required, translatable, sort_order)
select id, 'trigger_text', 'child.triggers.triggerPlaceholder', 'child.triggers.triggerPlaceholder', 'text', true, true, 10
from section_definitions where profile_type = 'asd_child' and section_key = 'triggers'
on conflict (section_id, field_key) do nothing;

insert into field_definitions (section_id, field_key, label_key, placeholder_key, field_type, translatable, sort_order)
select id, 'de_escalation', 'child.triggers.deEscalationPlaceholder', 'child.triggers.deEscalationPlaceholder', 'longtext', true, 20
from section_definitions where profile_type = 'asd_child' and section_key = 'triggers'
on conflict (section_id, field_key) do nothing;

-- sensory
insert into field_definitions (section_id, field_key, label_key, field_type, options, required, translatable, sort_order)
select id, 'sensory_type', 'child.sensory.sensoryType', 'select',
  '[{"value":"sound","label_key":"sharedPage.sensorySections.sound"},
    {"value":"light","label_key":"sharedPage.sensorySections.light"},
    {"value":"touch","label_key":"sharedPage.sensorySections.touch"},
    {"value":"smell","label_key":"sharedPage.sensorySections.smell"},
    {"value":"taste","label_key":"sharedPage.sensorySections.taste"},
    {"value":"movement","label_key":"sharedPage.sensorySections.movement"}]'::jsonb,
  true, false, 10
from section_definitions where profile_type = 'asd_child' and section_key = 'sensory'
on conflict (section_id, field_key) do nothing;

insert into field_definitions (section_id, field_key, label_key, placeholder_key, field_type, translatable, sort_order)
select id, 'note', 'child.sensory.detailsPlaceholder', 'child.sensory.detailsPlaceholder', 'longtext', true, 20
from section_definitions where profile_type = 'asd_child' and section_key = 'sensory'
on conflict (section_id, field_key) do nothing;

-- routines
insert into field_definitions (section_id, field_key, label_key, placeholder_key, field_type, required, translatable, sort_order)
select id, 'description', 'child.routines.descriptionPlaceholder', 'child.routines.descriptionPlaceholder', 'text', true, true, 10
from section_definitions where profile_type = 'asd_child' and section_key = 'routines'
on conflict (section_id, field_key) do nothing;

insert into field_definitions (section_id, field_key, label_key, placeholder_key, field_type, translatable, sort_order)
select id, 'disruption_note', 'child.routines.disruptionPlaceholder', 'child.routines.disruptionPlaceholder', 'longtext', true, 20
from section_definitions where profile_type = 'asd_child' and section_key = 'routines'
on conflict (section_id, field_key) do nothing;

-- medications
insert into field_definitions (section_id, field_key, label_key, placeholder_key, field_type, required, translatable, sort_order)
select id, 'name', 'child.medical.medicationName', 'child.medical.medNamePlaceholder', 'text', true, false, 10
from section_definitions where profile_type = 'asd_child' and section_key = 'medications'
on conflict (section_id, field_key) do nothing;

insert into field_definitions (section_id, field_key, label_key, placeholder_key, field_type, translatable, sort_order)
select id, 'dose', 'child.medical.dose', 'child.medical.dosePlaceholder', 'text', false, 20
from section_definitions where profile_type = 'asd_child' and section_key = 'medications'
on conflict (section_id, field_key) do nothing;

insert into field_definitions (section_id, field_key, label_key, placeholder_key, field_type, translatable, sort_order)
select id, 'frequency', 'child.medical.frequency', 'child.medical.frequencyPlaceholder', 'text', false, 30
from section_definitions where profile_type = 'asd_child' and section_key = 'medications'
on conflict (section_id, field_key) do nothing;

insert into field_definitions (section_id, field_key, label_key, placeholder_key, field_type, translatable, sort_order)
select id, 'note', 'child.alerts.note', 'child.alerts.noteOptional', 'longtext', false, 40
from section_definitions where profile_type = 'asd_child' and section_key = 'medications'
on conflict (section_id, field_key) do nothing;

-- conditions
insert into field_definitions (section_id, field_key, label_key, placeholder_key, field_type, required, translatable, sort_order)
select id, 'name', 'child.medical.conditionName', 'child.medical.conditionNamePlaceholder', 'text', true, false, 10
from section_definitions where profile_type = 'asd_child' and section_key = 'conditions'
on conflict (section_id, field_key) do nothing;

insert into field_definitions (section_id, field_key, label_key, placeholder_key, field_type, translatable, sort_order)
select id, 'note', 'child.medical.details', 'child.medical.detailsOptional', 'longtext', false, 20
from section_definitions where profile_type = 'asd_child' and section_key = 'conditions'
on conflict (section_id, field_key) do nothing;

-- doctors
insert into field_definitions (section_id, field_key, label_key, placeholder_key, field_type, required, translatable, sort_order)
select id, 'name', 'child.medical.doctorName', 'child.medical.doctorNamePlaceholder', 'text', true, false, 10
from section_definitions where profile_type = 'asd_child' and section_key = 'doctors'
on conflict (section_id, field_key) do nothing;

-- specialty is a descriptive word (e.g. "Pediatrician") — has real
-- translatable meaning, unlike the doctor's own name above.
insert into field_definitions (section_id, field_key, label_key, placeholder_key, field_type, translatable, sort_order)
select id, 'specialty', 'child.medical.specialty', 'child.medical.specialtyPlaceholder', 'text', true, 20
from section_definitions where profile_type = 'asd_child' and section_key = 'doctors'
on conflict (section_id, field_key) do nothing;

insert into field_definitions (section_id, field_key, label_key, placeholder_key, field_type, translatable, sort_order)
select id, 'phone', 'child.contacts.phone', 'child.contacts.phonePlaceholder', 'phone', false, 30
from section_definitions where profile_type = 'asd_child' and section_key = 'doctors'
on conflict (section_id, field_key) do nothing;

-- behavioral_notes (single entry)
insert into field_definitions (section_id, field_key, label_key, placeholder_key, field_type, translatable, sort_order)
select id, 'content', 'child.sections.behavioralNotes', 'child.behavioral.placeholder', 'longtext', true, 10
from section_definitions where profile_type = 'asd_child' and section_key = 'behavioral_notes'
on conflict (section_id, field_key) do nothing;

-- education (single entry)
-- school_name is a proper noun (institution name) — not translatable content.
insert into field_definitions (section_id, field_key, label_key, placeholder_key, field_type, translatable, sort_order)
select id, 'school_name', 'child.education.schoolName', 'child.education.schoolPlaceholder', 'text', false, 10
from section_definitions where profile_type = 'asd_child' and section_key = 'education'
on conflict (section_id, field_key) do nothing;

-- class_grade is a short descriptive label (e.g. "Grade 3", "Year 4") — has
-- real translatable meaning, unlike the proper-noun fields around it.
insert into field_definitions (section_id, field_key, label_key, placeholder_key, field_type, translatable, sort_order)
select id, 'class_grade', 'child.education.classGrade', 'child.education.classPlaceholder', 'text', true, 20
from section_definitions where profile_type = 'asd_child' and section_key = 'education'
on conflict (section_id, field_key) do nothing;

-- teacher_name is a person's name — not translatable content.
insert into field_definitions (section_id, field_key, label_key, placeholder_key, field_type, translatable, sort_order)
select id, 'teacher_name', 'child.education.teacherName', 'child.education.teacherPlaceholder', 'text', false, 30
from section_definitions where profile_type = 'asd_child' and section_key = 'education'
on conflict (section_id, field_key) do nothing;

-- teacher_contact is a phone number / email — not translatable content.
insert into field_definitions (section_id, field_key, label_key, placeholder_key, field_type, translatable, sort_order)
select id, 'teacher_contact', 'child.education.teacherContact', 'child.education.contactPlaceholder', 'text', false, 40
from section_definitions where profile_type = 'asd_child' and section_key = 'education'
on conflict (section_id, field_key) do nothing;

-- support_worker is a person's name — not translatable content.
insert into field_definitions (section_id, field_key, label_key, placeholder_key, field_type, translatable, sort_order)
select id, 'support_worker', 'child.education.supportWorker', 'child.education.workerPlaceholder', 'text', false, 50
from section_definitions where profile_type = 'asd_child' and section_key = 'education'
on conflict (section_id, field_key) do nothing;

insert into field_definitions (section_id, field_key, label_key, placeholder_key, field_type, translatable, sort_order)
select id, 'notes', 'child.education.notes', 'child.education.notesPlaceholder', 'longtext', false, 60
from section_definitions where profile_type = 'asd_child' and section_key = 'education'
on conflict (section_id, field_key) do nothing;

-- ============================================================
-- FUNCTION: get_shared_profile
-- The ONLY read path for the public shared page (anon or authenticated
-- non-owner) — there are no anonymous table policies (see "Anonymous
-- access" above), so this function is the enforcement point:
--   1. Requires the share token and sharing_enabled = true.
--   2. Returns only explicit columns (no select * — a future column
--      addition can't leak to anon viewers by default).
--   3. Omits hidden data server-side: personal info when its section is
--      hidden, the photo when photo_visible = false, entries whose
--      section is hidden, and any key listed in an entry's hidden_fields.
--   4. Also returns the section/field definitions for the child's
--      profile_type so the shared page can render every section from
--      data (one round trip, no separate definitions fetch).
-- ============================================================
create or replace function get_shared_profile(p_token uuid)
returns jsonb language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_child      public.children;
  v_result     jsonb;
begin
  select * into v_child
  from public.children
  where share_token = p_token and sharing_enabled = true;

  if v_child.id is null then
    return null;
  end if;

  select jsonb_build_object(
    'child', jsonb_build_object(
      'id', v_child.id,
      'share_language', v_child.share_language,
      'share_theme', v_child.share_theme,
      'profile_type', v_child.profile_type
    ),
    'personalInfo', (
      select jsonb_build_object(
        'name', pi.name,
        'date_of_birth', pi.date_of_birth,
        'pronouns', pi.pronouns,
        'photo_base64', case when pi.photo_visible then pi.photo_base64 else null end
      )
      from public.personal_info pi
      where pi.child_id = v_child.id and pi.section_visible = true
    ),
    'sections', coalesce((
      select jsonb_agg(jsonb_build_object(
        'section_key', sd.section_key,
        'label_key', sd.label_key,
        'share_label_key', sd.share_label_key,
        'share_group_label_key', sd.share_group_label_key,
        'repeatable', sd.repeatable,
        'render_hint', sd.render_hint,
        'sort_order', sd.sort_order,
        'fields', coalesce((
          select jsonb_agg(jsonb_build_object(
            'field_key', fd.field_key,
            'label_key', fd.label_key,
            'field_type', fd.field_type,
            'options', fd.options,
            'translatable', fd.translatable,
            'sort_order', fd.sort_order
          ) order by fd.sort_order)
          from public.field_definitions fd
          where fd.section_id = sd.id
        ), '[]'::jsonb)
      ) order by sd.sort_order)
      from public.section_definitions sd
      where sd.profile_type = v_child.profile_type
    ), '[]'::jsonb),
    'entries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', pe.id,
        'section_key', pe.section_key,
        'sort_order', pe.sort_order,
        -- Strip any key listed in hidden_fields out of the values blob
        -- before it ever leaves the database.
        'values', (
          select coalesce(jsonb_object_agg(kv.key, kv.value), '{}'::jsonb)
          from jsonb_each(pe.values) kv
          where not (kv.key = any(pe.hidden_fields))
        )
      ) order by pe.sort_order, pe.created_at)
      from public.profile_entries pe
      where pe.child_id = v_child.id and pe.section_visible = true
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

-- Anon + authenticated callers may invoke this — it performs its own
-- token + sharing_enabled check internally. This is the ONLY anon read path
-- into child data, which is why there are no anon table policies above.
grant execute on function get_shared_profile(uuid) to anon, authenticated;

-- ============================================================
-- HARDENING: rls_auto_enable()
-- Not defined by this file — it backs the project's `ensure_rls` event
-- trigger (ddl_command_end), which re-enables RLS on new tables in public.
-- Kept deliberately: it's a fail-closed guardrail. But it was reachable as a
-- SECURITY DEFINER function over the REST API (/rest/v1/rpc/rls_auto_enable)
-- by anon and authenticated. The event trigger fires as superuser and needs no
-- grant, so no API role needs EXECUTE.
-- If this errors with "must be owner of function", skip it — it's hardening,
-- not correctness, and the function is harmless when called by a non-owner.
-- ============================================================
do $$
begin
  execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
exception
  when undefined_function then raise notice 'rls_auto_enable() not present — skipping';
  when insufficient_privilege then raise notice 'not owner of rls_auto_enable() — skipping';
end;
$$;
