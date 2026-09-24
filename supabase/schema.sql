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
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  share_token     uuid not null unique default gen_random_uuid(),
  sharing_enabled boolean not null default false,
  share_language  text not null default 'en',
  share_theme     text not null default 'professional',
  profile_type    text not null default 'asd_child',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Safe to re-run on a database that already had `children` before
-- profile_type existed — adds the column only if it's missing.
alter table children add column if not exists profile_type text not null default 'asd_child';

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
  unique (profile_type, section_key)
);

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
create or replace function update_updated_at()
returns trigger language plpgsql as $$
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
-- Deletes cached translations for a specific entry when its
-- source content is updated. Only the changed entry is cleared —
-- all other cached translations remain intact.
--
-- field_path format (must match the translate Edge Function and
-- SharedProfilePage's tx() lookup): "{section_key}.{entry.id}.{field_key}"
-- for repeatable sections, or "{section_key}.{field_key}" for the
-- single-entry sections (communication, behavioral_notes, education) —
-- both are covered by matching on section_key + (entry id OR no id at all).
-- ============================================================
create or replace function invalidate_translation_cache()
returns trigger language plpgsql as $$
begin
  if (TG_OP = 'UPDATE') then
    delete from content_translations
    where child_id = new.child_id
      and (
        field_path like new.section_key || '.' || new.id::text || '.%'
        or field_path like new.section_key || '.%'
      );
  end if;
  return new;
end;
$$;

drop trigger if exists profile_entries_translation_invalidate on profile_entries;
create trigger profile_entries_translation_invalidate
  after update on profile_entries
  for each row execute function invalidate_translation_cache();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Helper: current authenticated user id
create or replace function auth_uid()
returns uuid language sql stable as $$
  select auth.uid();
$$;

-- Helper: does the current user own this child?
-- NOTE: if multi-guardian access is added later, only this function
-- body changes (e.g. to check a child_guardians join table) — every
-- policy across the schema that calls owns_child() keeps working
-- without modification.
create or replace function owns_child(p_child_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from children
    where id = p_child_id and user_id = auth.uid()
  );
$$;

-- Helper: is sharing enabled for this child?
-- Used for anonymous read-only access on the shared profile page.
-- Access to child_id is already gated by the children table policy
-- (which requires either ownership or anon + share token lookup).
create or replace function child_is_shared(p_child_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from children
    where id = p_child_id
      and sharing_enabled = true
  );
$$;

-- Enable RLS on all tables
alter table children enable row level security;
alter table personal_info enable row level security;
alter table profile_entries enable row level security;
alter table content_translations enable row level security;
alter table share_audit_log enable row level security;

-- children: owner only, plus anon can read if sharing is enabled
drop policy if exists "owners can do everything on their children" on children;
create policy "owners can do everything on their children"
  on children for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Anyone (anon or authenticated non-owner) can read a child row if sharing is enabled.
-- Ownership is enforced by the "owners can do everything" policy above.
drop policy if exists "public read if shared" on children;
create policy "public read if shared"
  on children for select
  using (sharing_enabled = true);

-- personal_info
drop policy if exists "owner full access" on personal_info;
create policy "owner full access" on personal_info for all
  using (owns_child(child_id)) with check (owns_child(child_id));
drop policy if exists "anon read if shared" on personal_info;
create policy "anon read if shared" on personal_info for select
  using (section_visible = true and child_is_shared(child_id));

-- profile_entries — replaces what used to be ~10 separate policy pairs,
-- one per section table. Per-field hiding (hidden_fields) is filtered
-- at the application layer when serving the shared page, not here.
drop policy if exists "owner full access" on profile_entries;
create policy "owner full access" on profile_entries for all
  using (owns_child(child_id)) with check (owns_child(child_id));
drop policy if exists "anon read if shared" on profile_entries;
create policy "anon read if shared" on profile_entries for select
  using (section_visible = true and child_is_shared(child_id));

-- content_translations
drop policy if exists "owner full access" on content_translations;
create policy "owner full access" on content_translations for all
  using (owns_child(child_id)) with check (owns_child(child_id));
drop policy if exists "anon read if shared" on content_translations;
create policy "anon read if shared" on content_translations for select
  using (child_is_shared(child_id));

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
-- Anon users get SELECT on shared tables only (RLS enforces sharing_enabled).
-- ============================================================

grant select, insert, update, delete on children to authenticated;
grant select, insert, update, delete on personal_info to authenticated;
grant select, insert, update, delete on profile_entries to authenticated;
grant select, insert, update, delete on content_translations to authenticated;
grant select, insert, update, delete on user_preferences to authenticated;

-- Audit log: authenticated users read + delete (inserts via service role Edge Function)
grant select, delete on share_audit_log to authenticated;
grant select, insert on share_audit_log to service_role;

-- Anon users: select on shared tables only (RLS enforces sharing_enabled = true)
grant select on children to anon;
grant select on personal_info to anon;
grant select on profile_entries to anon;
grant select on content_translations to anon;

-- section_definitions / field_definitions: pure schema metadata, same for
-- every user regardless of who's looking or which child — no RLS needed.
-- Explicitly disabled: some Supabase projects auto-enable RLS on new tables,
-- which combined with zero policies would silently block ALL access (including
-- the owner), even with the grants above in place.
alter table section_definitions disable row level security;
alter table field_definitions disable row level security;
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
--     select-only reads inside notifyParent)
--   - delete-account: uses supabase-js admin client (auth.admin.deleteUser),
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
returns uuid language plpgsql security definer as $$
declare
  v_new_token uuid;
