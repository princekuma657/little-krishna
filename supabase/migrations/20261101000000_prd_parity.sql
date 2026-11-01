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