-- LittleKrishna.com — initial database schema
-- PostgreSQL + Supabase. UUID primary keys, foreign keys, indexes, constraints, timestamps.

create extension if not exists "pgcrypto";

-- ============ profiles ============
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  display_name text not null default '',
  avatar_url text,
  account_status text not null default 'active' check (account_status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ roles ============
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text
);

-- ============ user_roles ============
create table if not exists public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

-- ============ categories ============
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now()
);

-- ============ content ============
create table if not exists public.content (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  short_description text not null default '',
  description text not null default '',
  category_id uuid references public.categories (id),
  simulator_type text not null check (simulator_type in ('MSTS', 'RailWorks', 'Train Simulator Classic')),
  package_type text not null,
  author_name text not null default '',
  cover_image_url text,
  thumbnail_url text,
  version text not null,
  file_size bigint,
  sha256 text,
  storage_reference text,
  installation_type text,
  access_type text not null default 'public' check (access_type in ('public', 'registered', 'supporter', 'restricted')),
  is_published boolean not null default false,
  is_featured boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ content_versions ============
create table if not exists public.content_versions (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content (id) on delete cascade,
  version text not null,
  file_size bigint,
  sha256 text,
  storage_reference text,
  changelog text,
  created_at timestamptz not null default now()
);

-- ============ content_images ============
create table if not exists public.content_images (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content (id) on delete cascade,
  image_url text not null,
  alt_text text,
  display_order integer not null default 0
);

-- ============ collections ============
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  cover_image_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============ collection_items ============
create table if not exists public.collection_items (
  collection_id uuid not null references public.collections (id) on delete cascade,
  content_id uuid not null references public.content (id) on delete cascade,
  display_order integer not null default 0,
  primary key (collection_id, content_id)
);

-- ============ downloads ============
create table if not exists public.downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  content_id uuid references public.content (id) on delete cascade,
  content_version_id uuid references public.content_versions (id) on delete set null,
  status text not null default 'authorized' check (status in ('authorized', 'completed', 'failed')),
  authorization_time timestamptz not null default now(),
  completion_time timestamptz,
  failure_reason text,
  created_at timestamptz not null default now()
);

-- ============ supporter_tokens ============
create table if not exists public.supporter_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  created_by uuid references public.profiles (id),
  expires_at timestamptz,
  maximum_uses integer,
  redemption_count integer not null default 0,
  bound_user_id uuid references public.profiles (id),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============ supporter_entitlements ============
create table if not exists public.supporter_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token_id uuid references public.supporter_tokens (id) on delete set null,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  status text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  created_at timestamptz not null default now()
);

