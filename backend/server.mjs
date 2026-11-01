// Minimal .env loader so backend/.env is honored without a dependency.
try {
  const envPath = path.resolve(process.cwd(), 'backend', '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (key && process.env[key] === undefined) process.env[key] = val;
    }
  }
} catch { /* ignore */ }

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { db } from './lib/db.mjs';
import {
  hashPassword, verifyPassword, signSession, verifySession, signDownloadToken,
  verifyDownloadToken, hashToken, randomToken, uuid, nowIso, rateLimit,
} from './lib/security.mjs';
import { ensureDemoPackage } from './lib/zip.mjs';
import { isCloudinaryConfigured, signUpload, buildUrl } from './lib/cloudinary.mjs';

const PORT = Number(process.env.PORT || 8787);
const NODE_ENV = process.env.NODE_ENV || 'development';
const STORAGE_DIR = path.resolve(process.cwd(), 'backend/storage');
const DATA_DIR = path.resolve(process.cwd(), 'backend/data');
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',').map((s) => s.trim()).filter(Boolean);
const SIMULATORS = ['MSTS', 'RailWorks', 'Train Simulator Classic'];
const ACCESS_TYPES = ['public', 'registered', 'supporter', 'restricted'];
const ALL_ROLES = ['super_admin', 'content_manager', 'support_manager', 'analytics_viewer', 'security_admin'];

db.exec(`
CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
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
CREATE INDEX IF NOT EXISTS idx_contact_created ON contact_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_contact_status ON contact_messages(status);
`);
const profileColumns = db.prepare('PRAGMA table_info(profiles)').all();
if (!profileColumns.some((c) => c.name === 'updated_at')) {
  db.exec("ALTER TABLE profiles ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''");
  db.exec('UPDATE profiles SET updated_at = last_active_at WHERE updated_at = \'\'');
}
const contentColumns = db.prepare('PRAGMA table_info(content)').all();
if (!contentColumns.some((c) => c.name === 'storage_object_id')) {
  db.exec('ALTER TABLE content ADD COLUMN storage_object_id TEXT');
}
if (!contentColumns.some((c) => c.name === 'content_version_id')) {
  db.exec('ALTER TABLE content ADD COLUMN content_version_id TEXT');
}
if (!contentColumns.some((c) => c.name === 'cover_image_url')) {
  db.exec('ALTER TABLE content ADD COLUMN cover_image_url TEXT');
}
if (!contentColumns.some((c) => c.name === 'thumbnail_url')) {
  db.exec('ALTER TABLE content ADD COLUMN thumbnail_url TEXT');
}
if (!contentColumns.some((c) => c.name === 'storage_reference_drive')) {
  db.exec('ALTER TABLE content ADD COLUMN storage_reference_drive TEXT');
}

// ---------- Granular RBAC seed ----------
const PERMISSIONS = [
  ['content.read', 'Read content'],
  ['content.write', 'Create and edit content'],
  ['content.publish', 'Publish content'],
  ['content.archive', 'Archive content'],
  ['users.read', 'Read users'],
  ['users.write', 'Manage users and roles'],
  ['tokens.read', 'Read supporter tokens'],
  ['tokens.write', 'Generate and revoke tokens'],
  ['supporters.read', 'Read supporter entitlements'],
  ['supporters.write', 'Grant and revoke entitlements'],
  ['analytics.read', 'Read analytics'],
  ['audit.read', 'Read audit logs'],
  ['settings.read', 'Read settings'],
  ['settings.write', 'Update settings'],
  ['announcements.write', 'Manage announcements'],
  ['messages.read', 'Read contact messages'],
  ['messages.write', 'Update contact messages'],
  ['gallery.read', 'Read gallery'],
  ['gallery.write', 'Moderate gallery'],
  ['devices.read', 'Read own devices'],
  ['devices.write', 'Register and revoke devices'],
  ['versions.read', 'Read content versions'],
  ['versions.write', 'Create content versions'],
  ['storage.read', 'Read storage objects'],
  ['storage.write', 'Manage storage objects'],
  ['security.read', 'Read security events'],
];
const insertPermission = db.prepare('INSERT OR IGNORE INTO permissions (id, permission_key, description) VALUES (?, ?, ?)');
for (const [key, desc] of PERMISSIONS) insertPermission.run(uuid(), key, desc);

const rolePermissionMap = {
  super_admin: PERMISSIONS.map(([k]) => k),
  admin: ['content.read', 'content.write', 'content.publish', 'content.archive', 'users.read', 'users.write', 'tokens.read', 'tokens.write', 'supporters.read', 'supporters.write', 'analytics.read', 'audit.read', 'settings.read', 'settings.write', 'announcements.write', 'messages.read', 'messages.write', 'gallery.read', 'gallery.write', 'devices.read', 'devices.write', 'versions.read', 'versions.write', 'storage.read', 'storage.write', 'security.read'],
  content_manager: ['content.read', 'content.write', 'content.publish', 'content.archive', 'announcements.write', 'gallery.read', 'gallery.write', 'versions.read', 'versions.write'],
  support_manager: ['users.read', 'supporters.read', 'supporters.write', 'messages.read', 'messages.write', 'devices.read'],
  analytics_viewer: ['analytics.read', 'audit.read', 'security.read'],
  security_admin: ['analytics.read', 'audit.read', 'security.read', 'users.read', 'users.write', 'settings.read', 'settings.write', 'messages.read', 'messages.write'],
};
const rolesRows = db.prepare('SELECT id, name FROM roles').all();
const permId = (key) => db.prepare('SELECT id FROM permissions WHERE permission_key = ?').get(key)?.id;
const insertRolePerm = db.prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
for (const role of rolesRows) {
  const keys = rolePermissionMap[role.name];
  if (!keys) continue;
  for (const key of keys) {
    const pid = permId(key);
    if (pid) insertRolePerm.run(role.id, pid);
  }
}

