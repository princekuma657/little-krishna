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