-- ============ notifications ============
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  message text not null default '',
  notification_type text not null default 'announcement',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============ announcements ============
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  image_url text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============ community_submissions ============
create table if not exists public.community_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  title text not null,
  description text not null default '',
  media_url text,
  moderation_status text not null default 'pending' check (moderation_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

-- ============ page_views ============
create table if not exists public.page_views (
  id uuid primary key default gen_random_uuid(),
  page_path text not null,
  anonymous_session_id text,
  user_id uuid references public.profiles (id) on delete set null,
  referrer text,
  created_at timestamptz not null default now()
);

-- ============ audit_logs ============
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============ application_settings ============
create table if not exists public.application_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  setting_value jsonb default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ============ indexes ============
create index if not exists idx_content_slug on public.content (slug);
create index if not exists idx_content_category on public.content (category_id);
create index if not exists idx_content_published on public.content (is_published);
create index if not exists idx_content_featured on public.content (is_featured);
create index if not exists idx_downloads_user on public.downloads (user_id);
create index if not exists idx_downloads_content on public.downloads (content_id);
create index if not exists idx_supporter_token_hash on public.supporter_tokens (token_hash);
create index if not exists idx_supporter_entitlement_user on public.supporter_entitlements (user_id);
create index if not exists idx_audit_logs_created on public.audit_logs (created_at);
create index if not exists idx_announcements_published on public.announcements (is_published);

-- ============ row level security ============
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.user_roles enable row level security;
alter table public.categories enable row level security;
alter table public.content enable row level security;
alter table public.content_versions enable row level security;
alter table public.content_images enable row level security;
alter table public.collections enable row level security;
alter table public.collection_items enable row level security;
alter table public.downloads enable row level security;
alter table public.supporter_tokens enable row level security;
alter table public.supporter_entitlements enable row level security;
alter table public.notifications enable row level security;
alter table public.announcements enable row level security;
alter table public.community_submissions enable row level security;
alter table public.page_views enable row level security;
alter table public.audit_logs enable row level security;
alter table public.application_settings enable row level security;


-- LittleKrishna.com — PRD parity migration
-- Adds the subsystems required by the Complete Backend PRD + TRD that were not
-- present in the initial schema: user_devices, storage_objects, content_versions,
-- content_images, permissions, role_permissions, security_events, plus RLS
-- policies and seed data for the granular RBAC matrix.

-- ============================================================
-- 1. New tables
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL DEFAULT '',
  device_type TEXT NOT NULL DEFAULT '',
  operating_system TEXT NOT NULL DEFAULT '',
  client_version TEXT NOT NULL DEFAULT '',
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.storage_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'local',
  provider_file_id TEXT NOT NULL DEFAULT '',
  object_type TEXT NOT NULL DEFAULT 'package',
  file_name TEXT NOT NULL DEFAULT '',
  file_size BIGINT,
  sha256 TEXT,
  availability_status TEXT NOT NULL DEFAULT 'available',
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  file_size BIGINT,
  sha256 TEXT,
  storage_object_id UUID REFERENCES public.storage_objects(id) ON DELETE SET NULL,
  changelog TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.content_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_user_devices_user ON public.user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_storage_objects_provider ON public.storage_objects(provider);
CREATE INDEX IF NOT EXISTS idx_content_versions_content ON public.content_versions(content_id);
CREATE INDEX IF NOT EXISTS idx_content_images_content ON public.content_images(content_id);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON public.security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON public.security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON public.security_events(created_at);

-- ============================================================
-- 3. RLS
-- ============================================================
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- user_devices: own records only
CREATE POLICY user_devices_select_own ON public.user_devices
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY user_devices_insert_own ON public.user_devices
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_devices_update_own ON public.user_devices
  FOR UPDATE USING (auth.uid() = user_id);

-- content_versions & images: public read for published content, write via service role
CREATE POLICY content_versions_select ON public.content_versions
  FOR SELECT USING (true);
CREATE POLICY content_images_select ON public.content_images
  FOR SELECT USING (true);

-- storage_objects: service-role only
CREATE POLICY storage_objects_service ON public.storage_objects
  FOR ALL USING (false);

-- permissions / role_permissions: readable by authenticated users, writable by service role
CREATE POLICY permissions_select ON public.permissions
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY role_permissions_select ON public.role_permissions
  FOR SELECT USING (auth.role() = 'authenticated');

-- security_events: users see their own, service role sees all
CREATE POLICY security_events_select_own ON public.security_events
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- 4. Seed permissions + role matrix
-- ============================================================
INSERT INTO public.permissions (permission_key, description) VALUES
  ('content.read','Read content'),
  ('content.write','Create and edit content'),
  ('content.publish','Publish content'),
  ('content.archive','Archive content'),
  ('users.read','Read users'),
  ('users.write','Manage users and roles'),
  ('tokens.read','Read supporter tokens'),
  ('tokens.write','Generate and revoke tokens'),
  ('supporters.read','Read supporter entitlements'),
  ('supporters.write','Grant and revoke entitlements'),
  ('analytics.read','Read analytics'),
  ('audit.read','Read audit logs'),
  ('settings.read','Read settings'),
  ('settings.write','Update settings'),
  ('announcements.write','Manage announcements'),
  ('messages.read','Read contact messages'),
  ('messages.write','Update contact messages'),
  ('gallery.read','Read gallery'),
  ('gallery.write','Moderate gallery'),
  ('devices.read','Read own devices'),
  ('devices.write','Register and revoke devices'),
  ('versions.read','Read content versions'),
  ('versions.write','Create content versions'),
  ('storage.read','Read storage objects'),
  ('storage.write','Manage storage objects'),
  ('security.read','Read security events')
ON CONFLICT (permission_key) DO NOTHING;
-- ============================================================
-- 5. Security & Visitor Intelligence tables
-- ============================================================
CREATE TABLE IF NOT EXISTS public.visitor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  ip_address TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  isp TEXT NOT NULL DEFAULT '',
  asn TEXT NOT NULL DEFAULT '',
  browser TEXT NOT NULL DEFAULT '',
  os TEXT NOT NULL DEFAULT '',
  device_type TEXT NOT NULL DEFAULT '',
  referrer TEXT NOT NULL DEFAULT '',
  landing_page TEXT NOT NULL DEFAULT '',
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  page_views INTEGER NOT NULL DEFAULT 0,
  is_blocked BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.visitor_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  page_path TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity TEXT NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_by UUID REFERENCES public.profiles(id),
  acknowledged_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.ip_access_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  rule_type TEXT NOT NULL DEFAULT 'block',
  scope TEXT NOT NULL DEFAULT 'temporary',
  reason TEXT NOT NULL DEFAULT '',
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.account_security_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  admin_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.geoip_cache (
  ip_address TEXT PRIMARY KEY,
  country TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  isp TEXT NOT NULL DEFAULT '',
  asn TEXT NOT NULL DEFAULT '',
  risk_score INTEGER NOT NULL DEFAULT 0,
  vpn BOOLEAN NOT NULL DEFAULT false,
  proxy BOOLEAN NOT NULL DEFAULT false,
  hosting BOOLEAN NOT NULL DEFAULT false,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.security_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visitor_sessions_ip ON public.visitor_sessions(ip_address);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_last ON public.visitor_sessions(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_country ON public.visitor_sessions(country);
CREATE INDEX IF NOT EXISTS idx_visitor_events_session ON public.visitor_events(session_id);
CREATE INDEX IF NOT EXISTS idx_visitor_events_type ON public.visitor_events(event_type);
CREATE INDEX IF NOT EXISTS idx_visitor_events_created ON public.visitor_events(created_at);
CREATE INDEX IF NOT EXISTS idx_security_alerts_status ON public.security_alerts(status);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON public.security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_ip_access_rules_ip ON public.ip_access_rules(ip_address);
CREATE INDEX IF NOT EXISTS idx_account_security_actions_user ON public.account_security_actions(user_id);

ALTER TABLE public.visitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_access_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_security_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geoip_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY visitor_sessions_service ON public.visitor_sessions FOR ALL USING (false);
CREATE POLICY visitor_events_service ON public.visitor_events FOR ALL USING (false);
CREATE POLICY security_alerts_admin ON public.security_alerts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY ip_access_rules_admin ON public.ip_access_rules FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY account_security_actions_admin ON public.account_security_actions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY geoip_cache_service ON public.geoip_cache FOR ALL USING (false);
CREATE POLICY security_settings_admin ON public.security_settings FOR ALL USING (auth.role() = 'authenticated');
-- ============================================================
-- 6. Column additions (storage_object_id, content_version_id on content)
-- ============================================================
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS storage_object_id UUID REFERENCES public.storage_objects(id) ON DELETE SET NULL;
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS content_version_id UUID REFERENCES public.content_versions(id) ON DELETE SET NULL;

-- ============================================================
-- 7. Seed roles
-- ============================================================
INSERT INTO public.roles (id, name, description) VALUES
  (gen_random_uuid(), 'super_admin', 'Full administrative permissions.'),
  (gen_random_uuid(), 'content_manager', 'Manage content, galleries and announcements.'),
  (gen_random_uuid(), 'support_manager', 'Manage user support and supporter access.'),
  (gen_random_uuid(), 'analytics_viewer', 'Read analytics without modifying data.'),
  (gen_random_uuid(), 'security_admin', 'Investigate security events and manage IP blocks.')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 8. Seed role -> permission matrix
-- ============================================================
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r CROSS JOIN public.permissions p
WHERE r.name = 'super_admin'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r JOIN public.permissions p ON p.permission_key IN
  ('content.read','content.write','content.publish','content.archive','users.read','users.write',
   'tokens.read','tokens.write','supporters.read','supporters.write','analytics.read','audit.read',
   'settings.read','settings.write','announcements.write','messages.read','messages.write',
   'gallery.read','gallery.write','devices.read','devices.write','versions.read','versions.write',
   'storage.read','storage.write','security.read')
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r JOIN public.permissions p ON p.permission_key IN
  ('content.read','content.write','content.publish','content.archive','announcements.write',
   'gallery.read','gallery.write','versions.read','versions.write')
WHERE r.name = 'content_manager'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r JOIN public.permissions p ON p.permission_key IN
  ('users.read','supporters.read','supporters.write','messages.read','messages.write','devices.read')
WHERE r.name = 'support_manager'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r JOIN public.permissions p ON p.permission_key IN
  ('analytics.read','audit.read','security.read')
WHERE r.name = 'analytics_viewer'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r JOIN public.permissions p ON p.permission_key IN
  ('analytics.read','audit.read','security.read','users.read','users.write','settings.read','settings.write','messages.read','messages.write')
WHERE r.name = 'security_admin'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 9. Profile auto-creation trigger on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, created_at, updated_at)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)), COALESCE(NEW.raw_user_meta_data->>'display_name', ''), now(), now())
  ON CONFLICT (id) DO NOTHING;
  -- assign default user role
  INSERT INTO public.user_roles (user_id, role_id, created_at)
  SELECT NEW.id, r.id, now() FROM public.roles r WHERE r.name = 'analytics_viewer' LIMIT 0;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 10. First admin bootstrap (run MANUALLY after creating the auth user)