// Seed a content version for any content row that has none.
const versionless = db.prepare(`SELECT c.* FROM content c WHERE NOT EXISTS (SELECT 1 FROM content_versions v WHERE v.content_id = c.id)`).all();
const insertVersion = db.prepare('INSERT INTO content_versions (id, content_id, version, file_size, sha256, storage_object_id, changelog, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
for (const c of versionless) {
  insertVersion.run(uuid(), c.id, c.version, c.file_size, c.sha256, c.storage_object_id || null, 'Initial release.', c.created_at || nowIso());
}

// Seed storage_objects for content that has a storage_reference but no storage_object.
const contentWithStorage = db.prepare(`SELECT * FROM content WHERE storage_reference IS NOT NULL AND storage_reference != '' AND (storage_object_id IS NULL OR storage_object_id = '')`).all();
const insertStorage = db.prepare('INSERT INTO storage_objects (id, provider, provider_file_id, object_type, file_name, file_size, sha256, availability_status, last_verified_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
const linkStorage = db.prepare('UPDATE content SET storage_object_id = ? WHERE id = ?');
for (const c of contentWithStorage) {
  const sid = uuid();
  insertStorage.run(sid, c.storage_reference.startsWith('stored:') ? 'local' : 'demo', c.storage_reference, 'package', c.storage_reference, c.file_size, c.sha256, 'available', nowIso(), c.created_at || nowIso());
  linkStorage.run(sid, c.id);
}

function hasPermission(user, permissionKey) {
  if (!user) return false;
  const roles = getRoles(user.id);
  if (roles.includes('super_admin')) return true;
  const row = db.prepare(`
    SELECT 1 FROM role_permissions rp
    JOIN roles r ON r.id = rp.role_id
    JOIN permissions p ON p.id = rp.permission_id
    JOIN user_roles ur ON ur.role_id = r.id
    WHERE ur.user_id = ? AND p.permission_key = ?
    LIMIT 1
  `).get(user.id, permissionKey);
  return Boolean(row);
}

function logSecurityEvent(userId, eventType, severity = 'info', metadata = {}) {
  db.prepare('INSERT INTO security_events (id, user_id, event_type, severity, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(uuid(), userId || null, eventType, severity, JSON.stringify(metadata), nowIso());
}

// ---------- Security & Visitor Intelligence helpers ----------
function parseUserAgent(ua) {
  ua = String(ua || '');
  let browser = 'Unknown';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/Chrome\//.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua)) browser = 'Safari';
  else if (/OPR\//.test(ua)) browser = 'Opera';
  let os = 'Unknown';
  if (/Windows/.test(ua)) os = 'Windows';
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iOS/.test(ua)) os = 'iOS';
  else if (/Linux/.test(ua)) os = 'Linux';
  let deviceType = 'desktop';
  if (/Mobile|Android|iPhone/.test(ua)) deviceType = 'mobile';
  else if (/iPad|Tablet/.test(ua)) deviceType = 'tablet';
  return { browser, os, deviceType };
}

async function geoipLookup(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return { country: 'Local', region: 'Local', city: 'Localhost', isp: 'Local', asn: 'Local', riskScore: 0, vpn: false, proxy: false, hosting: false };
  }
  const cached = db.prepare('SELECT * FROM geoip_cache WHERE ip_address = ?').get(ip);
  if (cached && (Date.now() - Date.parse(cached.cached_at)) < 24 * 3600 * 1000) {
    return { country: cached.country, region: cached.region, city: cached.city, isp: cached.isp, asn: cached.asn, riskScore: cached.risk_score, vpn: Boolean(cached.vpn), proxy: Boolean(cached.proxy), hosting: Boolean(cached.hosting) };
  }
  let result = { country: 'Unknown', region: 'Unknown', city: 'Unknown', isp: 'Unknown', asn: 'Unknown', riskScore: 0, vpn: false, proxy: false, hosting: false };
  try {
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,regionName,city,isp,as,hosting,proxy`);
    if (res.ok) {
      const j = await res.json();
      if (j.status === 'success') {
        result = {
          country: j.country || 'Unknown', region: j.regionName || 'Unknown', city: j.city || 'Unknown',
          isp: j.isp || 'Unknown', asn: j.as || 'Unknown',
          riskScore: (j.proxy ? 40 : 0) + (j.hosting ? 25 : 0),
          vpn: false, proxy: Boolean(j.proxy), hosting: Boolean(j.hosting),
        };
      }
    }
  } catch { /* network failure: keep Unknown */ }
  db.prepare(`INSERT INTO geoip_cache (ip_address, country, region, city, isp, asn, risk_score, vpn, proxy, hosting, cached_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(ip_address) DO UPDATE SET country=excluded.country, region=excluded.region, city=excluded.city, isp=excluded.isp, asn=excluded.asn, risk_score=excluded.risk_score, vpn=excluded.vpn, proxy=excluded.proxy, hosting=excluded.hosting, cached_at=excluded.cached_at`)
    .run(ip, result.country, result.region, result.city, result.isp, result.asn, result.riskScore, result.vpn ? 1 : 0, result.proxy ? 1 : 0, result.hosting ? 1 : 0, nowIso());
  return result;
}

function isIpBlocked(ip) {
  const rule = db.prepare(`SELECT * FROM ip_access_rules WHERE ip_address = ? AND rule_type = 'block' ORDER BY created_at DESC LIMIT 1`).get(ip);
  if (!rule) return null;
  if (rule.expires_at && rule.expires_at <= nowIso()) return null;
  return rule;
}

function createSecurityAlert(severity, title, description, metadata = {}) {
  const id = uuid();
  db.prepare('INSERT INTO security_alerts (id, severity, title, description, metadata, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, severity, title, description, JSON.stringify(metadata), 'open', nowIso());
  return id;
}

function threatCheckFailedLogin(email, ip) {
  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const count = db.prepare(`SELECT COUNT(*) AS n FROM security_events WHERE event_type = 'auth.login_failed' AND created_at >= ? AND (metadata LIKE ? OR metadata LIKE ?)`).get(cutoff, `%${ip}%`, `%${email}%`).n;
  if (count >= 5) {
    const existing = db.prepare(`SELECT id FROM security_alerts WHERE title = 'Repeated failed login attempts' AND status = 'open' AND created_at >= ?`).get(cutoff);
    if (!existing) createSecurityAlert('high', 'Repeated failed login attempts', `Multiple failed sign-in attempts detected from ${ip}.`, { ip, email, count });
  }
}

function upsertVisitorSession(sessionId, ip, ua, referrer, landingPage, userId) {
  const now = nowIso();
  const geo = null; // filled async by caller if needed
  const { browser, os, deviceType } = parseUserAgent(ua);
  const existing = db.prepare('SELECT * FROM visitor_sessions WHERE session_id = ?').get(sessionId);
  if (existing) {
    db.prepare('UPDATE visitor_sessions SET last_seen_at = ?, page_views = page_views + 1, user_id = COALESCE(?, user_id) WHERE session_id = ?')
      .run(now, userId || null, sessionId);
    return existing;
  }
  db.prepare(`INSERT INTO visitor_sessions (id, session_id, ip_address, country, region, city, isp, asn, browser, os, device_type, referrer, landing_page, user_id, first_seen_at, last_seen_at, page_views)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(uuid(), sessionId, ip, '', '', '', '', '', browser, os, deviceType, referrer || '', landingPage || '', userId || null, now, now, 1);
  return db.prepare('SELECT * FROM visitor_sessions WHERE session_id = ?').get(sessionId);
}

// Update visitor session geo asynchronously
async function enrichVisitorGeo(sessionId, ip) {
  const geo = await geoipLookup(ip);
  db.prepare('UPDATE visitor_sessions SET country=?, region=?, city=?, isp=?, asn=? WHERE session_id=?')
    .run(geo.country, geo.region, geo.city, geo.isp, geo.asn, sessionId);
}

function send(res, status, body, extraHeaders = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  });
  res.end(payload);
}

function fail(res, status, code, message, details) {
  send(res, status, { ok: false, code, message, ...(details ? { details } : {}) });
}

function parseCookies(header = '') {
  const cookies = {};
  for (const part of String(header).split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    cookies[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return cookies;
}

function sessionCookie(token, maxAgeSeconds) {
  const flags = [
    `lk_session=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (NODE_ENV === 'production') flags.push('Secure');
  return flags.join('; ');
}

function readJson(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error('Request body too large.'), { status: 413, code: 'payload_too_large' }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (chunks.length === 0) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(Object.assign(new Error('Invalid JSON body.'), { status: 400, code: 'invalid_json' }));
      }
    });
    req.on('error', reject);
  });
}

function getRoles(userId) {
  return db.prepare(`
    SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = ?
  `).all(userId).map((r) => r.name);
}

function getEntitlement(userId) {
  return db.prepare(`
    SELECT * FROM supporter_entitlements
    WHERE user_id = ? AND status = 'active' AND (expires_at IS NULL OR expires_at > ?)
    ORDER BY created_at DESC LIMIT 1
  `).get(userId, nowIso());
}

function publicUser(row) {
  const roles = getRoles(row.id);
  const entitlement = getEntitlement(row.id);
  const supporterContent = db.prepare("SELECT slug FROM content WHERE access_type = 'supporter' AND is_published = 1")
    .all().map((r) => r.slug);
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    email: row.email,
    avatarColor: row.avatar_color,
    accountStatus: row.account_status,
    roles,
    createdAt: row.created_at,
    lastActiveAt: row.last_active_at,
    supporter: entitlement ? {
      id: entitlement.id,
      startsAt: entitlement.starts_at,
      expiresAt: entitlement.expires_at,
      status: entitlement.status,
    } : null,
    entitlements: roles.some((r) => ['super_admin', 'content_manager'].includes(r)) || entitlement ? supporterContent : [],
  };
}

function authUser(req) {
  const token = parseCookies(req.headers.cookie).lk_session;
  const payload = verifySession(token);
  if (!payload) return null;
  const row = db.prepare('SELECT * FROM profiles WHERE id = ?').get(payload.sub);
  if (!row || row.account_status !== 'active') return null;
  return row;
}

function hasRole(user, roles) {
  if (!user) return false;
  return getRoles(user.id).some((r) => roles.includes(r));
}

function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'local').split(',')[0].trim();
}

function audit(actorId, action, targetType, targetId, metadata = {}) {
  db.prepare('INSERT INTO audit_logs (id, actor_user_id, action, target_type, target_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(uuid(), actorId || null, action, targetType, targetId || null, JSON.stringify(metadata), nowIso());
}

function notify(userId, title, message, type = 'announcement') {
  db.prepare('INSERT INTO notifications (id, user_id, title, message, notification_type, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(uuid(), userId, title, message, type, nowIso());
}

function parseArt(row) {
  return { from: row.art_from, to: row.art_to, accent: row.art_accent };
}

function parseGallery(json) {
  try {
    const parsed = JSON.parse(json || '[]');
    return Array.isArray(parsed) ? parsed.filter((g) => g && g.from && g.to) : [];
  } catch {
    return [];
  }
}

const CONTENT_SELECT = `
  SELECT c.*, cat.slug AS category_slug, cat.name AS category_name
  FROM content c LEFT JOIN categories cat ON cat.id = c.category_id
`;

function mapContent(row) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    shortDescription: row.short_description,
    description: row.description,
    category: row.category_slug || '',
    categoryLabel: row.category_label || row.category_name || '',
    simulator: row.simulator_type,
    packageType: row.package_type,
    author: row.author_name,
    art: parseArt(row),
    gallery: parseGallery(row.gallery_json),
    coverImageUrl: row.cover_image_url || null,
    thumbnailUrl: row.thumbnail_url || null,
    version: row.version,
    releaseDate: row.release_date,
    releaseNotes: row.release_notes,
    installation: row.installation,
    fileSizeMb: row.file_size === null ? null : Number(row.file_size),
    sha256: row.sha256,
    accessType: row.access_type,
    featured: Boolean(row.is_featured),
    status: row.is_published ? 'published' : 'draft',
    downloads: Number(row.download_count || 0),
    hasDownload: Boolean(row.storage_reference),
    packageKind: row.storage_reference
      ? row.storage_reference.startsWith('demo:') ? 'demo' : 'stored'
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function publishedContent(query = '', params = []) {
  return db.prepare(`${CONTENT_SELECT} WHERE c.is_published = 1 AND c.access_type != 'restricted' ${query}`).all(...params).map(mapContent);
}

function getPublishedBySlug(slug) {
  const row = db.prepare(`${CONTENT_SELECT} WHERE c.slug = ?`).get(slug);
  if (!row) return null;
  return mapContent(row);
}

function canViewContent(user, row) {
  if (!user) return row.is_published === 1 && row.access_type !== 'restricted';
  if (hasRole(user, ['super_admin', 'content_manager', 'analytics_viewer'])) return true;
  return row.is_published === 1 && row.access_type !== 'restricted';
}

function canDownloadContent(user, row) {
  if (!user || !row.is_published) return { allowed: false, reason: 'Content is not available.' };
  if (row.access_type === 'restricted') return { allowed: false, reason: 'This content is restricted.' };
  if (row.access_type === 'public' || row.access_type === 'registered') return { allowed: true };
  if (row.access_type === 'supporter') {
    if (hasRole(user, ['super_admin', 'content_manager'])) return { allowed: true };
    if (getEntitlement(user.id)) return { allowed: true };
    return { allowed: false, reason: 'An active supporter entitlement is required.' };
  }
  return { allowed: false, reason: 'Access denied.' };
}

function publicCreator(row) {
  return {
    id: row.id,
    name: row.name,
    handle: row.handle,
    simulator: row.simulator,
    focus: row.focus,
    projectTitle: row.project_title,
    art: { from: row.art_from, to: row.art_to, accent: row.art_accent },
    likes: Number(row.likes || 0),
  };
}

const GRADIENTS = [
  ['#101a24', '#24384a', '#c6a56a'],
  ['#1d130c', '#3f2a16', '#c62b30'],
  ['#101d18', '#234034', '#c6a56a'],
  ['#171021', '#322049', '#c62b30'],
];

function publicSubmission(row) {
  const seed = String(row.id).split('').reduce((n, ch) => n + ch.charCodeAt(0), 0) % GRADIENTS.length;
  const g = GRADIENTS[seed];
  return {
    id: row.id,
    title: row.title,
    author: row.author_name || row.username || 'LittleKrishna Team',
    simulator: 'MSTS',
    art: { from: g[0], to: g[1], accent: g[2] },
    likes: 0,
    description: row.description,
    mediaUrl: row.media_url,
    moderationStatus: row.moderation_status,
    createdAt: row.created_at,
  };
}

function mapAnnouncement(row) {
  return {
    id: row.id,
    title: row.title,
    body: row.description,
    date: (row.published_at || row.created_at || '').slice(0, 10),
    kind: row.kind || 'release',
    isPublished: Boolean(row.is_published),
    publishedAt: row.published_at,
    createdAt: row.created_at,
  };
}

function slugify(value) {
  return String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

function validationError(res, errors) {
  return fail(res, 422, 'validation_failed', 'The request contains invalid fields.', errors);
}

function pageParams(url) {
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') || 50)));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

function paginated(items, total, page, pageSize) {
  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

function validateContentPayload(body, existing = null, publishing = false) {
  const errors = [];
  const title = String(body.title ?? existing?.title ?? '').trim();
  const slug = String(body.slug ?? existing?.slug ?? '').trim().toLowerCase();
  if (!title) errors.push('Title is required.');
  if (title.length > 200) errors.push('Title must be 200 characters or fewer.');
  if (!slug) errors.push('Slug is required.');
  else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) errors.push('Slug may contain lowercase letters, numbers and single hyphens.');
  if (slug && !existing && db.prepare('SELECT id FROM content WHERE slug = ?').get(slug)) errors.push('Slug must be unique.');
  if (slug && existing && db.prepare('SELECT id FROM content WHERE slug = ? AND id != ?').get(slug, existing.id)) errors.push('Slug must be unique.');
  const categorySlug = String(body.category ?? existing?.category_slug ?? '').trim();
  const category = db.prepare('SELECT * FROM categories WHERE slug = ?').get(categorySlug);
  if (!category) errors.push('A valid category is required.');
  const simulator = String(body.simulator ?? existing?.simulator_type ?? '').trim();
  if (!SIMULATORS.includes(simulator)) errors.push(`Simulator must be one of: ${SIMULATORS.join(', ')}.`);
  const packageType = String(body.packageType ?? existing?.package_type ?? '').trim();
  if (!packageType) errors.push('Package type is required.');
  const accessType = String(body.accessType ?? existing?.access_type ?? 'public').trim();
  if (!ACCESS_TYPES.includes(accessType)) errors.push('Access type is invalid.');
  const version = String(body.version ?? existing?.version ?? '').trim();
  if (!version) errors.push('Version is required.');
  const releaseDate = String(body.releaseDate ?? existing?.release_date ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(releaseDate) || Number.isNaN(Date.parse(releaseDate))) errors.push('Release date must be a valid date.');
  const description = String(body.description ?? existing?.description ?? '').trim();
  if (description.length > 20000) errors.push('Description is too long.');
  const fileSizeRaw = body.fileSizeMb ?? (existing?.file_size ?? null);
  const fileSize = fileSizeRaw === null || fileSizeRaw === '' ? null : Number(fileSizeRaw);
  if (fileSize !== null && (!Number.isFinite(fileSize) || fileSize <= 0)) errors.push('File size must be a positive number of megabytes.');
  const sha256 = String(body.sha256 ?? existing?.sha256 ?? '').trim();
  if (sha256 && !/^[a-f0-9]{64}$/i.test(sha256)) errors.push('SHA-256 must be a 64-character hexadecimal value.');
  const effectivelyPublishing = publishing || body.isPublished === true;
  const hasPackageData = typeof body.packageData === 'string' && body.packageData.length > 0;
  if (effectivelyPublishing && accessType !== 'restricted' && categorySlug !== 'gallery' && !fileSize && !hasPackageData) {
    errors.push('A file reference and file size are required before publishing downloadable content.');
  }
  return {
    errors,
    value: {
      title, slug, category, categorySlug, simulator, packageType, accessType, version, releaseDate, description,
      shortDescription: String(body.shortDescription ?? existing?.short_description ?? '').trim(),
      author: String(body.author ?? existing?.author_name ?? 'LittleKrishna Workshop').trim(),
      installation: String(body.installation ?? existing?.installation ?? '').trim(),
      releaseNotes: String(body.releaseNotes ?? existing?.release_notes ?? '').trim(),
      fileSize,
      isFeatured: ('featured' in body || 'isFeatured' in body)
        ? body.featured === true || body.isFeatured === true
        : Boolean(existing?.is_featured),
      isPublished: body.isPublished === true || publishing,
      art: {
        from: String(body.art?.from ?? existing?.art_from ?? '#101820'),
        to: String(body.art?.to ?? existing?.art_to ?? '#22303f'),
        accent: String(body.art?.accent ?? existing?.art_accent ?? '#c6a56a'),
      },
    },
  };
}

function ensurePackageForContent(slug, title, fileSizeMb) {
  if (!fileSizeMb) return { storageReference: null, sha256: null, sizeMb: null };
  const file = ensureDemoPackage(slug, title);
  const buffer = fs.readFileSync(file);
  const sizeMb = Math.max(0.0001, Math.round((buffer.length / (1024 * 1024)) * 10000) / 10000);
  return { storageReference: `demo:${path.basename(file)}`, sha256: crypto.createHash('sha256').update(buffer).digest('hex'), sizeMb };
}

function saveUploadedPackage(slug, data) {
  const raw = String(data || '');
  const base64 = raw.startsWith('data:') ? raw.slice(raw.indexOf(',') + 1) : raw;
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length < 4 || buffer.subarray(0, 4).toString('hex') !== '504b0304') {
    throw Object.assign(new Error('The uploaded package must be a valid ZIP archive.'), { status: 422, code: 'invalid_package' });
  }
  if (buffer.length > 10 * 1024 * 1024) {
    throw Object.assign(new Error('Uploaded packages are limited to 10 MB in local development.'), { status: 413, code: 'package_too_large' });
  }
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
  const name = `${slug.replace(/[^a-z0-9-]/gi, '_')}-${crypto.randomBytes(4).toString('hex')}.zip`;
  fs.writeFileSync(path.join(STORAGE_DIR, name), buffer);
  const sizeMb = Math.max(0.0001, Math.round((buffer.length / (1024 * 1024)) * 10000) / 10000);
  return { storageReference: `stored:${name}`, sha256: crypto.createHash('sha256').update(buffer).digest('hex'), sizeMb };
}

function tokenStatus(row) {
  if (row.revoked_at) return 'revoked';
  if (row.expires_at && row.expires_at <= nowIso()) return 'expired';
  if (row.maximum_uses !== null && row.redemption_count >= row.maximum_uses) return 'exhausted';
  return 'active';
}

function mapToken(row) {
  const bound = row.bound_user_id ? db.prepare('SELECT username FROM profiles WHERE id = ?').get(row.bound_user_id) : null;
  const creator = row.created_by ? db.prepare('SELECT username FROM profiles WHERE id = ?').get(row.created_by) : null;
  return {
    id: row.id,
    label: `Supporter token ${row.id.slice(0, 8)}`,
    maskedToken: `lk_supporter_${'•'.repeat(10)}`,
    createdBy: creator?.username || 'system',
    boundUser: bound?.username || null,
    boundUserId: row.bound_user_id,
    expiresAt: row.expires_at,
    maximumUses: row.maximum_uses,
    redemptionCount: row.redemption_count,
    revokedAt: row.revoked_at,
    status: tokenStatus(row),
    createdAt: row.created_at,
  };
}

async function handle(req, res, url) {
  const method = req.method || 'GET';
  const p = url.pathname.replace(/\/+$/, '') || '/';

  // IP access rules enforcement
  const clientIpAddr = clientIp(req);
  const blockRule = isIpBlocked(clientIpAddr);
  if (blockRule && !p.startsWith('/api/v1/admin/security')) {
    logSecurityEvent(null, 'ip.blocked_request', 'warning', { ip: clientIpAddr, path: p, ruleId: blockRule.id });
    return fail(res, 403, 'ip_blocked', 'Access from this IP address is blocked.');
  }

  // Origin check protects cookie-authenticated mutations from cross-site requests.
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
    const origin = req.headers.origin;
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return fail(res, 403, 'origin_denied', 'This origin is not permitted to call the API.');
    }
  }

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': req.headers.origin || ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    });
    return res.end();
  }

  if (p === '/api/v1/health' && method === 'GET') {
    return send(res, 200, { ok: true, service: 'littlekrishna-api', time: nowIso(), database: 'sqlite-local' });
  }

  // ---------------------------------------------------------------- AUTH
  if (p === '/api/v1/auth/register' && method === 'POST') {
    const limit = rateLimit(`register:${clientIp(req)}`, 10, 15 * 60 * 1000);
    if (!limit.allowed) return fail(res, 429, 'rate_limited', 'Too many registration attempts. Try again later.');
    const body = await readJson(req);
    const username = String(body.username || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const errors = [];
    if (!/^[a-zA-Z0-9_]{3,32}$/.test(username)) errors.push('Username must be 3-32 characters using letters, numbers or underscores.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push('A valid email address is required.');
    if (password.length < 8) errors.push('Password must contain at least 8 characters.');
    if (db.prepare('SELECT id FROM profiles WHERE lower(email) = ?').get(email)) errors.push('An account with this email already exists.');
    if (db.prepare('SELECT id FROM profiles WHERE lower(username) = ?').get(username.toLowerCase())) errors.push('This username is already taken.');
    if (errors.length) return validationError(res, errors);

    const now = nowIso();
    const id = uuid();
    db.prepare(`INSERT INTO profiles (id, username, display_name, email, password_hash, avatar_color, account_status, created_at, last_active_at)
      VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`)
      .run(id, username, username, email, hashPassword(password), '#c6a56a', now, now);
    notify(id, 'Welcome to LittleKrishna', 'Your account is ready. Explore routes and download authorized content.', 'system');
    audit(id, 'auth.register', 'user', id, {});
    const token = signSession({ sub: id });
    const row = db.prepare('SELECT * FROM profiles WHERE id = ?').get(id);
    return send(res, 201, { ok: true, user: publicUser(row) }, {
      'Set-Cookie': sessionCookie(token, 7 * 24 * 3600),
    });
  }

  if (p === '/api/v1/auth/login' && method === 'POST') {
    const body = await readJson(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const limit = rateLimit(`login:${clientIp(req)}:${email}`, 10, 15 * 60 * 1000);
    if (!limit.allowed) return fail(res, 429, 'rate_limited', 'Too many sign-in attempts. Try again later.');
    const row = db.prepare('SELECT * FROM profiles WHERE lower(email) = ? OR lower(username) = ?').get(email, email);
    if (!row || !verifyPassword(password, row.password_hash)) {
      audit(row?.id || null, 'auth.login_failed', 'user', row?.id || null, { ip: clientIp(req) });
      logSecurityEvent(row?.id || null, 'auth.login_failed', 'warning', { ip: clientIp(req), email });
      threatCheckFailedLogin(email, clientIp(req));
      return fail(res, 401, 'invalid_credentials', 'Email or password is incorrect.');
    }
    if (row.account_status !== 'active') {
      logSecurityEvent(row.id, 'auth.login_suspended_account', 'warning', { ip: clientIp(req) });
      return fail(res, 403, 'account_suspended', 'This account is suspended. Contact support.');
    }
    db.prepare('UPDATE profiles SET last_active_at = ? WHERE id = ?').run(nowIso(), row.id);
    audit(row.id, 'auth.login', 'user', row.id, {});
    const token = signSession({ sub: row.id });
    const fresh = db.prepare('SELECT * FROM profiles WHERE id = ?').get(row.id);
    return send(res, 200, { ok: true, user: publicUser(fresh) }, {
      'Set-Cookie': sessionCookie(token, 7 * 24 * 3600),
    });
  }

  if (p === '/api/v1/auth/logout' && method === 'POST') {
    const user = authUser(req);
    if (user) audit(user.id, 'auth.logout', 'user', user.id, {});
    return send(res, 200, { ok: true }, {
      'Set-Cookie': 'lk_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
    });
  }

  if (p === '/api/v1/auth/refresh' && method === 'POST') {
    const user = authUser(req);
    if (!user) return fail(res, 401, 'unauthenticated', 'Your session has expired. Sign in again.');
    const token = signSession({ sub: user.id });
    return send(res, 200, { ok: true, user: publicUser(user) }, {
      'Set-Cookie': sessionCookie(token, 7 * 24 * 3600),
    });
  }

  if (p === '/api/v1/auth/me' && method === 'GET') {
    const user = authUser(req);
    if (!user) return fail(res, 401, 'unauthenticated', 'Not signed in.');
    return send(res, 200, { ok: true, user: publicUser(user) });
  }

  if (p === '/api/v1/auth/forgot-password' && method === 'POST') {
    const limit = rateLimit(`forgot:${clientIp(req)}`, 5, 30 * 60 * 1000);
    if (!limit.allowed) return fail(res, 429, 'rate_limited', 'Too many reset requests. Try again later.');
    const body = await readJson(req);
    const email = String(body.email || '').trim().toLowerCase();
    const row = db.prepare('SELECT * FROM profiles WHERE lower(email) = ?').get(email);
    const generic = { ok: true, message: 'If the account exists, a password reset link has been issued.' };
    if (!row) return send(res, 200, generic);
    const token = randomToken('lk_reset');
    db.prepare('INSERT INTO password_resets (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(uuid(), row.id, hashToken(token), new Date(Date.now() + 60 * 60 * 1000).toISOString(), nowIso());
    const resetUrl = `/reset-password?token=${encodeURIComponent(token)}`;
    fs.appendFileSync(path.join(DATA_DIR, 'password-resets.log'),
      `${nowIso()} ${email} ${resetUrl}\n`, { mode: 0o600 });
    audit(row.id, 'auth.password_reset_requested', 'user', row.id, {});
    // No transactional email provider is configured locally. In production Supabase Auth sends this link.
    if (NODE_ENV !== 'production') {
      return send(res, 200, { ...generic, devResetToken: token, devResetUrl: resetUrl, devNote: 'Local development: use this token because no email provider is configured.' });
    }
    return send(res, 200, generic);
  }

  if (p === '/api/v1/auth/reset-password' && method === 'POST') {
    const body = await readJson(req);
    const token = String(body.token || '').trim();
    const password = String(body.password || '');
    if (password.length < 8) return validationError(res, ['Password must contain at least 8 characters.']);
    const row = db.prepare('SELECT * FROM password_resets WHERE token_hash = ?').get(hashToken(token));
    if (!row || row.used_at || row.expires_at <= nowIso()) {
      return fail(res, 400, 'invalid_reset_token', 'This password reset token is invalid or has expired.');
    }
    db.prepare('UPDATE profiles SET password_hash = ?, updated_at = ? WHERE id = ?')
      .run(hashPassword(password), nowIso(), row.user_id);
    db.prepare('UPDATE password_resets SET used_at = ? WHERE id = ?').run(nowIso(), row.id);
    audit(row.user_id, 'auth.password_reset_completed', 'user', row.user_id, {});
    return send(res, 200, { ok: true, message: 'Password updated. You can now sign in.' });
  }

  // ------------------------------------------------------------- PUBLIC
  if (p === '/api/v1/content' && method === 'GET') {
    const q = String(url.searchParams.get('q') || '').trim().toLowerCase();
    const category = url.searchParams.get('category');
    const simulator = url.searchParams.get('simulator');
    const access = url.searchParams.get('access');
    const featured = url.searchParams.get('featured');
    const { page, pageSize, offset } = pageParams(url);
    let rows = publishedContent();
    if (q) rows = rows.filter((c) => `${c.title} ${c.shortDescription} ${c.author}`.toLowerCase().includes(q));
    if (category) rows = rows.filter((c) => c.category === category);
    if (simulator) rows = rows.filter((c) => c.simulator === simulator);
    if (access) rows = rows.filter((c) => c.accessType === access);
    if (featured === 'true') rows = rows.filter((c) => c.featured);
    rows.sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
    return send(res, 200, { ok: true, ...paginated(rows.slice(offset, offset + pageSize), rows.length, page, pageSize) });
  }

  if (p.startsWith('/api/v1/content/') && method === 'GET') {
    const rest = p.slice('/api/v1/content/'.length);
    if (rest.endsWith('/versions')) {
      const key = rest.slice(0, -'/versions'.length);
      const item = db.prepare(`${CONTENT_SELECT} WHERE c.id = ? OR c.slug = ?`).get(key, key);
      if (!item || !canViewContent(authUser(req), item)) return fail(res, 404, 'not_found', 'Content not found.');
      const versions = db.prepare(`
        SELECT v.*, so.provider AS storage_provider, so.availability_status AS storage_status
        FROM content_versions v LEFT JOIN storage_objects so ON so.id = v.storage_object_id
        WHERE v.content_id = ? ORDER BY v.created_at DESC
      `).all(item.id).map((v) => ({
        id: v.id,
        version: v.version,
        fileSizeMb: v.file_size === null ? null : Math.round((v.file_size / (1024 * 1024)) * 100) / 100,
        sha256: v.sha256,
        storageProvider: v.storage_provider,
        storageStatus: v.storage_status,
        changelog: v.changelog,
        createdAt: v.created_at,
      }));
      return send(res, 200, { ok: true, items: versions });
    }
    const row = db.prepare(`${CONTENT_SELECT} WHERE c.slug = ? OR c.id = ?`).get(rest, rest);
    if (!row || !canViewContent(authUser(req), row)) return fail(res, 404, 'not_found', 'Content not found or unavailable.');
    return send(res, 200, { ok: true, item: mapContent(row) });
  }

  if (p === '/api/v1/categories' && method === 'GET') {
    const items = db.prepare('SELECT * FROM categories ORDER BY name').all()
      .map((c) => ({ id: c.id, slug: c.slug, label: c.name, description: c.description }));
    return send(res, 200, { ok: true, items });
  }

  if (p === '/api/v1/collections' && method === 'GET') {
    const rows = db.prepare('SELECT * FROM collections WHERE is_published = 1 ORDER BY title').all();
    const items = rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      art: { from: row.art_from, to: row.art_to, accent: row.art_accent },
      itemSlugs: db.prepare(`
        SELECT c.slug FROM collection_items ci JOIN content c ON c.id = ci.content_id
        WHERE ci.collection_id = ? AND c.is_published = 1 AND c.access_type != 'restricted'
        ORDER BY ci.display_order
      `).all(row.id).map((r) => r.slug),
    }));
    return send(res, 200, { ok: true, items });
  }

  if (p.startsWith('/api/v1/collections/') && method === 'GET') {
    const slug = p.slice('/api/v1/collections/'.length);
    const row = db.prepare('SELECT * FROM collections WHERE slug = ? AND is_published = 1').get(slug);
    if (!row) return fail(res, 404, 'not_found', 'Collection not found.');
    return send(res, 200, { ok: true, collection: {
      id: row.id, slug: row.slug, title: row.title, description: row.description,
      art: { from: row.art_from, to: row.art_to, accent: row.art_accent },
      itemSlugs: db.prepare(`
        SELECT c.slug FROM collection_items ci JOIN content c ON c.id = ci.content_id
        WHERE ci.collection_id = ? AND c.is_published = 1 AND c.access_type != 'restricted'
        ORDER BY ci.display_order
      `).all(row.id).map((r) => r.slug),
    } });
  }

  if (p === '/api/v1/community' && method === 'GET') {
    const creators = db.prepare('SELECT * FROM community_creators ORDER BY likes DESC').all().map(publicCreator);
    const submissions = db.prepare(`
      SELECT s.*, p.username, p.display_name AS author_name
      FROM community_submissions s LEFT JOIN profiles p ON p.id = s.user_id
      WHERE s.moderation_status = 'approved' ORDER BY s.created_at DESC LIMIT 24
    `).all().map(publicSubmission);
    const announcements = db.prepare(`
      SELECT * FROM announcements WHERE is_published = 1 AND archived_at IS NULL
      ORDER BY COALESCE(published_at, created_at) DESC LIMIT 12
    `).all().map(mapAnnouncement);
    return send(res, 200, { ok: true, creators, submissions, announcements });
  }

  if (p === '/api/v1/announcements' && method === 'GET') {
    const items = db.prepare('SELECT * FROM announcements WHERE is_published = 1 AND archived_at IS NULL ORDER BY COALESCE(published_at, created_at) DESC')
      .all().map(mapAnnouncement);
    return send(res, 200, { ok: true, items });
  }

  if (p === '/api/v1/analytics/pageview' && method === 'POST') {
    const limit = rateLimit(`pageview:${clientIp(req)}`, 120, 60 * 1000);
    if (!limit.allowed) return fail(res, 429, 'rate_limited', 'Too many analytics events.');
    const body = await readJson(req);
    const pagePath = String(body.path || '/').slice(0, 300);
    const anonymousId = String(body.anonymousSessionId || '').slice(0, 100);
    const referrer = String(body.referrer || '').slice(0, 500);
    const sessionId = anonymousId || `anon-${crypto.randomBytes(8).toString('hex')}`;
    const user = authUser(req);
    db.prepare('INSERT INTO page_views (id, page_path, anonymous_session_id, user_id, referrer, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(uuid(), pagePath, sessionId, user?.id || null, referrer || null, nowIso());
    const ip = clientIp(req);
    const ua = String(req.headers['user-agent'] || '');
    upsertVisitorSession(sessionId, ip, ua, referrer, pagePath, user?.id);
    // fire-and-forget geo enrichment
    enrichVisitorGeo(sessionId, ip).catch(() => {});
    db.prepare('INSERT INTO visitor_events (id, session_id, event_type, page_path, metadata, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(uuid(), sessionId, 'page_view', pagePath, JSON.stringify({ referrer }), ip, nowIso());
    return send(res, 202, { ok: true });
  }

  if (p === '/api/v1/analytics/event' && method === 'POST') {
    const limit = rateLimit(`event:${clientIp(req)}`, 240, 60 * 1000);
    if (!limit.allowed) return fail(res, 429, 'rate_limited', 'Too many events.');
    const body = await readJson(req);
    const eventType = String(body.eventType || body.event_type || '').slice(0, 80);
    if (!eventType) return validationError(res, ['Event type is required.']);
    const pagePath = String(body.path || body.page || '').slice(0, 300);
    const sessionId = String(body.sessionId || body.anonymousSessionId || '').slice(0, 100) || `anon-${crypto.randomBytes(8).toString('hex')}`;
    const user = authUser(req);
    const ip = clientIp(req);
    db.prepare('INSERT INTO visitor_events (id, session_id, event_type, page_path, metadata, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(uuid(), sessionId, eventType, pagePath, JSON.stringify(body.metadata || {}), ip, nowIso());
    upsertVisitorSession(sessionId, ip, String(req.headers['user-agent'] || ''), '', pagePath, user?.id);
    return send(res, 202, { ok: true });
  }

  if (p === '/api/v1/contact' && method === 'POST') {
    const limit = rateLimit(`contact:${clientIp(req)}`, 5, 60 * 60 * 1000);
    if (!limit.allowed) return fail(res, 429, 'rate_limited', 'Too many contact messages. Try again later.');
    const body = await readJson(req, 64 * 1024);
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const subject = String(body.subject || '').trim();
    const message = String(body.message || '').trim();
    const errors = [];
    if (name.length < 2 || name.length > 80) errors.push('Name must be between 2 and 80 characters.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push('A valid email address is required.');
    if (subject.length > 160) errors.push('Subject must be 160 characters or fewer.');
    if (message.length < 10 || message.length > 5000) errors.push('Message must be between 10 and 5,000 characters.');
    if (errors.length) return validationError(res, errors);
    const user = authUser(req);
    const id = uuid();
    db.prepare('INSERT INTO contact_messages (id, name, email, subject, message, status, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, name, email, subject, message, 'new', user?.id || null, nowIso());
    audit(user?.id || null, 'contact.submitted', 'contact_message', id, { email });
    return send(res, 201, {
      ok: true,
      reference: id.slice(0, 8).toUpperCase(),
      message: 'Your message has been recorded. The team reviews the contact inbox during working hours.',
    });
  }

  // ------------------------------------------------------------- PROFILE
  if (p === '/api/v1/profile' && method === 'GET') {
    const user = authUser(req);
    if (!user) return fail(res, 401, 'unauthenticated', 'Not signed in.');
    return send(res, 200, { ok: true, user: publicUser(user) });
  }

  if (p === '/api/v1/profile' && method === 'PATCH') {
    const user = authUser(req);
    if (!user) return fail(res, 401, 'unauthenticated', 'Not signed in.');
    const body = await readJson(req);
    const errors = [];
    const displayName = body.displayName === undefined ? user.display_name : String(body.displayName).trim();
    const username = body.username === undefined ? user.username : String(body.username).trim();
    const avatarColor = body.avatarColor === undefined ? user.avatar_color : String(body.avatarColor).trim();
    if (displayName.length < 1 || displayName.length > 60) errors.push('Display name must be 1-60 characters.');
    if (!/^[a-zA-Z0-9_]{3,32}$/.test(username)) errors.push('Username must be 3-32 characters using letters, numbers or underscores.');
    if (username.toLowerCase() !== user.username.toLowerCase() && db.prepare('SELECT id FROM profiles WHERE lower(username) = ?').get(username.toLowerCase())) errors.push('This username is already taken.');
    if (!/^#[0-9a-f]{6}$/i.test(avatarColor)) errors.push('Avatar colour must be a hex colour.');
    if (errors.length) return validationError(res, errors);
    db.prepare('UPDATE profiles SET display_name = ?, username = ?, avatar_color = ?, updated_at = ? WHERE id = ?')
      .run(displayName, username, avatarColor, nowIso(), user.id);
    const fresh = db.prepare('SELECT * FROM profiles WHERE id = ?').get(user.id);
    audit(user.id, 'profile.update', 'user', user.id, {});
    return send(res, 200, { ok: true, user: publicUser(fresh) });
  }

  if (p === '/api/v1/profile/password' && method === 'POST') {
    const user = authUser(req);
    if (!user) return fail(res, 401, 'unauthenticated', 'Not signed in.');
    const body = await readJson(req);
    if (!verifyPassword(String(body.currentPassword || ''), user.password_hash)) {
      return fail(res, 403, 'invalid_password', 'Current password is incorrect.');
    }
    if (String(body.newPassword || '').length < 8) return validationError(res, ['New password must contain at least 8 characters.']);
    db.prepare('UPDATE profiles SET password_hash = ?, updated_at = ? WHERE id = ?').run(hashPassword(String(body.newPassword)), nowIso(), user.id);
    audit(user.id, 'profile.password_changed', 'user', user.id, {});
    return send(res, 200, { ok: true });
  }

  if (p === '/api/v1/profile/downloads' && method === 'GET') {
    const user = authUser(req);
    if (!user) return fail(res, 401, 'unauthenticated', 'Not signed in.');
    return send(res, 200, { ok: true, items: downloadHistory(user.id) });
  }

  if (p === '/api/v1/profile/devices' && method === 'GET') {
    const user = authUser(req);
    if (!user) return fail(res, 401, 'unauthenticated', 'Not signed in.');
    const items = db.prepare('SELECT * FROM user_devices WHERE user_id = ? ORDER BY last_seen_at DESC').all(user.id).map((d) => ({
      id: d.id, deviceName: d.device_name, deviceType: d.device_type, operatingSystem: d.operating_system,
      clientVersion: d.client_version, firstSeenAt: d.first_seen_at, lastSeenAt: d.last_seen_at,
      revokedAt: d.revoked_at, active: !d.revoked_at,
    }));
    return send(res, 200, { ok: true, items });
  }

  if (p === '/api/v1/profile/devices' && method === 'POST') {
    const user = authUser(req);
    if (!user) return fail(res, 401, 'unauthenticated', 'Not signed in.');
    const body = await readJson(req);
    const deviceName = String(body.deviceName || body.device_name || '').trim();
    if (!deviceName) return validationError(res, ['Device name is required.']);
    const now = nowIso();
    const id = uuid();
    db.prepare('INSERT INTO user_devices (id, user_id, device_name, device_type, operating_system, client_version, first_seen_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, user.id, deviceName, String(body.deviceType || body.device_type || '').trim(), String(body.operatingSystem || body.operating_system || '').trim(), String(body.clientVersion || body.client_version || '').trim(), now, now);
    audit(user.id, 'device.registered', 'device', id, { deviceName });
    logSecurityEvent(user.id, 'device_registered', 'info', { deviceId: id, deviceName });
    return send(res, 201, { ok: true, item: { id, deviceName, active: true } });
  }

  const deviceRevokeMatch = p.match(/^\/api\/v1\/profile\/devices\/([^/]+)\/revoke$/);
  if (deviceRevokeMatch && method === 'POST') {
    const user = authUser(req);
    if (!user) return fail(res, 401, 'unauthenticated', 'Not signed in.');
    const id = deviceRevokeMatch[1];
    const row = db.prepare('SELECT * FROM user_devices WHERE id = ? AND user_id = ?').get(id, user.id);
    if (!row) return fail(res, 404, 'not_found', 'Device not found.');
    if (row.revoked_at) return fail(res, 409, 'already_revoked', 'Device is already revoked.');
    db.prepare('UPDATE user_devices SET revoked_at = ? WHERE id = ?').run(nowIso(), id);
    audit(user.id, 'device.revoked', 'device', id, {});
    logSecurityEvent(user.id, 'device_revoked', 'info', { deviceId: id });
    return send(res, 200, { ok: true });
  }

  if (p === '/api/v1/downloads/history' && method === 'GET') {
    const user = authUser(req);
    if (!user) return fail(res, 401, 'unauthenticated', 'Not signed in.');
    return send(res, 200, { ok: true, items: downloadHistory(user.id) });
  }

  if (p === '/api/v1/profile/notifications' && method === 'GET') {
    const user = authUser(req);
    if (!user) return fail(res, 401, 'unauthenticated', 'Not signed in.');
    const items = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100').all(user.id)
      .map((n) => ({ id: n.id, title: n.title, message: n.message, type: n.notification_type, isRead: Boolean(n.is_read), createdAt: n.created_at }));
    return send(res, 200, { ok: true, items });
  }

  if (p === '/api/v1/profile/notifications/read' && method === 'POST') {
    const user = authUser(req);
    if (!user) return fail(res, 401, 'unauthenticated', 'Not signed in.');
    const body = await readJson(req);
    if (body.id) db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(String(body.id), user.id);
    else db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(user.id);
    return send(res, 200, { ok: true });
  }

  // ------------------------------------------------------------ DOWNLOADS
  if (p === '/api/v1/downloads/authorize' && method === 'POST') {
    const user = authUser(req);
    if (!user) return fail(res, 401, 'login_required', 'Sign in before downloading content.');
    const limit = rateLimit(`download:${user.id}`, 12, 60 * 1000);
    if (!limit.allowed) return fail(res, 429, 'rate_limited', 'Too many download requests. Wait a minute and try again.');
    const body = await readJson(req);
    const identifier = String(body.contentId || body.slug || '').trim();
    if (!identifier) return validationError(res, ['contentId or slug is required.']);
    const row = db.prepare(`${CONTENT_SELECT} WHERE c.id = ? OR c.slug = ?`).get(identifier, identifier);
    if (!row) return fail(res, 404, 'not_found', 'Content not found.');
    const access = canDownloadContent(user, row);
    if (!access.allowed) {
      audit(user.id, 'download.denied', 'content', row.id, { reason: access.reason });
      return fail(res, 403, 'download_denied', access.reason);
    }
    if (!row.storage_reference) return fail(res, 409, 'file_unavailable', 'The file for this content is not currently available. Contact support.');
    const file = path.join(STORAGE_DIR, path.basename(row.storage_reference.replace(/^(?:demo|stored|storage):/, '')));
    if (!fs.existsSync(file)) return fail(res, 409, 'file_unavailable', 'The authorized package is missing from storage.');
    const downloadId = uuid();
    const now = nowIso();
    db.prepare('INSERT INTO downloads (id, user_id, content_id, status, authorization_time, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(downloadId, user.id, row.id, 'authorized', now, now);
    const token = signDownloadToken({ sub: user.id, downloadId, contentId: row.id });
    audit(user.id, 'download.authorized', 'content', row.id, { downloadId });
    return send(res, 201, {
      ok: true,
      downloadId,
      url: `/api/v1/downloads/file/${token}`,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      content: { id: row.id, title: row.title, slug: row.slug, version: row.version, fileSizeMb: row.file_size },
    });
  }

  if ((p === '/api/v1/downloads/start' || p === '/api/v1/downloads/complete' || p === '/api/v1/downloads/failure') && method === 'POST') {
    const user = authUser(req);
    if (!user) return fail(res, 401, 'unauthenticated', 'Not signed in.');
    const body = await readJson(req);
    const record = db.prepare('SELECT * FROM downloads WHERE id = ? AND user_id = ?').get(String(body.downloadId || ''), user.id);
    if (!record) return fail(res, 404, 'not_found', 'Download record not found.');
    if (p.endsWith('/failure')) {
      db.prepare("UPDATE downloads SET status = 'failed', failure_reason = ? WHERE id = ?")
        .run(String(body.reason || 'Download failed.').slice(0, 500), record.id);
      audit(user.id, 'download.failed', 'content', record.content_id, { reason: String(body.reason || '').slice(0, 200) });
    } else if (p.endsWith('/complete')) {
      if (record.status !== 'completed') {
        db.prepare("UPDATE downloads SET status = 'completed', completion_time = ? WHERE id = ?").run(nowIso(), record.id);
        db.prepare('UPDATE content SET download_count = download_count + 1 WHERE id = ?').run(record.content_id);
      }
    } else {
      db.prepare("UPDATE downloads SET status = 'started' WHERE id = ? AND status = 'authorized'").run(record.id);
    }
    return send(res, 200, { ok: true, status: p.endsWith('/failure') ? 'failed' : p.endsWith('/complete') ? 'completed' : 'started' });
  }

  if (p.startsWith('/api/v1/downloads/file/') && method === 'GET') {
    const token = p.slice('/api/v1/downloads/file/'.length);
    const payload = verifyDownloadToken(token);
    if (!payload) return fail(res, 403, 'invalid_download_token', 'This download link is invalid or has expired. Request a new one.');
    const user = db.prepare('SELECT * FROM profiles WHERE id = ?').get(payload.sub);
    if (!user || user.account_status !== 'active') return fail(res, 403, 'download_denied', 'This account cannot download content.');
    const record = db.prepare('SELECT * FROM downloads WHERE id = ? AND user_id = ?').get(payload.downloadId, user.id);
    if (!record) return fail(res, 403, 'download_denied', 'Download authorization not found.');
    if (record.status === 'failed') return fail(res, 403, 'download_denied', 'This download authorization was already marked failed.');
    const row = db.prepare(`${CONTENT_SELECT} WHERE c.id = ?`).get(record.content_id);
    if (!row) return fail(res, 404, 'not_found', 'Content no longer exists.');
    const access = canDownloadContent(user, row);
    if (!access.allowed) {
      audit(user.id, 'download.denied', 'content', row.id, { reason: access.reason, phase: 'file' });
      return fail(res, 403, 'download_denied', access.reason);
    }
    if (!row.storage_reference) return fail(res, 409, 'file_unavailable', 'This content has no downloadable package.');
    // Google Drive private direct download
    if (row.storage_reference.startsWith('drive:')) {
      const fileId = row.storage_reference.slice('drive:'.length).trim();
      if (!fileId) return fail(res, 409, 'file_unavailable', 'Google Drive file reference is invalid.');
      const { isDriveConfigured, streamFile, getFileMetadata } = await import('./lib/google-drive.mjs');
      if (!isDriveConfigured()) return fail(res, 503, 'drive_not_configured', 'Google Drive storage is not configured. Set GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN.');
      try {
        const meta = await getFileMetadata(fileId);
        const filename = `${row.slug}-v${row.version}.zip`.replace(/[^a-z0-9._-]/gi, '_');
        audit(user.id, 'download.started', 'content', row.id, { provider: 'google_drive', fileId });
        await streamFile(fileId, res, filename, meta.size);
        if (record.status !== 'completed') {
          db.prepare("UPDATE downloads SET status = 'completed', completion_time = ? WHERE id = ?").run(nowIso(), record.id);
          db.prepare('UPDATE content SET download_count = download_count + 1 WHERE id = ?').run(record.content_id);
        }
      } catch (err) {
        audit(user.id, 'download.failed', 'content', row.id, { reason: String(err.message).slice(0, 200), provider: 'google_drive' });
        db.prepare("UPDATE downloads SET status = 'failed', failure_reason = ? WHERE id = ?").run(String(err.message).slice(0, 500), record.id);
        if (!res.headersSent) return fail(res, 502, 'drive_delivery_failed', 'Failed to retrieve the file from storage. Please try again.');
      }
      return;
    }
    const storageName = path.basename(row.storage_reference.replace(/^(?:demo|stored|storage):/, ''));
    const file = path.join(STORAGE_DIR, storageName);
    if (!file.startsWith(STORAGE_DIR) || !fs.existsSync(file)) return fail(res, 409, 'file_unavailable', 'The package is missing from storage.');
    const stat = fs.statSync(file);
    const filename = `${row.slug}-v${row.version}.zip`.replace(/[^a-z0-9._-]/gi, '_');
    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Length': stat.size,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
      'X-Checksum-SHA256': row.sha256 || '',
    });
    const stream = fs.createReadStream(file);
    stream.pipe(res);
    stream.on('end', () => {
      if (record.status !== 'completed') {
        db.prepare("UPDATE downloads SET status = 'completed', completion_time = ? WHERE id = ?").run(nowIso(), record.id);
        db.prepare('UPDATE content SET download_count = download_count + 1 WHERE id = ?').run(record.content_id);
      }
    });
    stream.on('error', () => { try { res.destroy(); } catch { /* noop */ } });
    return;
  }

  // ------------------------------------------------------------ SUPPORTER
  if (p === '/api/v1/supporter/status' && method === 'GET') {
    const user = authUser(req);
    if (!user) return fail(res, 401, 'unauthenticated', 'Not signed in.');
    const entitlement = getEntitlement(user.id);
    const history = db.prepare(`
      SELECT e.*, t.created_at AS token_created_at FROM supporter_entitlements e
      LEFT JOIN supporter_tokens t ON t.id = e.token_id
      WHERE e.user_id = ? ORDER BY e.created_at DESC
    `).all(user.id).map((e) => ({
      id: e.id, status: e.status, startsAt: e.starts_at, expiresAt: e.expires_at, tokenId: e.token_id, createdAt: e.created_at,
    }));
    return send(res, 200, { ok: true, active: Boolean(entitlement), entitlement: entitlement ? {
      id: entitlement.id, startsAt: entitlement.starts_at, expiresAt: entitlement.expires_at, status: entitlement.status,
    } : null, history });
  }

  if (p === '/api/v1/supporter/redeem' && method === 'POST') {
    const user = authUser(req);
    if (!user) return fail(res, 401, 'login_required', 'Sign in before redeeming a supporter token.');
    const limit = rateLimit(`redeem:${user.id}`, 5, 30 * 60 * 1000);
    if (!limit.allowed) return fail(res, 429, 'rate_limited', 'Too many token attempts. Try again later.');
    const body = await readJson(req);
    const token = String(body.token || '').trim();
    if (!token || token.length > 200) return validationError(res, ['A supporter token is required.']);
    const hashed = hashToken(token);
    const row = db.prepare('SELECT * FROM supporter_tokens WHERE token_hash = ?').get(hashed);
    if (!row) {
      audit(user.id, 'supporter.redeem_failed', 'token', null, {});
      logSecurityEvent(user.id, 'supporter.invalid_token', 'warning', { ip: clientIp(req) });
      createSecurityAlert('medium', 'Invalid supporter token attempt', `Invalid token redemption attempt by ${user.username}.`, { userId: user.id });
      return fail(res, 400, 'invalid_token', 'This supporter token is invalid.');
    }
    if (row.revoked_at) return fail(res, 400, 'token_revoked', 'This supporter token has been revoked.');
    if (row.expires_at && row.expires_at <= nowIso()) return fail(res, 400, 'token_expired', 'This supporter token has expired.');
    if (row.maximum_uses !== null && row.redemption_count >= row.maximum_uses) return fail(res, 400, 'token_exhausted', 'This supporter token has reached its redemption limit.');
    if (row.bound_user_id && row.bound_user_id !== user.id) return fail(res, 403, 'token_not_bound', 'This supporter token is bound to a different account.');
    if (db.prepare('SELECT id FROM supporter_entitlements WHERE user_id = ? AND token_id = ?').get(user.id, row.id)) {
      return fail(res, 409, 'already_redeemed', 'You have already redeemed this supporter token.');
    }
    const now = nowIso();
    const expiresAt = row.expires_at || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    const id = uuid();
    db.exec('BEGIN');
    try {
      db.prepare('INSERT INTO supporter_entitlements (id, user_id, token_id, starts_at, expires_at, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(id, user.id, row.id, now, expiresAt, 'active', now);
      db.prepare('UPDATE supporter_tokens SET redemption_count = redemption_count + 1 WHERE id = ?').run(row.id);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    notify(user.id, 'Supporter access activated', `Your supporter access is active until ${expiresAt}.`, 'supporter');
    audit(user.id, 'supporter.redeemed', 'token', row.id, { entitlementId: id });
    return send(res, 200, { ok: true, entitlement: { id, startsAt: now, expiresAt, status: 'active' }, message: 'Supporter access activated.' });
  }

  if (p === '/api/v1/supporter/content' && method === 'GET') {
    const user = authUser(req);
    if (!user) return fail(res, 401, 'unauthenticated', 'Not signed in.');
    if (!getEntitlement(user.id) && !hasRole(user, ['super_admin', 'content_manager'])) {
      return fail(res, 403, 'entitlement_required', 'An active supporter entitlement is required.');
    }
    const items = publishedContent(" AND c.access_type = 'supporter'");
    return send(res, 200, { ok: true, items });
  }

  // ------------------------------------------------------------ COMMUNITY
  if (p === '/api/v1/community/submissions' && method === 'GET') {
    const user = authUser(req);
    if (!user) return fail(res, 401, 'unauthenticated', 'Not signed in.');
    const items = db.prepare(`
      SELECT s.* FROM community_submissions s WHERE s.user_id = ? ORDER BY s.created_at DESC
    `).all(user.id).map((s) => ({ ...publicSubmission(s), author: user.username }));
    return send(res, 200, { ok: true, items });
  }

  if (p === '/api/v1/community/submissions' && method === 'POST') {
    const user = authUser(req);
    if (!user) return fail(res, 401, 'login_required', 'Sign in before submitting community content.');
    const limit = rateLimit(`submission:${user.id}`, 5, 24 * 3600 * 1000);
    if (!limit.allowed) return fail(res, 429, 'rate_limited', 'Submission limit reached. Try again tomorrow.');
    const body = await readJson(req, 3 * 1024 * 1024);
    const title = String(body.title || '').trim();
    const description = String(body.description || '').trim();
    const errors = [];
    if (!title || title.length > 140) errors.push('A title of 1-140 characters is required.');
    if (description.length > 3000) errors.push('Description is too long.');
    let mediaUrl = String(body.mediaUrl || '').trim();
    if (mediaUrl && !/^https?:\/\//i.test(mediaUrl)) errors.push('Media URL must start with http:// or https://.');
    const dataUrl = String(body.mediaDataUrl || '');
    if (dataUrl) {
      const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
      if (!match) errors.push('Upload must be a PNG, JPEG, WebP or GIF image.');
      else {
        const buffer = Buffer.from(match[2], 'base64');
        if (buffer.length > 2 * 1024 * 1024) errors.push('Images must be 2 MB or smaller.');
        else {
          const ext = match[1].split('/')[1].replace('jpeg', 'jpg');
          const name = `${uuid()}.${ext}`;
          fs.mkdirSync(path.join(STORAGE_DIR, 'submissions'), { recursive: true });
          fs.writeFileSync(path.join(STORAGE_DIR, 'submissions', name), buffer);
          mediaUrl = `/api/v1/community/media/${name}`;
        }
      }
    }
    if (errors.length) return validationError(res, errors);
    const id = uuid();
    db.prepare('INSERT INTO community_submissions (id, user_id, title, description, media_url, moderation_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, user.id, title, description, mediaUrl || null, 'pending', nowIso());
    audit(user.id, 'community.submitted', 'submission', id, {});
    return send(res, 201, { ok: true, submission: { id, title, description, mediaUrl, moderationStatus: 'pending' }, message: 'Submission received and awaiting moderation.' });
  }

  if (p.startsWith('/api/v1/community/media/') && method === 'GET') {
    const name = path.basename(p.slice('/api/v1/community/media/'.length));
    const file = path.join(STORAGE_DIR, 'submissions', name);
    if (!fs.existsSync(file)) return fail(res, 404, 'not_found', 'Media not found.');
    const ext = path.extname(file).toLowerCase();
    const types = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' };
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff' });
    return fs.createReadStream(file).pipe(res);
  }

  // --------------------------------------------------------------- ADMIN
  if (p.startsWith('/api/v1/admin/')) {
    const user = authUser(req);
    if (!user) return fail(res, 401, 'unauthenticated', 'Administrator sign-in required.');
    const roles = getRoles(user.id);
    if (!roles.some((r) => ALL_ROLES.includes(r))) return fail(res, 403, 'admin_required', 'This account does not hold an administrator role.');
    const canContent = roles.some((r) => ['super_admin', 'content_manager'].includes(r));
    const canSupport = roles.some((r) => ['super_admin', 'support_manager'].includes(r));
    const canAnalytics = roles.some((r) => ['super_admin', 'analytics_viewer', 'content_manager', 'support_manager'].includes(r));
    const canSettings = roles.includes('super_admin');

    if (p === '/api/v1/admin/dashboard' && method === 'GET') {
      if (!canAnalytics) return fail(res, 403, 'forbidden', 'Analytics access required.');
      const totalUsers = db.prepare("SELECT COUNT(*) AS n FROM profiles").get().n;
      const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const monthlyActiveUsers = db.prepare('SELECT COUNT(*) AS n FROM profiles WHERE last_active_at >= ?').get(cutoff).n;
      const publishedContent = db.prepare('SELECT COUNT(*) AS n FROM content WHERE is_published = 1').get().n;
      const totalDownloads = db.prepare("SELECT COUNT(*) AS n FROM downloads WHERE status = 'completed'").get().n;
      const failedDownloads = db.prepare("SELECT COUNT(*) AS n FROM downloads WHERE status = 'failed'").get().n;
      const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const newUsersLast7Days = db.prepare('SELECT COUNT(*) AS n FROM profiles WHERE created_at >= ?').get(weekAgo).n;
      const popularContent = db.prepare('SELECT id, title, slug, download_count AS downloads FROM content WHERE is_published = 1 ORDER BY download_count DESC LIMIT 5').all();
      const recentUsers = db.prepare('SELECT id, username, display_name AS displayName, email, account_status AS status, created_at AS createdAt FROM profiles ORDER BY created_at DESC LIMIT 5').all();
      const failedEvents = db.prepare(`
        SELECT d.id, c.title AS content, d.failure_reason AS reason, d.created_at AS createdAt
        FROM downloads d JOIN content c ON c.id = d.content_id
        WHERE d.status = 'failed' ORDER BY d.created_at DESC LIMIT 5
      `).all();
      const recentActivity = db.prepare(`
        SELECT a.id, a.action, a.target_type AS targetType, a.created_at AS createdAt, p.username AS actor
        FROM audit_logs a LEFT JOIN profiles p ON p.id = a.actor_user_id
        ORDER BY a.created_at DESC LIMIT 10
      `).all();
      const recentContent = db.prepare('SELECT id, title, slug, version, access_type AS accessType, is_published AS isPublished, updated_at AS updatedAt FROM content ORDER BY updated_at DESC LIMIT 5').all();
      return send(res, 200, { ok: true, stats: { totalUsers, monthlyActiveUsers, publishedContent, totalDownloads, failedDownloads, newUsersLast7Days }, popularContent, recentUsers, failedEvents, recentActivity, recentContent });
    }

    if (p === '/api/v1/admin/users' && method === 'GET') {
      const q = String(url.searchParams.get('q') || '').trim().toLowerCase();
      const { page, pageSize, offset } = pageParams(url);
      const all = db.prepare(`
        SELECT p.*, (SELECT COUNT(*) FROM downloads d WHERE d.user_id = p.id) AS download_count
        FROM profiles p ORDER BY p.created_at DESC
      `).all().map((row) => ({
        ...publicUser(row),
        downloadCount: Number(row.download_count || 0),
        deleteProtected: row.id === user.id,
      })).filter((u) => !q || `${u.username} ${u.displayName} ${u.email}`.toLowerCase().includes(q));
      return send(res, 200, { ok: true, ...paginated(all.slice(offset, offset + pageSize), all.length, page, pageSize) });
    }

    if (p.startsWith('/api/v1/admin/users/') && method === 'PATCH') {
      if (!canSupport) return fail(res, 403, 'forbidden', 'Support manager access required.');
      const id = p.slice('/api/v1/admin/users/'.length);
      const target = db.prepare('SELECT * FROM profiles WHERE id = ?').get(id);
      if (!target) return fail(res, 404, 'not_found', 'User not found.');
      const body = await readJson(req);
      if (body.accountStatus && !['active', 'suspended'].includes(body.accountStatus)) return validationError(res, ['accountStatus must be active or suspended.']);
      if (target.id === user.id && body.accountStatus === 'suspended') return fail(res, 400, 'self_suspend', 'You cannot suspend your own account.');
      db.exec('BEGIN');
      try {
        if (body.accountStatus) {
          db.prepare('UPDATE profiles SET account_status = ?, updated_at = ? WHERE id = ?').run(body.accountStatus, nowIso(), id);
          audit(user.id, body.accountStatus === 'suspended' ? 'admin.user_suspended' : 'admin.user_reactivated', 'user', id, {});
        }
        if (Array.isArray(body.roles)) {
          if (!roles.includes('super_admin')) { db.exec('ROLLBACK'); return fail(res, 403, 'forbidden', 'Only a super admin can change roles.'); }
          const valid = db.prepare('SELECT id, name FROM roles').all().filter((r) => ALL_ROLES.includes(r.name));
          if (target.id === user.id && !body.roles.includes('super_admin')) {
            const otherSupers = db.prepare(`
              SELECT COUNT(*) AS n FROM user_roles ur JOIN roles r ON r.id = ur.role_id
              WHERE r.name = 'super_admin' AND ur.user_id != ?
            `).get(user.id).n;
            if (otherSupers === 0) { db.exec('ROLLBACK'); return fail(res, 400, 'last_super_admin', 'At least one super admin must remain.'); }
          }
          db.prepare('DELETE FROM user_roles WHERE user_id = ?').run(id);
          for (const roleName of body.roles) {
            const role = valid.find((r) => r.name === roleName);
            if (role) db.prepare('INSERT INTO user_roles (user_id, role_id, created_at) VALUES (?, ?, ?)').run(id, role.id, nowIso());
          }
          audit(user.id, 'admin.roles_changed', 'user', id, { roles: body.roles });
        }
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
      const fresh = db.prepare('SELECT * FROM profiles WHERE id = ?').get(id);
      return send(res, 200, { ok: true, user: publicUser(fresh) });
    }

    if (p === '/api/v1/admin/content' && method === 'GET') {
      if (!canContent) return fail(res, 403, 'forbidden', 'Content manager access required.');
      const { page, pageSize, offset } = pageParams(url);
      const q = String(url.searchParams.get('q') || '').toLowerCase();
      let rows = db.prepare(`${CONTENT_SELECT} ORDER BY c.updated_at DESC`).all().map(mapContent);
      if (q) rows = rows.filter((c) => `${c.title} ${c.slug}`.toLowerCase().includes(q));
      return send(res, 200, { ok: true, ...paginated(rows.slice(offset, offset + pageSize), rows.length, page, pageSize) });
    }

    if (p === '/api/v1/admin/content' && method === 'POST') {
      if (!canContent) return fail(res, 403, 'forbidden', 'Content manager access required.');
      const body = await readJson(req, 15 * 1024 * 1024);
      const { errors, value } = validateContentPayload(body);
      if (errors.length) return validationError(res, errors);
      const now = nowIso();
      const id = uuid();
      const packageInfo = typeof body.packageData === 'string' && body.packageData.length > 0
        ? saveUploadedPackage(value.slug, body.packageData)
        : (body.storageReference ? { storageReference: String(body.storageReference).trim(), sha256: value.sha256 || null, sizeMb: value.fileSize } : ensurePackageForContent(value.slug, value.title, value.fileSize));
      db.prepare(`
        INSERT INTO content (id, title, slug, short_description, description, category_id, category_label,
          simulator_type, package_type, author_name, art_from, art_to, art_accent, gallery_json,
          version, release_date, release_notes, installation, file_size, sha256, storage_reference,
          storage_reference_drive, cover_image_url, thumbnail_url,
          access_type, is_published, is_featured, download_count, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      `).run(
        id, value.title, value.slug, value.shortDescription, value.description, value.category.id, value.category.name,
        value.simulator, value.packageType, value.author, value.art.from, value.art.to, value.art.accent, '[]',
        value.version, value.releaseDate, value.releaseNotes, value.installation, packageInfo.sizeMb, packageInfo.sha256,
        packageInfo.storageReference, body.storageReference ? String(body.storageReference).trim() : null,
        body.coverImageUrl ? String(body.coverImageUrl).trim() : null,
        body.thumbnailUrl ? String(body.thumbnailUrl).trim() : null,
        value.accessType, value.isPublished ? 1 : 0, value.isFeatured ? 1 : 0, now, now,
      );
      audit(user.id, 'admin.content_created', 'content', id, { slug: value.slug, published: value.isPublished });
      const row = db.prepare(`${CONTENT_SELECT} WHERE c.id = ?`).get(id);
      return send(res, 201, { ok: true, item: mapContent(row) });
    }

    if (p.startsWith('/api/v1/admin/content/') && method === 'GET') {
      if (!canContent) return fail(res, 403, 'forbidden', 'Content manager access required.');
      const id = p.slice('/api/v1/admin/content/'.length);
      const row = db.prepare(`${CONTENT_SELECT} WHERE c.id = ?`).get(id);
      if (!row) return fail(res, 404, 'not_found', 'Content not found.');
      return send(res, 200, { ok: true, item: mapContent(row) });
    }

    if (p.startsWith('/api/v1/admin/content/') && (method === 'PATCH' || method === 'DELETE')) {
      if (!canContent) return fail(res, 403, 'forbidden', 'Content manager access required.');
      const id = p.slice('/api/v1/admin/content/'.length);
      const existing = db.prepare(`${CONTENT_SELECT} WHERE c.id = ?`).get(id);
      if (!existing) return fail(res, 404, 'not_found', 'Content not found.');
      if (method === 'DELETE') {
        db.prepare("UPDATE content SET is_published = 0, access_type = 'restricted', updated_at = ? WHERE id = ?").run(nowIso(), id);
        audit(user.id, 'admin.content_archived', 'content', id, {});
        return send(res, 200, { ok: true, archived: true });
      }
      const body = await readJson(req, 15 * 1024 * 1024);
      const publishing = body.isPublished === true;
      const { errors, value } = validateContentPayload(body, existing, publishing);
      if (errors.length) return validationError(res, errors);
      let packageInfo = { storageReference: existing.storage_reference, sha256: existing.sha256, sizeMb: existing.file_size };
      if (typeof body.packageData === 'string' && body.packageData.length > 0) {
        packageInfo = saveUploadedPackage(value.slug, body.packageData);
      } else if (value.fileSize && (!existing.storage_reference || Number(existing.file_size) !== Number(value.fileSize))) {
        packageInfo = ensurePackageForContent(value.slug, value.title, value.fileSize);
      }
      if (body.storageReference) {
        packageInfo.storageReference = String(body.storageReference).trim();
      }
      const coverImageUrl = body.coverImageUrl !== undefined ? (body.coverImageUrl ? String(body.coverImageUrl).trim() : null) : existing.cover_image_url;
      const thumbnailUrl = body.thumbnailUrl !== undefined ? (body.thumbnailUrl ? String(body.thumbnailUrl).trim() : null) : existing.thumbnail_url;
      const storageReferenceDrive = body.storageReference !== undefined ? (body.storageReference ? String(body.storageReference).trim() : null) : existing.storage_reference_drive;
      if (publishing && !packageInfo.storageReference && value.categorySlug !== 'gallery' && value.accessType !== 'restricted' && !existing.cover_image_url) {
        return validationError(res, ['A file reference is required before publishing.']);
      }
      db.prepare(`
        UPDATE content SET title = ?, slug = ?, short_description = ?, description = ?, category_id = ?, category_label = ?,
          simulator_type = ?, package_type = ?, author_name = ?, art_from = ?, art_to = ?, art_accent = ?,
          version = ?, release_date = ?, release_notes = ?, installation = ?, file_size = ?, sha256 = ?, storage_reference = ?,
          storage_reference_drive = ?, cover_image_url = ?, thumbnail_url = ?,
          access_type = ?, is_published = ?, is_featured = ?, updated_at = ? WHERE id = ?
      `).run(
        value.title, value.slug, value.shortDescription, value.description, value.category.id, value.category.name,
        value.simulator, value.packageType, value.author, value.art.from, value.art.to, value.art.accent,
        value.version, value.releaseDate, value.releaseNotes, value.installation, packageInfo.sizeMb, packageInfo.sha256, packageInfo.storageReference,
        storageReferenceDrive, coverImageUrl, thumbnailUrl,
        value.accessType, publishing ? 1 : (body.isPublished === false ? 0 : existing.is_published), value.isFeatured ? 1 : 0, nowIso(), id,
      );
      audit(user.id, publishing ? 'admin.content_published' : 'admin.content_updated', 'content', id, { slug: value.slug });
      const row = db.prepare(`${CONTENT_SELECT} WHERE c.id = ?`).get(id);
      return send(res, 200, { ok: true, item: mapContent(row) });
    }

    if (p === '/api/v1/admin/categories' && method === 'GET') {
      const items = db.prepare('SELECT id, name AS label, slug, description FROM categories ORDER BY name').all()
        .map((c) => ({ ...c, contentCount: db.prepare('SELECT COUNT(*) AS n FROM content WHERE category_id = ?').get(c.id).n }));
      return send(res, 200, { ok: true, items });
    }

    if (p === '/api/v1/admin/categories' && method === 'POST') {
      if (!canContent) return fail(res, 403, 'forbidden', 'Content manager access required.');
      const body = await readJson(req);
      const label = String(body.label || '').trim();
      const slug = slugify(body.slug || label);
      if (!label) return validationError(res, ['Category name is required.']);
      if (!slug) return validationError(res, ['A valid slug is required.']);
      if (db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug)) return validationError(res, ['Category slug must be unique.']);
      const id = uuid();
      db.prepare('INSERT INTO categories (id, name, slug, description) VALUES (?, ?, ?, ?)').run(id, label, slug, String(body.description || '').trim());
      audit(user.id, 'admin.category_created', 'category', id, { slug });
      return send(res, 201, { ok: true, item: { id, label, slug, description: String(body.description || '').trim(), contentCount: 0 } });
    }

    if (p.startsWith('/api/v1/admin/categories/') && method === 'PATCH') {
      if (!canContent) return fail(res, 403, 'forbidden', 'Content manager access required.');
      const id = p.slice('/api/v1/admin/categories/'.length);
      const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
      if (!existing) return fail(res, 404, 'not_found', 'Category not found.');
      const body = await readJson(req);
      const label = String(body.label ?? existing.name).trim();
      const slug = slugify(body.slug ?? existing.slug);
      const description = String(body.description ?? existing.description ?? '').trim();
      const errors = [];
      if (!label) errors.push('Category name is required.');
      if (!slug) errors.push('A valid slug is required.');
      if (slug && db.prepare('SELECT id FROM categories WHERE slug = ? AND id != ?').get(slug, id)) errors.push('Category slug must be unique.');
      if (errors.length) return validationError(res, errors);
      db.exec('BEGIN');
      try {
        db.prepare('UPDATE categories SET name = ?, slug = ?, description = ? WHERE id = ?').run(label, slug, description, id);
        db.prepare('UPDATE content SET category_label = ? WHERE category_id = ?').run(label, id);
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
      audit(user.id, 'admin.category_updated', 'category', id, { slug });
      const contentCount = db.prepare('SELECT COUNT(*) AS n FROM content WHERE category_id = ?').get(id).n;
      return send(res, 200, { ok: true, item: { id, label, slug, description, contentCount } });
    }

    if (p.startsWith('/api/v1/admin/categories/') && method === 'DELETE') {
      if (!canContent) return fail(res, 403, 'forbidden', 'Content manager access required.');
      const id = p.slice('/api/v1/admin/categories/'.length);
      const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
      if (!existing) return fail(res, 404, 'not_found', 'Category not found.');
      const count = db.prepare('SELECT COUNT(*) AS n FROM content WHERE category_id = ?').get(id).n;
      if (count > 0) return fail(res, 409, 'category_not_empty', `This category still contains ${count} content record${count === 1 ? '' : 's'}. Move or delete them first.`);
      db.prepare('DELETE FROM categories WHERE id = ?').run(id);
      audit(user.id, 'admin.category_deleted', 'category', id, { slug: existing.slug });
      return send(res, 200, { ok: true });
    }

    if (p === '/api/v1/admin/collections' && method === 'GET') {
      const rows = db.prepare('SELECT * FROM collections ORDER BY title').all();
      return send(res, 200, { ok: true, items: rows.map((row) => ({
        id: row.id, slug: row.slug, title: row.title, description: row.description,
        art: { from: row.art_from, to: row.art_to, accent: row.art_accent }, isPublished: Boolean(row.is_published),
        itemSlugs: db.prepare('SELECT c.slug FROM collection_items ci JOIN content c ON c.id = ci.content_id WHERE ci.collection_id = ? ORDER BY ci.display_order').all(row.id).map((r) => r.slug),
      })) });
    }

    if (p === '/api/v1/admin/collections' && method === 'POST') {
      if (!canContent) return fail(res, 403, 'forbidden', 'Content manager access required.');
      const body = await readJson(req);
      const title = String(body.title || '').trim();
      const slug = slugify(body.slug || title);
      if (!title || !slug) return validationError(res, ['Title and slug are required.']);
      if (db.prepare('SELECT id FROM collections WHERE slug = ?').get(slug)) return validationError(res, ['Collection slug must be unique.']);
      const id = uuid();
      const itemSlugs = Array.isArray(body.itemSlugs) ? body.itemSlugs.map(String) : [];
      db.exec('BEGIN');
      try {
        db.prepare('INSERT INTO collections (id, title, slug, description, art_from, art_to, art_accent, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .run(id, title, slug, String(body.description || '').trim(), '#101820', '#22303f', '#c6a56a', 1);
        itemSlugs.forEach((itemSlug, index) => {
          const content = db.prepare('SELECT id FROM content WHERE slug = ?').get(itemSlug);
          if (content) db.prepare('INSERT OR IGNORE INTO collection_items (collection_id, content_id, display_order) VALUES (?, ?, ?)').run(id, content.id, index);
        });
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
      audit(user.id, 'admin.collection_created', 'collection', id, { slug });
      return send(res, 201, { ok: true, item: { id, title, slug, description: String(body.description || '').trim(), itemSlugs } });
    }

    if (p.startsWith('/api/v1/admin/collections/') && method === 'PATCH') {
      if (!canContent) return fail(res, 403, 'forbidden', 'Content manager access required.');
      const id = p.slice('/api/v1/admin/collections/'.length);
      const existing = db.prepare('SELECT * FROM collections WHERE id = ?').get(id);
      if (!existing) return fail(res, 404, 'not_found', 'Collection not found.');
      const body = await readJson(req);
      const title = String(body.title ?? existing.title).trim();
      const slug = slugify(body.slug ?? existing.slug);
      const description = String(body.description ?? existing.description ?? '').trim();
      const isPublished = typeof body.isPublished === 'boolean' ? body.isPublished : Boolean(existing.is_published);
      const errors = [];
      if (!title) errors.push('Collection title is required.');
      if (!slug) errors.push('A valid collection slug is required.');
      if (slug && db.prepare('SELECT id FROM collections WHERE slug = ? AND id != ?').get(slug, id)) errors.push('Collection slug must be unique.');
      if (errors.length) return validationError(res, errors);
      const itemSlugs = Array.isArray(body.itemSlugs) ? body.itemSlugs.map(String) : null;
      db.exec('BEGIN');
      try {
        db.prepare('UPDATE collections SET title = ?, slug = ?, description = ?, is_published = ? WHERE id = ?')
          .run(title, slug, description, isPublished ? 1 : 0, id);
        if (itemSlugs) {
          db.prepare('DELETE FROM collection_items WHERE collection_id = ?').run(id);
          itemSlugs.forEach((itemSlug, index) => {
            const content = db.prepare('SELECT id FROM content WHERE slug = ?').get(itemSlug);
            if (content) db.prepare('INSERT OR IGNORE INTO collection_items (collection_id, content_id, display_order) VALUES (?, ?, ?)').run(id, content.id, index);
          });
        }
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
      audit(user.id, 'admin.collection_updated', 'collection', id, { slug, isPublished });
      const row = db.prepare('SELECT * FROM collections WHERE id = ?').get(id);
      const savedSlugs = db.prepare(`
        SELECT c.slug FROM collection_items ci JOIN content c ON c.id = ci.content_id
        WHERE ci.collection_id = ? ORDER BY ci.display_order
      `).all(id).map((r) => r.slug);
      return send(res, 200, { ok: true, item: {
        id, slug: row.slug, title: row.title, description: row.description,
        art: { from: row.art_from, to: row.art_to, accent: row.art_accent },
        isPublished: Boolean(row.is_published), itemSlugs: savedSlugs,
      } });
    }

    if (p.startsWith('/api/v1/admin/collections/') && method === 'DELETE') {
      if (!canContent) return fail(res, 403, 'forbidden', 'Content manager access required.');
      const id = p.slice('/api/v1/admin/collections/'.length);
      const existing = db.prepare('SELECT * FROM collections WHERE id = ?').get(id);
      if (!existing) return fail(res, 404, 'not_found', 'Collection not found.');
      db.exec('BEGIN');
      try {
        db.prepare('DELETE FROM collection_items WHERE collection_id = ?').run(id);
        db.prepare('DELETE FROM collections WHERE id = ?').run(id);
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
      audit(user.id, 'admin.collection_deleted', 'collection', id, { slug: existing.slug });
      return send(res, 200, { ok: true });
    }

    if (p === '/api/v1/admin/tokens' && method === 'GET') {
      if (!canSupport) return fail(res, 403, 'forbidden', 'Support manager access required.');
      const items = db.prepare('SELECT * FROM supporter_tokens ORDER BY created_at DESC').all().map(mapToken);
      return send(res, 200, { ok: true, items });
    }

    if (p === '/api/v1/admin/tokens' && method === 'POST') {
      if (!canSupport) return fail(res, 403, 'forbidden', 'Support manager access required.');
      const body = await readJson(req);
      const expiresInHours = body.expiresInHours === undefined || body.expiresInHours === null || body.expiresInHours === ''
        ? 168 : Number(body.expiresInHours);
      const maximumUses = body.maximumUses === undefined || body.maximumUses === null || body.maximumUses === ''
        ? 1 : Number(body.maximumUses);
      const errors = [];
      if (!Number.isFinite(expiresInHours) || expiresInHours < 1 || expiresInHours > 8760) errors.push('Expiration must be between 1 and 8760 hours.');
      if (!Number.isInteger(maximumUses) || maximumUses < 1 || maximumUses > 10000) errors.push('Maximum uses must be a whole number between 1 and 10000.');
      let boundUserId = body.boundUserId ? String(body.boundUserId).trim() : null;
      if (boundUserId) {
        const bound = db.prepare('SELECT id FROM profiles WHERE id = ? OR username = ? OR email = ?').get(boundUserId, boundUserId, boundUserId.toLowerCase());
        if (!bound) errors.push('Bound user was not found.');
        else boundUserId = bound.id;
      }
      if (errors.length) return validationError(res, errors);
      const token = randomToken('lk_supporter');
      const id = uuid();
      const expiresAt = new Date(Date.now() + expiresInHours * 3600 * 1000).toISOString();
      db.prepare('INSERT INTO supporter_tokens (id, token_hash, created_by, expires_at, maximum_uses, redemption_count, bound_user_id, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)')
        .run(id, hashToken(token), user.id, expiresAt, maximumUses, boundUserId, nowIso());
      audit(user.id, 'admin.token_generated', 'token', id, { expiresAt, maximumUses, boundUserId });
      const row = db.prepare('SELECT * FROM supporter_tokens WHERE id = ?').get(id);
      return send(res, 201, { ok: true, token, item: mapToken(row), notice: 'Store this token now. Only its hash is retained and it cannot be shown again.' });
    }

    if (p.endsWith('/revoke') && p.startsWith('/api/v1/admin/tokens/') && method === 'POST') {
      if (!canSupport) return fail(res, 403, 'forbidden', 'Support manager access required.');
      const id = p.slice('/api/v1/admin/tokens/'.length, -'/revoke'.length);
      const token = db.prepare('SELECT * FROM supporter_tokens WHERE id = ?').get(id);
      if (!token) return fail(res, 404, 'not_found', 'Token not found.');
      db.exec('BEGIN');
      try {
        db.prepare('UPDATE supporter_tokens SET revoked_at = ? WHERE id = ?').run(nowIso(), id);
        db.prepare("UPDATE supporter_entitlements SET status = 'revoked' WHERE token_id = ? AND status = 'active'").run(id);
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
      audit(user.id, 'admin.token_revoked', 'token', id, {});
      return send(res, 200, { ok: true });
    }

    if (p === '/api/v1/admin/supporters' && method === 'GET') {
      if (!canSupport) return fail(res, 403, 'forbidden', 'Support manager access required.');
      const rows = db.prepare(`
        SELECT e.*, p.username, p.display_name, p.email, t.id AS token_ref
        FROM supporter_entitlements e JOIN profiles p ON p.id = e.user_id
        LEFT JOIN supporter_tokens t ON t.id = e.token_id
        ORDER BY e.created_at DESC LIMIT 200
      `).all().map((e) => {
        const expired = e.expires_at && e.expires_at <= nowIso();
        const effectiveStatus = e.status === 'active' && expired ? 'expired' : e.status;
        return { id: e.id, userId: e.user_id, username: e.username, displayName: e.display_name, email: e.email, tokenId: e.token_id, status: effectiveStatus, startsAt: e.starts_at, expiresAt: e.expires_at, createdAt: e.created_at };
      });
      return send(res, 200, { ok: true, items: rows });
    }

    if (p === '/api/v1/admin/supporters/grant' && method === 'POST') {
      if (!canSupport) return fail(res, 403, 'forbidden', 'Support manager access required.');
      const body = await readJson(req);
      const identifier = String(body.userId || body.username || body.email || '').trim();
      const target = db.prepare('SELECT * FROM profiles WHERE id = ? OR username = ? OR lower(email) = ?').get(identifier, identifier, identifier.toLowerCase());
      if (!target) return fail(res, 404, 'not_found', 'User not found.');
      const hours = body.expiresInHours === undefined ? 168 : Number(body.expiresInHours);
      if (!Number.isFinite(hours) || hours < 1 || hours > 8760) return validationError(res, ['Expiration must be between 1 and 8760 hours.']);
      const now = nowIso();
      const id = uuid();
      const expiresAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();
      db.prepare('INSERT INTO supporter_entitlements (id, user_id, token_id, starts_at, expires_at, status, created_at) VALUES (?, ?, NULL, ?, ?, ?, ?)')
        .run(id, target.id, now, expiresAt, 'active', now);
      notify(target.id, 'Supporter access granted', `An administrator granted supporter access until ${expiresAt}.`, 'supporter');
      audit(user.id, 'admin.support_granted', 'user', target.id, { hours });
      return send(res, 201, { ok: true, entitlement: { id, userId: target.id, startsAt: now, expiresAt, status: 'active' } });
    }

    if (p.startsWith('/api/v1/admin/supporters/') && p.endsWith('/revoke') && method === 'POST') {
      if (!canSupport) return fail(res, 403, 'forbidden', 'Support manager access required.');
      const id = p.slice('/api/v1/admin/supporters/'.length, -'/revoke'.length);
      const entitlement = db.prepare('SELECT * FROM supporter_entitlements WHERE id = ?').get(id);
      if (!entitlement) return fail(res, 404, 'not_found', 'Entitlement not found.');
      db.prepare("UPDATE supporter_entitlements SET status = 'revoked' WHERE id = ?").run(id);
      audit(user.id, 'admin.support_revoked', 'entitlement', id, { userId: entitlement.user_id });
      return send(res, 200, { ok: true });
    }

    if (p === '/api/v1/admin/downloads' && method === 'GET') {
      if (!canAnalytics) return fail(res, 403, 'forbidden', 'Analytics access required.');
      const { page, pageSize, offset } = pageParams(url);
      const status = url.searchParams.get('status');
      const where = status ? 'WHERE d.status = ?' : '';
      const params = status ? [status] : [];
      const total = db.prepare(`SELECT COUNT(*) AS n FROM downloads d ${where}`).get(...params).n;
      const items = db.prepare(`
        SELECT d.*, c.title AS content_title, c.version, c.slug AS content_slug, c.file_size AS file_size_mb,
               p.username, p.display_name
        FROM downloads d JOIN content c ON c.id = d.content_id JOIN profiles p ON p.id = d.user_id
        ${where} ORDER BY d.created_at DESC LIMIT ? OFFSET ?
      `).all(...params, pageSize, offset).map((d) => ({
        id: d.id, contentSlug: d.content_slug, contentTitle: d.content_title, version: d.version,
        status: d.status, authorizedAt: d.authorization_time, completedAt: d.completion_time,
        fileSizeMb: d.file_size_mb, username: d.username, displayName: d.display_name,
        failureReason: d.failure_reason,
      }));
      return send(res, 200, { ok: true, ...paginated(items, total, page, pageSize) });
    }

    if (p === '/api/v1/admin/analytics' && method === 'GET') {
      if (!canAnalytics) return fail(res, 403, 'forbidden', 'Analytics access required.');
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const totals = {
        pageViews: db.prepare('SELECT COUNT(*) AS n FROM page_views WHERE created_at >= ?').get(since).n,
        contentViews: db.prepare("SELECT COUNT(*) AS n FROM page_views WHERE created_at >= ? AND page_path LIKE '/content/%'").get(since).n,
        downloads: db.prepare('SELECT COUNT(*) AS n FROM downloads WHERE status = ?').get('completed').n,
        failedAuthorizations: db.prepare("SELECT COUNT(*) AS n FROM audit_logs WHERE action = 'download.denied'").get().n,
      };
      const topPages = db.prepare('SELECT page_path AS path, COUNT(*) AS views FROM page_views WHERE created_at >= ? GROUP BY page_path ORDER BY views DESC LIMIT 10').all(since);
      const referrers = db.prepare("SELECT COALESCE(NULLIF(referrer, ''), 'Direct') AS referrer, COUNT(*) AS views FROM page_views WHERE created_at >= ? GROUP BY referrer ORDER BY views DESC LIMIT 10").all(since);
      const timeline = db.prepare("SELECT substr(created_at, 1, 10) AS date, COUNT(*) AS views FROM page_views WHERE created_at >= ? GROUP BY date ORDER BY date").all(since);
      const downloadStatuses = db.prepare('SELECT status, COUNT(*) AS count FROM downloads GROUP BY status').all();
      return send(res, 200, { ok: true, totals, topPages, referrers, timeline, downloadStatuses });
    }

    if (p === '/api/v1/admin/audit-logs' && method === 'GET') {
      if (!canAnalytics) return fail(res, 403, 'forbidden', 'Analytics access required.');
      const { page, pageSize, offset } = pageParams(url);
      const total = db.prepare('SELECT COUNT(*) AS n FROM audit_logs').get().n;
      const items = db.prepare(`
        SELECT a.*, p.username AS actor FROM audit_logs a LEFT JOIN profiles p ON p.id = a.actor_user_id
        ORDER BY a.created_at DESC LIMIT ? OFFSET ?
      `).all(pageSize, offset).map((a) => ({
        id: a.id, actor: a.actor || 'system', action: a.action, targetType: a.target_type,
        targetId: a.target_id, metadata: (() => { try { return JSON.parse(a.metadata); } catch { return {}; } })(),
        createdAt: a.created_at,
      }));
      return send(res, 200, { ok: true, ...paginated(items, total, page, pageSize) });
    }

    if (p === '/api/v1/admin/announcements' && method === 'GET') {
      if (!canContent) return fail(res, 403, 'forbidden', 'Content manager access required.');
      const items = db.prepare('SELECT * FROM announcements ORDER BY created_at DESC').all().map(mapAnnouncement);
      return send(res, 200, { ok: true, items });
    }

    if (p === '/api/v1/admin/announcements' && method === 'POST') {
      if (!canContent) return fail(res, 403, 'forbidden', 'Content manager access required.');
      const body = await readJson(req);
      const title = String(body.title || '').trim();
      if (!title) return validationError(res, ['Announcement title is required.']);
      const kind = ['release', 'community', 'supporter', 'maintenance'].includes(body.kind) ? body.kind : 'release';
      const publish = body.isPublished !== false;
      const id = uuid();
      const now = nowIso();
      db.prepare('INSERT INTO announcements (id, title, description, image_url, kind, is_published, published_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, title, String(body.description || '').trim(), body.imageUrl ? String(body.imageUrl) : null, kind, publish ? 1 : 0, publish ? now : null, now);
      audit(user.id, 'admin.announcement_created', 'announcement', id, { publish });
      const row = db.prepare('SELECT * FROM announcements WHERE id = ?').get(id);
      return send(res, 201, { ok: true, item: mapAnnouncement(row) });
    }

    if (p.startsWith('/api/v1/admin/announcements/') && method === 'PATCH') {
      if (!canContent) return fail(res, 403, 'forbidden', 'Content manager access required.');
      const id = p.slice('/api/v1/admin/announcements/'.length);
      const row = db.prepare('SELECT * FROM announcements WHERE id = ?').get(id);
      if (!row) return fail(res, 404, 'not_found', 'Announcement not found.');
      const body = await readJson(req);
      const title = String(body.title ?? row.title).trim();
      const description = String(body.description ?? row.description ?? '').trim();
      const kind = String(body.kind ?? row.kind ?? 'release');
      if (!title) return validationError(res, ['Announcement title is required.']);
      if (title.length > 200) return validationError(res, ['Announcement title must be 200 characters or fewer.']);
      if (!['release', 'community', 'supporter', 'maintenance'].includes(kind)) return validationError(res, ['Announcement kind is invalid.']);
      const publish = typeof body.isPublished === 'boolean' ? body.isPublished : Boolean(row.is_published);
      const archived = typeof body.archived === 'boolean' ? body.archived : Boolean(row.archived_at);
      db.prepare(`UPDATE announcements
        SET title = ?, description = ?, image_url = ?, kind = ?, is_published = ?, published_at = ?, archived_at = ?
        WHERE id = ?`)
        .run(
          title, description,
          body.imageUrl === undefined ? row.image_url : (body.imageUrl ? String(body.imageUrl) : null),
          kind, publish ? 1 : 0,
          publish ? (row.published_at || nowIso()) : row.published_at,
          archived ? (row.archived_at || nowIso()) : null,
          id,
        );
      audit(user.id, 'admin.announcement_updated', 'announcement', id, { publish, archived, kind });
      return send(res, 200, { ok: true, item: mapAnnouncement(db.prepare('SELECT * FROM announcements WHERE id = ?').get(id)) });
    }

    if (p === '/api/v1/admin/messages' && method === 'GET') {
      if (!canSupport) return fail(res, 403, 'forbidden', 'Support manager access required.');
      const status = String(url.searchParams.get('status') || '').trim();
      const { page, pageSize, offset } = pageParams(url);
      const where = status ? 'WHERE status = ?' : '';
      const params = status ? [status] : [];
      const total = db.prepare(`SELECT COUNT(*) AS n FROM contact_messages ${where}`).get(...params).n;
      const items = db.prepare(`
        SELECT m.*, p.username FROM contact_messages m
        LEFT JOIN profiles p ON p.id = m.user_id
        ${where} ORDER BY m.created_at DESC LIMIT ? OFFSET ?
      `).all(...params, pageSize, offset).map((m) => ({
        id: m.id, name: m.name, email: m.email, subject: m.subject, message: m.message,
        status: m.status, username: m.username, userId: m.user_id,
        createdAt: m.created_at, handledAt: m.handled_at,
      }));
      return send(res, 200, { ok: true, ...paginated(items, total, page, pageSize) });
    }

    if (p.startsWith('/api/v1/admin/messages/') && method === 'PATCH') {
      if (!canSupport) return fail(res, 403, 'forbidden', 'Support manager access required.');
      const id = p.slice('/api/v1/admin/messages/'.length);
      const message = db.prepare('SELECT * FROM contact_messages WHERE id = ?').get(id);
      if (!message) return fail(res, 404, 'not_found', 'Contact message not found.');
      const body = await readJson(req);
      const status = String(body.status || '');
      if (!['new', 'handled', 'archived'].includes(status)) return validationError(res, ['Message status must be new, handled or archived.']);
      db.prepare('UPDATE contact_messages SET status = ?, handled_at = ? WHERE id = ?')
        .run(status, status === 'new' ? null : nowIso(), id);
      audit(user.id, 'admin.contact_message_updated', 'contact_message', id, { status });
      return send(res, 200, { ok: true });
    }

    if (p === '/api/v1/admin/gallery' && method === 'GET') {
      if (!canContent) return fail(res, 403, 'forbidden', 'Content manager access required.');
      const content = db.prepare(`${CONTENT_SELECT} WHERE c.category_id = (SELECT id FROM categories WHERE slug = 'gallery') ORDER BY c.created_at DESC`)
        .all().map(mapContent);
      const submissions = db.prepare(`
        SELECT s.*, p.username, p.display_name AS author_name FROM community_submissions s
        LEFT JOIN profiles p ON p.id = s.user_id ORDER BY s.created_at DESC LIMIT 100
      `).all().map((s) => ({ ...publicSubmission(s), moderationStatus: s.moderation_status, mediaUrl: s.media_url, createdAt: s.created_at }));
      return send(res, 200, { ok: true, content, submissions });
    }

    if (p.startsWith('/api/v1/admin/community/') && method === 'PATCH') {
      if (!canContent) return fail(res, 403, 'forbidden', 'Content manager access required.');
      const id = p.slice('/api/v1/admin/community/'.length);
      const submission = db.prepare('SELECT * FROM community_submissions WHERE id = ?').get(id);
      if (!submission) return fail(res, 404, 'not_found', 'Submission not found.');
      const body = await readJson(req);
      const status = String(body.moderationStatus || '');
      if (!['pending', 'approved', 'rejected'].includes(status)) return validationError(res, ['moderationStatus is invalid.']);
      db.prepare('UPDATE community_submissions SET moderation_status = ? WHERE id = ?').run(status, id);
      if (submission.user_id) notify(submission.user_id, `Submission ${status}`, `Your community submission "${submission.title}" was ${status}.`, 'community');
      audit(user.id, 'admin.submission_moderated', 'submission', id, { status });
      return send(res, 200, { ok: true });
    }

    // --------------------------------------------------------------- ADMIN PARITY
    const adminContentVersionMatch = p.match(/^\/api\/v1\/admin\/content\/([^/]+)\/versions$/);
    if (adminContentVersionMatch && method === 'POST') {
      if (!canContent) return fail(res, 403, 'forbidden', 'Content manager access required.');
      const contentId = adminContentVersionMatch[1];
      const contentRow = db.prepare('SELECT * FROM content WHERE id = ?').get(contentId);
      if (!contentRow) return fail(res, 404, 'not_found', 'Content not found.');
      const body = await readJson(req);
      const version = String(body.version || '').trim();
      if (!version) return validationError(res, ['Version is required.']);
      const fileSizeRaw = body.fileSizeMb ?? body.file_size ?? null;
      const fileSize = fileSizeRaw === null || fileSizeRaw === '' ? null : Number(fileSizeRaw);
      const sha256 = String(body.sha256 || '').trim() || null;
      const changelog = String(body.changelog || '').trim();
      let storageObjectId = body.storageObjectId || body.storage_object_id || null;
      if (!storageObjectId && (body.packageData || body.storageReference)) {
        let storageReference = body.storageReference;
        let sizeMb = fileSize;
        let checksum = sha256;
        if (body.packageData) {
          try {
            const saved = saveUploadedPackage(contentRow.slug, body.packageData);
            storageReference = saved.storageReference;
            sizeMb = saved.sizeMb;
            checksum = saved.sha256;
          } catch (error) {
            return fail(res, error.status || 422, error.code || 'invalid_package', error.message);
          }
        }
        if (storageReference) {
          const sid = uuid();
          db.prepare('INSERT INTO storage_objects (id, provider, provider_file_id, object_type, file_name, file_size, sha256, availability_status, last_verified_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
            .run(sid, storageReference.startsWith('stored:') ? 'local' : 'demo', storageReference, 'package', storageReference, sizeMb === null ? null : Math.round(sizeMb * 1024 * 1024), checksum, 'available', nowIso(), nowIso());
          storageObjectId = sid;
        }
        if (sizeMb !== null) fileSize = Math.round(sizeMb * 1024 * 1024);
        if (checksum) sha256 = checksum;
      }
      const id = uuid();
      db.prepare('INSERT INTO content_versions (id, content_id, version, file_size, sha256, storage_object_id, changelog, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, contentId, version, fileSize, sha256, storageObjectId, changelog, nowIso());
      db.prepare('UPDATE content SET version = ?, file_size = COALESCE(?, file_size), sha256 = COALESCE(?, sha256), storage_object_id = COALESCE(?, storage_object_id), content_version_id = ?, updated_at = ? WHERE id = ?')
        .run(version, fileSize, sha256, storageObjectId, id, nowIso(), contentId);
      audit(user.id, 'admin.content_version_created', 'content', contentId, { version, storageObjectId });
      logSecurityEvent(user.id, 'content_version_created', 'info', { contentId, version });
      return send(res, 201, { ok: true, item: { id, contentId, version, fileSize, sha256, storageObjectId, changelog } });
    }

    if (p === '/api/v1/admin/storage-objects' && method === 'GET') {
      if (!canContent) return fail(res, 403, 'forbidden', 'Content manager access required.');
      const items = db.prepare('SELECT * FROM storage_objects ORDER BY created_at DESC').all().map((s) => ({
        id: s.id, provider: s.provider, providerFileId: s.provider_file_id, objectType: s.object_type,
        fileName: s.file_name, fileSize: s.file_size, sha256: s.sha256, availabilityStatus: s.availability_status,
        lastVerifiedAt: s.last_verified_at, createdAt: s.created_at,
      }));
      return send(res, 200, { ok: true, items });
    }

    if (p === '/api/v1/admin/storage-objects' && method === 'POST') {
      if (!canContent) return fail(res, 403, 'forbidden', 'Content manager access required.');
      const body = await readJson(req);
      const provider = String(body.provider || 'local').trim();
      const providerFileId = String(body.providerFileId || body.provider_file_id || '').trim();
      if (!providerFileId) return validationError(res, ['Provider file id is required.']);
      const id = uuid();
      db.prepare('INSERT INTO storage_objects (id, provider, provider_file_id, object_type, file_name, file_size, sha256, availability_status, last_verified_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, provider, providerFileId, String(body.objectType || body.object_type || 'package'), String(body.fileName || body.file_name || providerFileId), body.fileSize ?? body.file_size ?? null, body.sha256 || null, 'available', nowIso(), nowIso());
      audit(user.id, 'admin.storage_object_created', 'storage_object', id, { provider });
      return send(res, 201, { ok: true, item: { id, provider, providerFileId } });
    }

    if (p === '/api/v1/admin/security-events' && method === 'GET') {
      if (!canAnalytics) return fail(res, 403, 'forbidden', 'Analytics access required.');
      const { page, pageSize, offset } = pageParams(url);
      const total = db.prepare('SELECT COUNT(*) AS n FROM security_events').get().n;
      const items = db.prepare('SELECT se.*, p.username FROM security_events se LEFT JOIN profiles p ON p.id = se.user_id ORDER BY se.created_at DESC LIMIT ? OFFSET ?').all(pageSize, offset).map((e) => ({
        id: e.id, userId: e.user_id, username: e.username, eventType: e.event_type, severity: e.severity,
        metadata: JSON.parse(e.metadata || '{}'), createdAt: e.created_at,
      }));
      return send(res, 200, { ok: true, ...paginated(items, total, page, pageSize) });
    }

    if (p === '/api/v1/admin/security/dashboard' && method === 'GET') {
      if (!canAnalytics) return fail(res, 403, 'forbidden', 'Analytics access required.');
      const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const activeSessions = db.prepare(`SELECT COUNT(*) AS n FROM visitor_sessions WHERE last_seen_at >= ?`).get(since24h).n;
      const visitorsToday = db.prepare(`SELECT COUNT(DISTINCT session_id) AS n FROM visitor_events WHERE created_at >= ?`).get(since24h).n;
      const visitors7d = db.prepare(`SELECT COUNT(DISTINCT session_id) AS n FROM visitor_events WHERE created_at >= ?`).get(since7d).n;
      const visitors30d = db.prepare(`SELECT COUNT(DISTINCT session_id) AS n FROM visitor_events WHERE created_at >= ?`).get(new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()).n;
      const failedLogins = db.prepare(`SELECT COUNT(*) AS n FROM security_events WHERE event_type = 'auth.login_failed' AND created_at >= ?`).get(since24h).n;
      const blockedIps = db.prepare(`SELECT COUNT(*) AS n FROM ip_access_rules WHERE rule_type = 'block'`).get().n;
      const openAlerts = db.prepare(`SELECT COUNT(*) AS n FROM security_alerts WHERE status = 'open'`).get().n;
      const countryRows = db.prepare(`SELECT country, COUNT(*) AS n FROM visitor_sessions GROUP BY country ORDER BY n DESC LIMIT 10`).all();
      const cityRows = db.prepare(`SELECT city, country, COUNT(*) AS n FROM visitor_sessions GROUP BY city, country ORDER BY n DESC LIMIT 10`).all();
      const recentAlerts = db.prepare(`SELECT * FROM security_alerts ORDER BY created_at DESC LIMIT 10`).all().map((a) => ({ id: a.id, severity: a.severity, title: a.title, description: a.description, status: a.status, createdAt: a.created_at }));
      const recentEvents = db.prepare(`SELECT se.*, p.username FROM security_events se LEFT JOIN profiles p ON p.id = se.user_id ORDER BY se.created_at DESC LIMIT 15`).all().map((e) => ({ id: e.id, userId: e.user_id, username: e.username, eventType: e.event_type, severity: e.severity, metadata: JSON.parse(e.metadata || '{}'), createdAt: e.created_at }));
      return send(res, 200, { ok: true, data: { activeSessions, visitorsToday, visitors7d, visitors30d, failedLogins, blockedIps, openAlerts, countryRows, cityRows, recentAlerts, recentEvents } });
    }

    if (p === '/api/v1/admin/security/visitors' && method === 'GET') {
      if (!canAnalytics) return fail(res, 403, 'forbidden', 'Analytics access required.');
      const { page, pageSize, offset } = pageParams(url);
      const country = String(url.searchParams.get('country') || '').trim();
      const ip = String(url.searchParams.get('ip') || '').trim();
      const where = [];
      const params = [];
      if (country) { where.push('country = ?'); params.push(country); }
      if (ip) { where.push('ip_address LIKE ?'); params.push(`%${ip}%`); }
      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const total = db.prepare(`SELECT COUNT(*) AS n FROM visitor_sessions ${whereSql}`).get(...params).n;
      const items = db.prepare(`SELECT * FROM visitor_sessions ${whereSql} ORDER BY last_seen_at DESC LIMIT ? OFFSET ?`).all(...params, pageSize, offset).map((s) => ({
        id: s.id, sessionId: s.session_id, ip: s.ip_address, country: s.country, region: s.region, city: s.city,
        isp: s.isp, asn: s.asn, browser: s.browser, os: s.os, deviceType: s.device_type, referrer: s.referrer,
        landingPage: s.landing_page, userId: s.user_id, firstSeenAt: s.first_seen_at, lastSeenAt: s.last_seen_at,
        pageViews: s.page_views, isBlocked: Boolean(s.is_blocked),
      }));
      return send(res, 200, { ok: true, ...paginated(items, total, page, pageSize) });
    }

    const visitorTimelineMatch = p.match(/^\/api\/v1\/admin\/security\/visitors\/([^/]+)$/);
    if (visitorTimelineMatch && method === 'GET') {
      if (!canAnalytics) return fail(res, 403, 'forbidden', 'Analytics access required.');
      const sessionId = decodeURIComponent(visitorTimelineMatch[1]);
      const session = db.prepare('SELECT * FROM visitor_sessions WHERE session_id = ?').get(sessionId);
      if (!session) return fail(res, 404, 'not_found', 'Visitor session not found.');
      const events = db.prepare('SELECT * FROM visitor_events WHERE session_id = ? ORDER BY created_at ASC').all(sessionId).map((e) => ({
        id: e.id, eventType: e.event_type, pagePath: e.page_path, metadata: JSON.parse(e.metadata || '{}'), ip: e.ip_address, createdAt: e.created_at,
      }));
      return send(res, 200, { ok: true, session: { id: session.id, sessionId: session.session_id, ip: session.ip_address, country: session.country, region: session.region, city: session.city, isp: session.isp, asn: session.asn, browser: session.browser, os: session.os, deviceType: session.device_type, referrer: session.referrer, landingPage: session.landing_page, userId: session.user_id, firstSeenAt: session.first_seen_at, lastSeenAt: session.last_seen_at, pageViews: session.page_views }, events });
    }

    if (p === '/api/v1/admin/security/alerts' && method === 'GET') {
      if (!canAnalytics) return fail(res, 403, 'forbidden', 'Analytics access required.');
      const status = String(url.searchParams.get('status') || '').trim();
      const severity = String(url.searchParams.get('severity') || '').trim();
      const { page, pageSize, offset } = pageParams(url);
      const where = [];
      const params = [];
      if (status) { where.push('status = ?'); params.push(status); }
      if (severity) { where.push('severity = ?'); params.push(severity); }
      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const total = db.prepare(`SELECT COUNT(*) AS n FROM security_alerts ${whereSql}`).get(...params).n;
      const items = db.prepare(`SELECT * FROM security_alerts ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, pageSize, offset).map((a) => ({ id: a.id, severity: a.severity, title: a.title, description: a.description, metadata: JSON.parse(a.metadata || '{}'), status: a.status, createdAt: a.created_at, acknowledgedBy: a.acknowledged_by, acknowledgedAt: a.acknowledged_at }));
      return send(res, 200, { ok: true, ...paginated(items, total, page, pageSize) });
    }

    const alertAckMatch = p.match(/^\/api\/v1\/admin\/security\/alerts\/([^/]+)\/acknowledge$/);
    if (alertAckMatch && method === 'POST') {
      if (!canAnalytics) return fail(res, 403, 'forbidden', 'Analytics access required.');
      const id = alertAckMatch[1];
      const alert = db.prepare('SELECT * FROM security_alerts WHERE id = ?').get(id);
      if (!alert) return fail(res, 404, 'not_found', 'Alert not found.');
      const user = authUser(req);
      db.prepare('UPDATE security_alerts SET status = ?, acknowledged_by = ?, acknowledged_at = ? WHERE id = ?').run('acknowledged', user.id, nowIso(), id);
      audit(user.id, 'security.alert_acknowledged', 'security_alert', id, {});
      return send(res, 200, { ok: true });
    }

    if (p === '/api/v1/admin/security/ip-rules' && method === 'GET') {
      if (!canAnalytics) return fail(res, 403, 'forbidden', 'Analytics access required.');
      const items = db.prepare('SELECT r.*, p.username FROM ip_access_rules r LEFT JOIN profiles p ON p.id = r.created_by ORDER BY r.created_at DESC').all().map((r) => ({ id: r.id, ip: r.ip_address, ruleType: r.rule_type, scope: r.scope, reason: r.reason, expiresAt: r.expires_at, createdBy: r.username, createdAt: r.created_at }));
      return send(res, 200, { ok: true, items });
    }

    if (p === '/api/v1/admin/security/ip-rules' && method === 'POST') {
      if (!canAnalytics) return fail(res, 403, 'forbidden', 'Analytics access required.');
      const user = authUser(req);
      const body = await readJson(req);
      const ip = String(body.ip || body.ipAddress || '').trim();
      if (!ip) return validationError(res, ['IP address is required.']);
      const ruleType = body.ruleType === 'allow' ? 'allow' : 'block';
      // Prevent locking out the current admin
      if (ruleType === 'block' && ip === clientIp(req)) return fail(res, 400, 'self_lockout', 'You cannot block your own current IP address.');
      const scope = body.permanent ? 'permanent' : 'temporary';
      const expiresAt = body.permanent ? null : (body.expiresAt || new Date(Date.now() + 24 * 3600 * 1000).toISOString());
      const id = uuid();
      db.prepare('INSERT INTO ip_access_rules (id, ip_address, rule_type, scope, reason, expires_at, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, ip, ruleType, scope, String(body.reason || '').trim(), expiresAt, user.id, nowIso());
      if (ruleType === 'block') {
        db.prepare('UPDATE visitor_sessions SET is_blocked = 1 WHERE ip_address = ?').run(ip);
        createSecurityAlert('high', `IP ${ruleType === 'block' ? 'blocked' : 'allowed'}`, `${ip} was ${ruleType}ed by ${user.username}.`, { ip, admin: user.username });
      }
      audit(user.id, `security.ip_${ruleType}ed`, 'ip', null, { ip, scope, reason: body.reason });
      return send(res, 201, { ok: true, item: { id, ip, ruleType, scope, expiresAt } });
    }

    const ipUnblockMatch = p.match(/^\/api\/v1\/admin\/security\/ip-rules\/([^/]+)$/);
    if (ipUnblockMatch && method === 'DELETE') {
      if (!canAnalytics) return fail(res, 403, 'forbidden', 'Analytics access required.');
      const id = ipUnblockMatch[1];
      const rule = db.prepare('SELECT * FROM ip_access_rules WHERE id = ?').get(id);
      if (!rule) return fail(res, 404, 'not_found', 'IP rule not found.');
      db.prepare('DELETE FROM ip_access_rules WHERE id = ?').run(id);
      db.prepare('UPDATE visitor_sessions SET is_blocked = 0 WHERE ip_address = ?').run(rule.ip_address);
      const user = authUser(req);
      audit(user.id, 'security.ip_unblocked', 'ip', null, { ip: rule.ip_address });
      return send(res, 200, { ok: true });
    }

    const suspendMatch = p.match(/^\/api\/v1\/admin\/security\/accounts\/([^/]+)\/suspend$/);
    if (suspendMatch && method === 'POST') {
      if (!canAnalytics) return fail(res, 403, 'forbidden', 'Analytics access required.');
      const user = authUser(req);
      const id = suspendMatch[1];
      const target = db.prepare('SELECT * FROM profiles WHERE id = ?').get(id);
      if (!target) return fail(res, 404, 'not_found', 'User not found.');
      if (target.id === user.id) return fail(res, 400, 'self_suspend', 'You cannot suspend your own account.');
      const body = await readJson(req);
      db.prepare('UPDATE profiles SET account_status = ?, updated_at = ? WHERE id = ?').run('suspended', nowIso(), id);
      db.prepare('INSERT INTO account_security_actions (id, user_id, action, reason, admin_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(uuid(), id, 'suspend', String(body.reason || '').trim(), user.id, nowIso());
      audit(user.id, 'security.account_suspended', 'user', id, { reason: body.reason });
      createSecurityAlert('high', 'Account suspended', `Account ${target.username} suspended by ${user.username}.`, { userId: id, admin: user.username });
      return send(res, 200, { ok: true });
    }

    const revokeMatch = p.match(/^\/api\/v1\/admin\/security\/accounts\/([^/]+)\/revoke-sessions$/);
    if (revokeMatch && method === 'POST') {
      if (!canAnalytics) return fail(res, 403, 'forbidden', 'Analytics access required.');
      const user = authUser(req);
      const id = revokeMatch[1];
      const target = db.prepare('SELECT * FROM profiles WHERE id = ?').get(id);
      if (!target) return fail(res, 404, 'not_found', 'User not found.');
      db.prepare('INSERT INTO account_security_actions (id, user_id, action, reason, admin_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(uuid(), id, 'revoke_sessions', 'Manual revocation', user.id, nowIso());
      audit(user.id, 'security.sessions_revoked', 'user', id, {});
      return send(res, 200, { ok: true, message: 'Sessions revoked.' });
    }

    if (p === '/api/v1/admin/security/settings' && method === 'GET') {
      if (!canAnalytics) return fail(res, 403, 'forbidden', 'Analytics access required.');
      const rows = db.prepare('SELECT * FROM security_settings').all();
      const values = { retentionDays: 90, countryPolicy: 'allow_all', blockVpn: false, rateLimitThreshold: 100, alertThreshold: 5 };
      for (const row of rows) {
        try { values[row.setting_key] = JSON.parse(row.setting_value); } catch { values[row.setting_key] = row.setting_value; }
      }
      return send(res, 200, { ok: true, settings: values });
    }

    if (p === '/api/v1/admin/security/settings' && method === 'PATCH') {
      if (!canAnalytics) return fail(res, 403, 'forbidden', 'Analytics access required.');
      const user = authUser(req);
      const body = await readJson(req);
      for (const [key, value] of Object.entries(body)) {
        db.prepare(`INSERT INTO security_settings (setting_key, setting_value, updated_at) VALUES (?, ?, ?)
          ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = excluded.updated_at`)
          .run(key, JSON.stringify(value), nowIso());
      }
      audit(user.id, 'security.settings_updated', 'settings', null, { keys: Object.keys(body) });
      return send(res, 200, { ok: true });
    }

    if (p === '/api/v1/admin/media/image' && method === 'POST') {
      if (!canContent) return fail(res, 403, 'forbidden', 'Content manager access required.');
      const body = await readJson(req, 10 * 1024 * 1024);
      const data = String(body.data || body.image || '').trim();
      if (!data) return validationError(res, ['Image data is required.']);
      const folder = String(body.folder || 'littlekrishna').trim();
      if (isCloudinaryConfigured()) {
        const signed = signUpload({ folder });
        const base64 = data.startsWith('data:') ? data.slice(data.indexOf(',') + 1) : data;
        const form = new FormData();
        form.append('file', `data:image/png;base64,${base64}`);
        form.append('api_key', signed.apiKey);
        form.append('timestamp', String(signed.timestamp));
        form.append('signature', signed.signature);
        form.append('folder', folder);
        const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`, { method: 'POST', body: form });
        const cloudJson = await cloudRes.json();
        if (!cloudRes.ok) return fail(res, 502, 'cloudinary_error', cloudJson?.error?.message || 'Cloudinary upload failed.');
        audit(user.id, 'admin.image_uploaded', 'media', null, { url: cloudJson.secure_url });
        return send(res, 201, { ok: true, url: cloudJson.secure_url, publicId: cloudJson.public_id });
      }
      // Fallback: store locally
      const base64 = data.startsWith('data:') ? data.slice(data.indexOf(',') + 1) : data;
      const buffer = Buffer.from(base64, 'base64');
      fs.mkdirSync(path.join(STORAGE_DIR, 'images'), { recursive: true });
      const name = `${crypto.randomBytes(8).toString('hex')}.png`;
      fs.writeFileSync(path.join(STORAGE_DIR, 'images', name), buffer);
      const url = `/api/v1/community/media/${name}`; // reuse media route? not exact; return local path
      return send(res, 201, { ok: true, url: `/storage/images/${name}`, publicId: name, local: true });
    }

    if (p === '/api/v1/admin/storage/drive/status' && method === 'GET') {
      if (!canContent) return fail(res, 403, 'forbidden', 'Content manager access required.');
      const { testConnection } = await import('./lib/google-drive.mjs');
      const result = await testConnection();
      return send(res, result.ok ? 200 : 503, { ok: result.ok, ...result });
    }

    if (p === '/api/v1/admin/storage/drive/metadata' && method === 'POST') {
      if (!canContent) return fail(res, 403, 'forbidden', 'Content manager access required.');
      const body = await readJson(req);
      const fileId = String(body.fileId || body.file_id || '').trim();
      if (!fileId) return validationError(res, ['Drive file ID is required.']);
      const { getFileMetadata, checkAvailability } = await import('./lib/google-drive.mjs');
      const result = await checkAvailability(fileId);
      if (!result.available) return fail(res, 404, 'drive_file_unavailable', result.error);
      return send(res, 200, { ok: true, metadata: result.metadata });
    }

    if (p === '/api/v1/admin/storage/drive/register' && method === 'POST') {
      if (!canContent) return fail(res, 403, 'forbidden', 'Content manager access required.');
      const body = await readJson(req);
      const contentId = String(body.contentId || body.content_id || '').trim();
      const fileId = String(body.fileId || body.file_id || '').trim();
      if (!contentId || !fileId) return validationError(res, ['Content ID and Drive file ID are required.']);
      const contentRow = db.prepare('SELECT * FROM content WHERE id = ?').get(contentId);
      if (!contentRow) return fail(res, 404, 'not_found', 'Content not found.');
      const { getFileMetadata, checkAvailability } = await import('./lib/google-drive.mjs');
      const avail = await checkAvailability(fileId);
      if (!avail.available) return fail(res, 404, 'drive_file_unavailable', avail.error);
      const meta = avail.metadata;
      const storageId = uuid();
      db.prepare('INSERT INTO storage_objects (id, provider, provider_file_id, object_type, file_name, file_size, sha256, availability_status, last_verified_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(storageId, 'google_drive', fileId, 'package', meta.name, meta.size, null, 'available', nowIso(), nowIso());
      db.prepare('UPDATE content SET storage_reference = ?, storage_object_id = ?, file_size = ?, updated_at = ? WHERE id = ?')
        .run(`drive:${fileId}`, storageId, meta.size, nowIso(), contentId);
      audit(user.id, 'admin.drive_file_registered', 'content', contentId, { fileId, fileName: meta.name, size: meta.size });
      return send(res, 200, { ok: true, item: { contentId, fileId, fileName: meta.name, fileSize: meta.size, storageObjectId: storageId } });
    }

    if (p === '/api/v1/admin/settings' && method === 'GET') {
      if (!canSettings) return fail(res, 403, 'forbidden', 'Super admin access required.');
      const defaults = {
        site_name: 'LittleKrishna.com',
        supporter_price_label: 'Supporter access is token-based',
        maintenance_message: '',
        analytics_enabled: true,
        download_link_ttl_minutes: 5,
      };
      const rows = db.prepare('SELECT * FROM application_settings').all();
      const values = { ...defaults };
      for (const row of rows) {
        try { values[row.setting_key] = JSON.parse(row.setting_value); } catch { values[row.setting_key] = row.setting_value; }
      }
      return send(res, 200, { ok: true, settings: values });
    }

    if (p === '/api/v1/admin/settings' && method === 'PATCH') {
      if (!canSettings) return fail(res, 403, 'super_admin_required', 'Only a super admin can change settings.');
      const body = await readJson(req);
      const allowed = ['site_name', 'supporter_price_label', 'maintenance_message', 'analytics_enabled', 'download_link_ttl_minutes'];
      const now = nowIso();
      const updated = [];
      for (const key of allowed) {
        if (!(key in body)) continue;
        let value = body[key];
        if (key === 'download_link_ttl_minutes') {
          value = Number(value);
          if (!Number.isFinite(value) || value < 1 || value > 60) return validationError(res, ['Download link TTL must be 1-60 minutes.']);
        }
        if (key === 'analytics_enabled' && typeof value !== 'boolean') return validationError(res, ['analytics_enabled must be true or false.']);
        db.prepare(`
          INSERT INTO application_settings (id, setting_key, setting_value, updated_at) VALUES (?, ?, ?, ?)
          ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = excluded.updated_at
        `).run(uuid(), key, JSON.stringify(value), now);
        updated.push(key);
      }
      audit(user.id, 'admin.settings_updated', 'settings', null, { keys: updated });
      return send(res, 200, { ok: true, updated });
    }

    return fail(res, 404, 'not_found', 'Admin endpoint not found.');
  }

  if (p === '/api/v1/analytics/security-event' && method === 'POST') {
    const user = authUser(req);
    const body = await readJson(req);
    const eventType = String(body.eventType || body.event_type || '').trim();
    if (!eventType) return validationError(res, ['Event type is required.']);
    const severity = ['info', 'warning', 'critical'].includes(body.severity) ? body.severity : 'info';
    logSecurityEvent(user?.id, eventType, severity, body.metadata || {});
    return send(res, 202, { ok: true });
  }

  // Static frontend serving (production single-container deploy)
  const distDir = path.resolve(process.cwd(), 'frontend', 'dist');
  if (fs.existsSync(distDir)) {
    const filePath = path.join(distDir, p === '/' ? 'index.html' : p);
    if (filePath.startsWith(distDir) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000' });
      return fs.createReadStream(filePath).pipe(res);
    }
    // SPA fallback
    const indexFile = path.join(distDir, 'index.html');
    if (fs.existsSync(indexFile)) {
      res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache' });
      return fs.createReadStream(indexFile).pipe(res);
    }
  }

  return fail(res, 404, 'not_found', 'Endpoint not found.');

function downloadHistory(userId) {
  return db.prepare(`
    SELECT d.*, c.title AS content_title, c.slug AS content_slug, c.version, c.file_size AS file_size_mb
    FROM downloads d JOIN content c ON c.id = d.content_id
    WHERE d.user_id = ? ORDER BY d.created_at DESC LIMIT 200
  `).all(userId).map((d) => ({
    id: d.id,
    contentSlug: d.content_slug,
    contentTitle: d.content_title,
    version: d.version,
    status: d.status === 'started' || d.status === 'authorized' ? 'authorized' : d.status,
    authorizedAt: d.authorization_time,
    completedAt: d.completion_time,
    failureReason: d.failure_reason,
    fileSizeMb: d.file_size_mb,
  }));
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    await handle(req, res, url);
  } catch (error) {
    if (!error.status) console.error('[LittleKrishna API]', error);
    if (res.headersSent) return;
    fail(res, error.status || 500, error.code || 'internal_error', error.status ? error.message : 'An unexpected server error occurred.');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[LittleKrishna] API listening on http://127.0.0.1:${PORT}/api/v1`);
  console.log(`[LittleKrishna] Environment: ${NODE_ENV}`);
  const credFile = path.join(DATA_DIR, 'admin-credentials.txt');
  if (fs.existsSync(credFile)) console.log(`[LittleKrishna] Local credentials: ${credFile}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  });
}