begin
  if not owns_child(p_child_id) then
    raise exception 'Not authorised';
  end if;

  v_new_token := gen_random_uuid();

  update children
  set share_token = v_new_token
  where id = p_child_id;

  return v_new_token;
end;
$$;

-- ============================================================
-- FUNCTION: log_share_view
-- Called from the log-share-view Edge Function (service role).
-- Direct inserts into share_audit_log bypass RLS via service role.
-- ============================================================
create or replace function log_share_view(
  p_child_id   uuid,
  p_user_agent text,
  p_latitude   double precision,
  p_longitude  double precision,
  p_geo_source text,
  p_ip_city    text,
  p_ip_country text
)
returns void language plpgsql security definer as $$
begin
  insert into share_audit_log (child_id, user_agent, latitude, longitude, geo_source, ip_city, ip_country)
  values (p_child_id, p_user_agent, p_latitude, p_longitude, p_geo_source, p_ip_city, p_ip_country);
end;
$$;

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

insert into field_definitions (section_id, field_key, label_key, field_type, translatable, sort_order)
select id, 'label', 'child.alerts.alertLabel', 'text', false, 20
from section_definitions where profile_type = 'asd_child' and section_key = 'alerts'
on conflict (section_id, field_key) do nothing;

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

insert into field_definitions (section_id, field_key, label_key, field_type, translatable, sort_order)
select id, 'instructions', 'child.communication.instructions', 'text_list', true, 50
from section_definitions where profile_type = 'asd_child' and section_key = 'communication'
on conflict (section_id, field_key) do nothing;

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
-- Server-side read path for the public shared page (anon or
-- authenticated non-owner). Replaces fetching children/personal_info/
-- profile_entries directly for the shared view:
--   1. Only returns explicit columns needed by the shared page (no
--      select * over children/personal_info — narrows what a future
--      column addition would otherwise expose by default).
--   2. Strips hidden_fields out of each entry's `values` jsonb here,
--      server-side — previously this filtering happened only in the
--      React layer, meaning the full values blob (including fields a
--      parent explicitly hid) was sent to the browser and visible via
--      devtools/Network tab on this no-login public page.
--   3. security definer + explicit sharing_enabled check lets this
--      bypass RLS safely — it is the enforcement point, so the check
--      below must stay in sync with child_is_shared()/RLS intent.
-- ============================================================
create or replace function get_shared_profile(p_token uuid)
returns jsonb language plpgsql stable security definer as $$
declare
  v_child      children;
  v_result     jsonb;
begin
  select * into v_child
  from children
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
        'photo_base64', case when pi.photo_visible then pi.photo_base64 else null end,
        'photo_visible', pi.photo_visible,
        'section_visible', pi.section_visible
      )
      from personal_info pi
      where pi.child_id = v_child.id
    ),
    'entries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', pe.id,
        'section_key', pe.section_key,
        'sort_order', pe.sort_order,
        'section_visible', pe.section_visible,
        'hidden_fields', pe.hidden_fields,
        -- Strip any key listed in hidden_fields out of the values blob
        -- before it ever leaves the database.
        'values', (
          select coalesce(jsonb_object_agg(kv.key, kv.value), '{}'::jsonb)
          from jsonb_each(pe.values) kv
          where not (kv.key = any(pe.hidden_fields))
        )
      ) order by pe.sort_order)
      from profile_entries pe
      where pe.child_id = v_child.id and pe.section_visible = true
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

-- Anon + authenticated callers may invoke this — it performs its own
-- sharing_enabled check internally, so exposing the function itself is safe.
grant execute on function get_shared_profile(uuid) to anon, authenticated;