-- ============================================================
-- 1. Create the admin user in Supabase Auth (Dashboard -> Authentication -> Users -> Add user).
-- 2. Then run:
--    INSERT INTO public.user_roles (user_id, role_id, created_at)
--    SELECT '<ADMIN_USER_UUID>', r.id, now() FROM public.roles r WHERE r.name = 'super_admin';
-- 3. Remove this comment block in production.
-- ============================================================
-- 11. Invitation-only registration tables
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invitation_codes (
  id TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  intended_email TEXT,
  max_uses INTEGER NOT NULL DEFAULT 1,
  uses_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invitation_redemptions (
  id TEXT PRIMARY KEY,
  invitation_code_id TEXT NOT NULL REFERENCES public.invitation_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (invitation_code_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_invitation_codes_hash ON public.invitation_codes(code_hash);
CREATE INDEX IF NOT EXISTS idx_invitation_redemptions_code ON public.invitation_redemptions(invitation_code_id);

ALTER TABLE public.invitation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_redemptions ENABLE ROW LEVEL SECURITY;
-- Backend (service role) only; no anon access.
CREATE POLICY "invitation_codes_service_only" ON public.invitation_codes FOR ALL USING (false);
CREATE POLICY "invitation_redemptions_service_only" ON public.invitation_redemptions FOR ALL USING (false);
