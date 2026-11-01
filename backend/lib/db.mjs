import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { hashPassword, hashToken, randomToken, uuid, nowIso } from './security.mjs';
import { ensureDemoPackage } from './zip.mjs';

const DATA_DIR = path.resolve(process.cwd(), 'backend/data');
fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(path.join(DATA_DIR, 'littlekrishna.db'));

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  avatar_color TEXT NOT NULL DEFAULT '#c6a56a',
  account_status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  last_active_at TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS content (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  category_id TEXT REFERENCES categories(id),
  category_label TEXT NOT NULL DEFAULT '',
  simulator_type TEXT NOT NULL,
  package_type TEXT NOT NULL DEFAULT '',
  author_name TEXT NOT NULL DEFAULT '',
  art_from TEXT NOT NULL DEFAULT '#0b1622',
  art_to TEXT NOT NULL DEFAULT '#123047',
  art_accent TEXT NOT NULL DEFAULT '#c6a56a',
  gallery_json TEXT NOT NULL DEFAULT '[]',
  version TEXT NOT NULL DEFAULT '1.0.0',
  release_date TEXT NOT NULL,
  release_notes TEXT NOT NULL DEFAULT '',
  installation TEXT NOT NULL DEFAULT '',
  file_size INTEGER,
  sha256 TEXT,
  storage_reference TEXT,
  access_type TEXT NOT NULL DEFAULT 'public',
  is_published INTEGER NOT NULL DEFAULT 0,
  is_featured INTEGER NOT NULL DEFAULT 0,
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  art_from TEXT NOT NULL DEFAULT '#101820',
  art_to TEXT NOT NULL DEFAULT '#22303f',
  art_accent TEXT NOT NULL DEFAULT '#c62b30',
  is_published INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS collection_items (
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (collection_id, content_id)
);

CREATE TABLE IF NOT EXISTS downloads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'authorized',
  authorization_time TEXT NOT NULL,
  completion_time TEXT,
  failure_reason TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS supporter_tokens (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  created_by TEXT REFERENCES profiles(id),
  expires_at TEXT,
  maximum_uses INTEGER,
  redemption_count INTEGER NOT NULL DEFAULT 0,
  bound_user_id TEXT REFERENCES profiles(id),
  revoked_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS supporter_entitlements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token_id TEXT REFERENCES supporter_tokens(id),
  starts_at TEXT NOT NULL,
  expires_at TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  notification_type TEXT NOT NULL DEFAULT 'announcement',
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  kind TEXT NOT NULL DEFAULT 'release',
  is_published INTEGER NOT NULL DEFAULT 0,
  published_at TEXT,
  created_at TEXT NOT NULL,
  archived_at TEXT
);

CREATE TABLE IF NOT EXISTS community_submissions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  media_url TEXT,
  moderation_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS community_creators (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  handle TEXT NOT NULL,
  simulator TEXT NOT NULL,
  focus TEXT NOT NULL,
  project_title TEXT NOT NULL,
  art_from TEXT NOT NULL,
  art_to TEXT NOT NULL,
  art_accent TEXT NOT NULL,
  likes INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS page_views (
  id TEXT PRIMARY KEY,
  page_path TEXT NOT NULL,
  anonymous_session_id TEXT,
  user_id TEXT,
  referrer TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS application_settings (
  id TEXT PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  handled_at TEXT
);

CREATE TABLE IF NOT EXISTS user_devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL DEFAULT '',
  device_type TEXT NOT NULL DEFAULT '',
  operating_system TEXT NOT NULL DEFAULT '',
  client_version TEXT NOT NULL DEFAULT '',
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS storage_objects (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'local',
  provider_file_id TEXT NOT NULL DEFAULT '',
  object_type TEXT NOT NULL DEFAULT 'package',
  file_name TEXT NOT NULL DEFAULT '',
  file_size INTEGER,
  sha256 TEXT,
  availability_status TEXT NOT NULL DEFAULT 'available',
  last_verified_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS content_versions (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  file_size INTEGER,
  sha256 TEXT,
  storage_object_id TEXT REFERENCES storage_objects(id) ON DELETE SET NULL,
  changelog TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS content_images (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  permission_key TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS visitor_sessions (
  id TEXT PRIMARY KEY,
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
  user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  page_views INTEGER NOT NULL DEFAULT 0,
  is_blocked INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS visitor_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  page_path TEXT NOT NULL DEFAULT '',
  metadata TEXT NOT NULL DEFAULT '{}',
  ip_address TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS security_alerts (
  id TEXT PRIMARY KEY,
  severity TEXT NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  metadata TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL,
  acknowledged_by TEXT REFERENCES profiles(id),
  acknowledged_at TEXT
);

CREATE TABLE IF NOT EXISTS ip_access_rules (
  id TEXT PRIMARY KEY,
  ip_address TEXT NOT NULL,
  rule_type TEXT NOT NULL DEFAULT 'block',
  scope TEXT NOT NULL DEFAULT 'temporary',
  reason TEXT NOT NULL DEFAULT '',
  expires_at TEXT,
  created_by TEXT REFERENCES profiles(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS account_security_actions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  admin_id TEXT REFERENCES profiles(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS geoip_cache (
  ip_address TEXT PRIMARY KEY,
  country TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  isp TEXT NOT NULL DEFAULT '',
  asn TEXT NOT NULL DEFAULT '',
  risk_score INTEGER NOT NULL DEFAULT 0,
  vpn INTEGER NOT NULL DEFAULT 0,
  proxy INTEGER NOT NULL DEFAULT 0,
  hosting INTEGER NOT NULL DEFAULT 0,
  cached_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS security_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS storage_provider_settings (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'local',
  setting_key TEXT NOT NULL,
  setting_value TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL,
  UNIQUE(provider, setting_key)
);

CREATE TABLE IF NOT EXISTS security_events (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_visitor_sessions_ip ON visitor_sessions(ip_address);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_last ON visitor_sessions(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_country ON visitor_sessions(country);
CREATE INDEX IF NOT EXISTS idx_visitor_events_session ON visitor_events(session_id);
CREATE INDEX IF NOT EXISTS idx_visitor_events_type ON visitor_events(event_type);
CREATE INDEX IF NOT EXISTS idx_visitor_events_created ON visitor_events(created_at);
CREATE INDEX IF NOT EXISTS idx_security_alerts_status ON security_alerts(status);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_ip_access_rules_ip ON ip_access_rules(ip_address);
CREATE INDEX IF NOT EXISTS idx_account_security_actions_user ON account_security_actions(user_id);

CREATE INDEX IF NOT EXISTS idx_contact_created ON contact_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_contact_status ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_user_devices_user ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_content_versions_content ON content_versions(content_id);
CREATE INDEX IF NOT EXISTS idx_content_images_content ON content_images(content_id);
CREATE INDEX IF NOT EXISTS idx_storage_objects_provider ON storage_objects(provider);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at);

CREATE INDEX IF NOT EXISTS idx_content_slug ON content(slug);
CREATE INDEX IF NOT EXISTS idx_content_category ON content(category_id);
CREATE INDEX IF NOT EXISTS idx_content_published ON content(is_published);
CREATE INDEX IF NOT EXISTS idx_downloads_user ON downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_token_hash ON supporter_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_entitlements_user ON supporter_entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(is_published);
`);

const CATEGORY_SEED = [
  ['cat_routes', 'Routes', 'routes', 'Indian railway routes recreated for simulation.'],
  ['cat_trains', 'Trains', 'trains', 'Passenger, freight and special express services.'],
  ['cat_locomotives', 'Locomotives', 'locomotives', 'Steam and diesel traction recreated by community authors.'],
  ['cat_assets', 'Assets', 'assets', 'Scenery, stations, rolling stock and utilities.'],
  ['cat_community', 'Community', 'community', 'Creator projects and fan development stories.'],
  ['cat_gallery', 'Gallery', 'gallery', 'Photographic and artistic railway imagery.'],
];

const CONTENT_SEED = [
  {
    id: 'c1', title: 'Kolkata To Delhi Grand Chord', slug: 'kolkata-delhi-grand-chord',
    short: 'The 1,400 kilometre trunk route across India\'s industrial heartland, modelled end to end for MSTS.',
    description: 'Our flagship route. The Kolkata to Delhi Grand Chord, recreated at scale across the full corridor. Curve-by-curve alignment data, stations, freight corridors and the industrial belt scenery are all included. Built in collaboration with Indian railway simulation authors.',
    category: 'cat_routes', categoryLabel: 'Route', simulator: 'MSTS', packageType: 'Route', author: 'LittleKrishna Workshop',
    art: ['#0b1622', '#123047', '#c6a56a'],
    gallery: [['#0e1c2b', '#173a55', '#c62b30'], ['#10241f', '#1c4036', '#c6a56a'], ['#241310', '#4a1d20', '#c62b30']],
    version: '3.2.1', releaseDate: '2026-09-14',
    notes: 'Added Howrah yard scenery pack and corrected curve radii on the Shantiniketan section.',
    installation: 'Install the route package, then drop the included scenery folders into the route root.',
    fileSize: 18432, access: 'public', featured: 1, downloads: 1284,
  },
  {
    id: 'c2', title: 'Deccan Queen', slug: 'deccan-queen',
    short: 'Mumbai to Goa\'s lifeline, recreated with coastal scenery and full route operations.',
    description: 'The Deccan Queen, recreated between Mumbai CST and Goa. Coastal vegetation, harbour approaches and the full passenger consist are modelled. Ideal first route for new MSTS users.',
    category: 'cat_trains', categoryLabel: 'Passenger Train', simulator: 'MSTS', packageType: 'Train', author: 'Krishna Lines Studio',
    art: ['#131a24', '#27405c', '#c62b30'],
    gallery: [['#0f1c26', '#1d3a4e', '#c6a56a'], ['#12262b', '#1f5246', '#c62b30']],
    version: '2.4.0', releaseDate: '2026-08-02',
    notes: 'New coastal scenery tiles and improved consist editor compatibility.',
    installation: 'Copy the train folder into the MSTS route trains directory.',
    fileSize: 9216, access: 'public', featured: 1, downloads: 2140,
  },
  {
    id: 'c3', title: 'Fairy Queen', slug: 'fairy-queen',
    short: 'Imperial-era steam traction through Rajasthan, from the 1853 Great Indian Peninsula Railway.',
    description: 'The East Indian Railway\'s Fairy Queen, recreated in MSTS with period-correct coaching stock and the golden desert of Rajasthan.',
    category: 'cat_locomotives', categoryLabel: 'Steam Locomotive', simulator: 'MSTS', packageType: 'Locomotive', author: 'Steam Heritage Works',
    art: ['#241a08', '#5a3d12', '#c6a56a'],
    gallery: [['#2a1d0a', '#6b4a14', '#c62b30']],
    version: '1.9.3', releaseDate: '2026-06-21',
    notes: 'Fixed steam pressure gauge animation timing.',
    installation: 'Place the locomotive and tender into the MSTS locomotives folder.',
    fileSize: 2048, access: 'public', featured: 0, downloads: 862,
  },
  {
    id: 'c4', title: 'Shatabdi Express', slug: 'shatabdi-express',
    short: 'India\'s fastest daytime express, fast-tracking performance tuned for simulation.',
    description: 'The New Delhi to Kanyakumari Shatabdi, recreated with high-speed traction settings and full interior fittings.',
    category: 'cat_trains', categoryLabel: 'Express Train', simulator: 'RailWorks', packageType: 'Train', author: 'Krishna Lines Studio',
    art: ['#1a1030', '#3d2a63', '#c62b30'],
    gallery: [['#191030', '#35206a', '#c6a56a'], ['#201418', '#4a2430', '#c62b30']],
    version: '4.0.2', releaseDate: '2026-09-30',
    notes: 'Initial release for RailWorks. Includes 16-car capacity profile.',
    installation: 'RailWorks content library import required.',
    fileSize: 15360, access: 'public', featured: 0, downloads: 431,
  },
  {
    id: 'c5', title: 'Wagon Workshop Asset Pack', slug: 'wagon-workshop-assets',
    short: 'Freight yards, coal stages and shunting assets for Indian freight simulation.',
    description: 'A collection of freight yard scenery, coal stage models and shunting assets authored for Indian operations.',
    category: 'cat_assets', categoryLabel: 'Asset Pack', simulator: 'RailWorks', packageType: 'Asset', author: 'LittleKrishna Workshop',
    art: ['#101820', '#22303f', '#c6a56a'],
    gallery: [['#0e1720', '#1f3342', '#c62b30']],
    version: '1.2.0', releaseDate: '2026-07-19',
    notes: 'Added twelve wagon variants and container stacking logic.',
    installation: 'Drop into the RailWorks scenery library.',
    fileSize: 12288, access: 'registered', featured: 0, downloads: 297,
  },
  {
    id: 'c6', title: 'Nilgiri Mountain Route', slug: 'nilgiri-mountain-route',
    short: 'The hill section beyond Podanur, with rack sections and tea garden scenery.',
    description: 'The Nilgiri mountain section, including rack railway stretches and misty tea garden scenery inspired by the Nilgiri Biosphere.',
    category: 'cat_routes', categoryLabel: 'Route', simulator: 'MSTS', packageType: 'Route', author: 'Nilgiri Lines Project',
    art: ['#0c1410', '#1c3527', '#c62b30'],
    gallery: [['#0d1a14', '#1f452e', '#c6a56a'], ['#101c22', '#1f4a55', '#c62b30']],
    version: '2.0.0', releaseDate: '2026-05-30',
    notes: 'New rack section and weather system integration.',
    installation: 'Requires MSTS plus the Nilgiri scenery pack.',
    fileSize: 14336, access: 'public', featured: 0, downloads: 654,
  },
  {
    id: 'c7', title: 'Mumbai Suburban MSTS Project', slug: 'mumbai-suburban-project',
    short: 'Fan-built suburban rail experience across the Mumbai peninsula.',
    description: 'A community-driven recreation of Mumbai suburban operations, with 7-car EMU formations and the harbour loop.',
    category: 'cat_community', categoryLabel: 'Community Project', simulator: 'MSTS', packageType: 'Project', author: 'Mumbai Rail Collective',
    art: ['#101522', '#1e2f52', '#c6a56a'],
    gallery: [['#0f1522', '#1e2f52', '#c62b30'], ['#14101f', '#2c1f52', '#c6a56a']],
    version: '0.9.1', releaseDate: '2026-09-05',
    notes: 'Beta. Added harbour loop and signalling prototypes.',
    installation: 'Manual install via community release notes.',
    fileSize: 20480, access: 'public', featured: 0, downloads: 1189,
  },
  {
    id: 'c8', title: 'Golden Temple At Dawn', slug: 'golden-temple-at-dawn',
    short: 'Captures and artistic study of the Harmandir Sahib at first light.',
    description: 'A photography and study submission exploring dawn light at the Golden Temple, contributed to the LittleKrishna gallery.',
    category: 'cat_gallery', categoryLabel: 'Gallery Entry', simulator: 'Train Simulator Classic', packageType: 'Photography', author: 'Community Member',
    art: ['#2b1206', '#5a2c12', '#c62b30'],
    gallery: [['#2b1206', '#5a2c12', '#c6a56a'], ['#241018', '#471e2c', '#c62b30'], ['#1c1226', '#3f2452', '#c6a56a']],
    version: '1.0.0', releaseDate: '2026-08-27',
    notes: 'Initial gallery submission.',
    installation: 'Not applicable.',
    fileSize: null, access: 'public', featured: 0, downloads: 96,
  },
  {
    id: 'c9', title: 'WDM-3 Diesel Locomotive', slug: 'wdm3-diesel-locomotive',
    short: 'The workhorse of Indian Railways, recreated for RailWorks and Train Simulator Classic.',
    description: 'The WDM-3 diesel locomotive, one of Indian Railways\' most recognisable workhorses. Supporter-exclusive with workshop-grade cab detail and custom sound pack.',
    category: 'cat_locomotives', categoryLabel: 'Diesel Locomotive', simulator: 'RailWorks', packageType: 'Locomotive', author: 'LittleKrishna Workshop',
    art: ['#1d1710', '#43321c', '#c6a56a'],
    gallery: [['#1b1208', '#3d2a12', '#c62b30'], ['#10191f', '#24333d', '#c6a56a']],
    version: '1.0.0', releaseDate: '2026-10-10',
    notes: 'First supporter-exclusive release. Includes custom horn and traction audio.',
    installation: 'RailWorks content library import. Supporter entitlement required.',
    fileSize: 6144, access: 'supporter', featured: 0, downloads: 74,
  },
  {
    id: 'c10', title: 'Station Asset Bundle', slug: 'station-asset-bundle',
    short: 'Platform furniture, signage and station architecture for Indian routes.',
    description: 'A supporter-exclusive bundle of Indian station assets: platform furniture, signage, footbridges and heritage station architecture.',
    category: 'cat_assets', categoryLabel: 'Asset Pack', simulator: 'MSTS', packageType: 'Asset', author: 'LittleKrishna Workshop',
    art: ['#101a17', '#243a32', '#c6a56a'],
    gallery: [['#0e1a17', '#1f3a32', '#c62b30']],
    version: '0.8.0', releaseDate: '2026-09-22',
    notes: 'Supporter preview build. Includes 24 platform props.',
    installation: 'Copy into the MSTS scenery folder. Supporter entitlement required.',
    fileSize: 4096, access: 'supporter', featured: 0, downloads: 41,
  },
  {
    id: 'c11', title: 'Western Ghats Development Build', slug: 'western-ghats-dev-build',
    short: 'Unpublished development build. Admin access only.',
    description: 'Internal development build for the Western Ghats route. Not for distribution.',
    category: 'cat_routes', categoryLabel: 'Route', simulator: 'MSTS', packageType: 'Route', author: 'LittleKrishna Workshop',
    art: ['#141414', '#2b2b2b', '#c62b30'],
    gallery: [],
    version: '0.1.0', releaseDate: '2026-10-30',
    notes: 'Internal build.',
    installation: 'Internal only.',
    fileSize: 100, access: 'restricted', featured: 0, downloads: 0,
  },
];

const COLLECTION_SEED = [
  {
    id: 'col1', title: 'MSTS Indian Railways', slug: 'msts-indian-railways',
    description: 'Flagship routes and traction for the Indian subcontinent.',
    art: ['#0b1622', '#123047', '#c62b30'],
    items: ['kolkata-delhi-grand-chord', 'deccan-queen', 'fairy-queen', 'nilgiri-mountain-route', 'mumbai-suburban-project'],
  },
  {
    id: 'col2', title: 'RailWorks And Train Simulator Classic', slug: 'railworks-indian-railways',
    description: 'Express traction and asset packs for the Western and Eastern lines.',
    art: ['#101820', '#22303f', '#c6a56a'],
    items: ['shatabdi-express', 'wagon-workshop-assets', 'wdm3-diesel-locomotive'],
  },
  {
    id: 'col3', title: 'Supporters Collection', slug: 'supporters-collection',
    description: 'Exclusive releases for LittleKrishna supporters.',
    art: ['#1a1408', '#3d2f16', '#c6a56a'],
    items: ['wdm3-diesel-locomotive', 'station-asset-bundle'],
  },
];

const CREATOR_SEED = [
  ['k1', 'Krishna Lines Studio', '@krishnalines', 'MSTS', 'Express & suburban traction', 'Deccan Queen', '#131a24', '#27405c', '#c62b30', 0],
  ['k2', 'Steam Heritage Works', '@steamheritage', 'MSTS', 'Imperial steam', 'Fairy Queen', '#241a08', '#5a3d12', '#c6a56a', 0],
  ['k3', 'Mumbai Rail Collective', '@mumbairail', 'RailWorks', 'Suburban operations', 'Mumbai Suburban', '#101522', '#1e2f52', '#c62b30', 0],
];

function seedIfEmpty() {
  const categoryCount = db.prepare('SELECT COUNT(*) AS n FROM categories').get().n;
  if (categoryCount > 0) return false;

  const now = nowIso();

  for (const [id, name, slug, description] of CATEGORY_SEED) {
    db.prepare('INSERT INTO categories (id, name, slug, description) VALUES (?, ?, ?, ?)').run(id, name, slug, description);
  }

  const insertContent = db.prepare(`
    INSERT INTO content (
      id, title, slug, short_description, description, category_id, category_label,
      simulator_type, package_type, author_name, art_from, art_to, art_accent, gallery_json,
      version, release_date, release_notes, installation, file_size, sha256, storage_reference,
      access_type, is_published, is_featured, download_count, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const c of CONTENT_SEED) {
    let file = null;
    let actualSizeMb = null;
    let sha256 = null;
    if (c.fileSize) {
      const packagePath = ensureDemoPackage(c.slug, c.title);
      const bytes = fs.readFileSync(packagePath);
      actualSizeMb = Math.max(0.0001, Math.round((bytes.length / (1024 * 1024)) * 10000) / 10000);
      sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
      file = `demo:${c.slug}.zip`;
    }
    insertContent.run(
      c.id, c.title, c.slug, c.short, c.description, c.category, c.categoryLabel,
      c.simulator, c.packageType, c.author, c.art[0], c.art[1], c.art[2],
      JSON.stringify(c.gallery.map(([from, to, accent]) => ({ from, to, accent }))),
      c.version, c.releaseDate, c.notes, c.installation, actualSizeMb, sha256, file,
      c.access, c.access === 'restricted' ? 0 : 1, c.featured, 0, now, now,
    );
  }

  const insertCollection = db.prepare('INSERT INTO collections (id, title, slug, description, art_from, art_to, art_accent, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, 1)');
  const insertItem = db.prepare('INSERT INTO collection_items (collection_id, content_id, display_order) VALUES (?, ?, ?)');
  for (const col of COLLECTION_SEED) {
    insertCollection.run(col.id, col.title, col.slug, col.description, col.art[0], col.art[1], col.art[2]);
    col.items.forEach((slug, index) => {
      const row = db.prepare('SELECT id FROM content WHERE slug = ?').get(slug);
      if (row) insertItem.run(col.id, row.id, index);
    });
  }

  const insertCreator = db.prepare('INSERT INTO community_creators (id, name, handle, simulator, focus, project_title, art_from, art_to, art_accent, likes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (const c of CREATOR_SEED) insertCreator.run(...c);

  db.prepare('INSERT INTO announcements (id, title, description, kind, is_published, published_at, created_at) VALUES (?, ?, ?, ?, 1, ?, ?)').run(
    'a1', 'Shatabdi Express Released', 'The Shatabdi Express is now available for RailWorks and Train Simulator Classic.', 'release', '2026-09-30', now,
  );
  db.prepare('INSERT INTO announcements (id, title, description, kind, is_published, published_at, created_at) VALUES (?, ?, ?, ?, 1, ?, ?)').run(
    'a2', 'Community Workshop Submissions Open', 'We opened the community gallery for screenshot submissions this month.', 'community', '2026-09-18', now,
  );
  db.prepare('INSERT INTO announcements (id, title, description, kind, is_published, published_at, created_at) VALUES (?, ?, ?, ?, 1, ?, ?)').run(
    'a3', 'Supporter Tokens Available', 'Supporter tokens are now issued directly by the LittleKrishna team. Redeem yours in the Supporter Zone.', 'supporter', '2026-10-02', now,
  );

  db.prepare('INSERT INTO community_submissions (id, user_id, title, description, media_url, moderation_status, created_at) VALUES (?, NULL, ?, ?, NULL, ?, ?)').run(
    's1', 'Rain over Howrah Yard', 'Monsoon operations captured at Howrah.', 'approved', now,
  );
  db.prepare('INSERT INTO community_submissions (id, user_id, title, description, media_url, moderation_status, created_at) VALUES (?, NULL, ?, ?, NULL, ?, ?)').run(
    's2', 'Monsoon Crossing', 'A crossing in the Western Ghats.', 'approved', now,
  );

  return true;
}

function seedAdmin() {
  const roleNames = [
    ['role_super', 'super_admin', 'Full administrative permissions.'],
    ['role_content', 'content_manager', 'Manage content, galleries and announcements.'],
    ['role_support', 'support_manager', 'Manage user support and supporter access.'],
    ['role_analytics', 'analytics_viewer', 'Read analytics without modifying data.'],
    ['role_security', 'security_admin', 'Investigate security events and manage IP blocks.'],
  ];
  for (const [id, name, description] of roleNames) {
    db.prepare('INSERT OR IGNORE INTO roles (id, name, description) VALUES (?, ?, ?)').run(id, name, description);
  }

  const existingAdmin = db.prepare(`
    SELECT p.* FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.id
    JOIN roles r ON r.id = ur.role_id
    WHERE r.name = 'super_admin' LIMIT 1
  `).get();

  if (existingAdmin) {
    return null;
  }

  const email = process.env.ADMIN_EMAIL || 'admin@littlekrishna.local';
  const password = process.env.ADMIN_PASSWORD || randomToken('lk_admin').replace('lk_admin_', 'Ad-');
  const now = nowIso();
  const id = uuid();

  db.prepare('INSERT INTO profiles (id, username, display_name, email, password_hash, avatar_color, account_status, created_at, last_active_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    id, 'admin', 'LittleKrishna Admin', email.toLowerCase(), hashPassword(password), '#c62b30', 'active', now, now,
  );
  db.prepare('INSERT INTO user_roles (user_id, role_id, created_at) VALUES (?, ?, ?)').run(id, 'role_super', now);

  const token = randomToken('lk_supporter');
  const tokenId = uuid();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO supporter_tokens (id, token_hash, created_by, expires_at, maximum_uses, redemption_count, created_at) VALUES (?, ?, ?, ?, 25, 0, ?)').run(
    tokenId, hashToken(token), id, expiresAt, now,
  );

  const credentialFile = path.join(DATA_DIR, 'admin-credentials.txt');
  fs.writeFileSync(
    credentialFile,
    [
      'LittleKrishna.com local development credentials',
      'Generated once at first seed. Remove this file in production.',
      '',
      `Admin email: ${email}`,
      `Admin password: ${password}`,
      '',
      `Demo supporter token (7 days, 25 uses): ${token}`,
      `Supporter token expires: ${expiresAt}`,
      '',
      'Change these values via ADMIN_EMAIL / ADMIN_PASSWORD before first run.',
    ].join('\n'),
    { mode: 0o600 },
  );

  db.prepare('INSERT INTO audit_logs (id, actor_user_id, action, target_type, target_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    uuid(), id, 'system.seed', 'platform', null, JSON.stringify({ adminEmail: email }), now,
  );

  console.log('\n[LittleKrishna] Local admin created:');
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`  Supporter token: ${token}`);
  console.log(`  Credentials saved to backend/data/admin-credentials.txt\n`);

  return { email, password, token };
}

export const firstRun = seedIfEmpty();
export const adminCredentials = seedAdmin();
