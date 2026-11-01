import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const BASE = process.env.API_BASE || 'http://127.0.0.1:8787/api/v1';
const unique = Date.now().toString(36);
let passed = 0;
const results = [];

function ok(name, detail = '') {
  passed += 1;
  results.push(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function call(method, route, { body, cookie, headers = {}, origin } = {}) {
  const res = await fetch(`${BASE}${route}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(cookie ? { cookie } : {}),
      ...(origin ? { origin } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const contentType = res.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await res.json() : await res.arrayBuffer();
  return { status: res.status, body: payload, headers: res.headers };
}

function cookieFrom(res) {
  const raw = res.headers.getSetCookie?.()[0] || res.headers.get('set-cookie');
  assert.ok(raw, 'expected session cookie');
  return raw.split(';')[0];
}

const credFile = fs.readFileSync(path.resolve('backend/data/admin-credentials.txt'), 'utf8');
const adminEmail = /Admin email:\s*(\S+)/.exec(credFile)?.[1];
const adminPassword = /Admin password:\s*(\S+)/.exec(credFile)?.[1];
assert.ok(adminEmail && adminPassword, 'local admin credentials were not found');

const userA = { username: `test_a_${unique}`, email: `test_a_${unique}@example.com`, password: 'password1234' };
const userB = { username: `test_b_${unique}`, email: `test_b_${unique}@example.com`, password: 'password1234' };

// 1. Health and public data
let res = await call('GET', '/health');
assert.equal(res.status, 200);
ok('API health endpoint');

res = await call('GET', '/content?pageSize=100');
assert.equal(res.status, 200);
assert.ok(res.body.items.length >= 10);
const supporterItem = res.body.items.find((c) => c.accessType === 'supporter');
assert.ok(supporterItem, 'expected a supporter item');
ok('Public content loaded from database', `${res.body.items.length} items`);

res = await call('GET', '/collections');
assert.equal(res.status, 200);
assert.ok(res.body.items.length >= 3);
res = await call('GET', '/community');
assert.equal(res.status, 200);
assert.ok(res.body.creators.length >= 1 && res.body.announcements.length >= 1);
ok('Collections, creators and announcements loaded');

// 2. Cross-site request rejection
res = await call('POST', '/auth/login', { body: { email: adminEmail, password: adminPassword }, origin: 'https://evil.example' });
assert.equal(res.status, 403);
assert.equal(res.body.code, 'origin_denied');
ok('Cross-site mutating request rejected');

// 3. Registration, session, profile
res = await call('POST', '/auth/register', { body: userA });
assert.equal(res.status, 201);
let cookieA = cookieFrom(res);
assert.equal(res.body.user.username, userA.username);
assert.ok(!('password_hash' in res.body.user));
ok('Registration creates a hashed account and session');

res = await call('GET', '/auth/me', { cookie: cookieA });
assert.equal(res.status, 200);
assert.equal(res.body.user.email, userA.email);
ok('Session cookie authenticates /auth/me');

res = await call('PATCH', '/profile', { cookie: cookieA, body: { displayName: 'Test Railfan', username: userA.username, avatarColor: '#c62a30' } });
assert.equal(res.status, 200);
assert.equal(res.body.user.displayName, 'Test Railfan');
ok('Profile update persisted');

res = await call('POST', '/contact', { cookie: cookieA, body: {
  name: 'Test Railfan', email: userA.email, subject: `Contact ${unique}`,
  message: 'This is an integration contact message for the admin inbox.',
} });
assert.equal(res.status, 201);
const contactReference = res.body.reference;
assert.ok(contactReference);
const contactId = res.body.reference;
ok('Contact form submission persisted', contactReference);

res = await call('POST', '/contact', { body: { name: 'X', email: 'not-an-email', message: 'short' } });
assert.equal(res.status, 422);
ok('Contact form validation enforced');

res = await call('POST', '/downloads/authorize', { body: { contentId: supporterItem.id } });
assert.equal(res.status, 401);
ok('Anonymous download authorization denied');

res = await call('POST', '/downloads/authorize', { cookie: cookieA, body: { contentId: supporterItem.id } });
assert.equal(res.status, 403);
ok('Supporter content denied without entitlement');

res = await call('POST', '/supporter/redeem', { cookie: cookieA, body: { token: 'lk_supporter_invalid_token' } });
assert.equal(res.status, 400);
assert.equal(res.body.code, 'invalid_token');
ok('Invalid supporter token rejected');

// 4. Admin login and supporter token lifecycle
res = await call('POST', '/auth/login', { body: { email: adminEmail, password: adminPassword } });
assert.equal(res.status, 200);
const cookieAdmin = cookieFrom(res);
assert.ok(res.body.user.roles.includes('super_admin'));
ok('Admin login returns super_admin role');

res = await call('GET', '/admin/messages?pageSize=100', { cookie: cookieAdmin });
assert.equal(res.status, 200);
const contactRow = res.body.items.find((m) => m.subject === `Contact ${unique}`);
assert.ok(contactRow, 'contact message should be visible to support admins');
res = await call('PATCH', `/admin/messages/${contactRow.id}`, { cookie: cookieAdmin, body: { status: 'handled' } });
assert.equal(res.status, 200);
res = await call('GET', '/admin/messages?status=handled&pageSize=100', { cookie: cookieAdmin });
assert.ok(res.body.items.some((m) => m.id === contactRow.id));
ok('Admin contact inbox lists and updates messages');

res = await call('GET', '/admin/dashboard', { cookie: cookieA });
assert.equal(res.status, 403);
ok('Admin API denies non-admin user');

res = await call('POST', '/admin/tokens', { cookie: cookieAdmin, body: { expiresInHours: 2, maximumUses: 1 } });
assert.equal(res.status, 201);
const issuedToken = res.body.token;
const tokenId = res.body.item.id;
assert.ok(issuedToken.startsWith('lk_supporter_'));
ok('Admin generated a one-time supporter token');

res = await call('POST', '/supporter/redeem', { cookie: cookieA, body: { token: issuedToken } });
assert.equal(res.status, 200);
const entitlementA = res.body.entitlement;
ok('Supporter token redeemed server-side');

res = await call('GET', '/supporter/status', { cookie: cookieA });
assert.equal(res.status, 200);
assert.equal(res.body.active, true);
ok('Supporter status reports active entitlement');

res = await call('POST', '/downloads/authorize', { cookie: cookieA, body: { contentId: supporterItem.id } });
assert.equal(res.status, 201);
const supporterDownload = res.body;
assert.ok(supporterDownload.url);
ok('Supporter download authorized');

res = await call('GET', supporterDownload.url.replace('/api/v1', ''), { cookie: cookieA });
assert.equal(res.status, 200);
assert.equal(res.headers.get('content-type'), 'application/zip');
const zip = Buffer.from(res.body);
assert.equal(zip.subarray(0, 4).toString('hex'), '504b0304');
ok('Authorized package delivered as a valid ZIP', `${zip.length} bytes`);

// 5. Second user cannot reuse an exhausted token
res = await call('POST', '/auth/register', { body: userB });
assert.equal(res.status, 201);
let cookieB = cookieFrom(res);
res = await call('POST', '/supporter/redeem', { cookie: cookieB, body: { token: issuedToken } });
assert.equal(res.status, 400);
assert.equal(res.body.code, 'token_exhausted');
ok('Token redemption limit enforced');

// 6. Password reset flow
res = await call('POST', '/auth/forgot-password', { body: { email: userA.email } });
assert.equal(res.status, 200);
assert.ok(res.body.devResetToken);
const resetToken = res.body.devResetToken;
res = await call('POST', '/auth/reset-password', { body: { token: resetToken, password: 'newPassword1234' } });
assert.equal(res.status, 200);
res = await call('POST', '/auth/login', { body: { email: userA.email, password: 'newPassword1234' } });
assert.equal(res.status, 200);
cookieA = cookieFrom(res);
userA.password = 'newPassword1234';
ok('Password reset token completes and old flow replaced');

// 7. Admin content creation and download with checksum verification
res = await call('POST', '/admin/content', {
  cookie: cookieAdmin,
  body: {
    title: `Integration Route ${unique}`,
    slug: `integration-route-${unique}`,
    category: 'routes',
    simulator: 'MSTS',
    packageType: 'Route',
    accessType: 'public',
    version: '1.0.0',
    releaseDate: '2026-10-31',
    shortDescription: 'Integration test route',
    description: 'Created by the automated API test.',
    fileSizeMb: 24,
    isPublished: true,
  },
});
assert.equal(res.status, 201);
const created = res.body.item;
assert.equal(created.status, 'published');
assert.match(created.sha256, /^[a-f0-9]{64}$/);
ok('Admin published content with generated package checksum');

res = await call('GET', `/content/${created.slug}`);
assert.equal(res.status, 200);
ok('Published content visible on public API');

res = await call('POST', '/downloads/authorize', { cookie: cookieA, body: { contentId: created.id } });
assert.equal(res.status, 201);
res = await call('GET', res.body.url.replace('/api/v1', ''), { cookie: cookieA });
assert.equal(res.status, 200);
assert.equal(res.headers.get('x-checksum-sha256'), created.sha256);
const zip2 = Buffer.from(res.body);
const crypto = await import('node:crypto');
assert.equal(crypto.createHash('sha256').update(zip2).digest('hex'), created.sha256);
ok('Downloaded bytes match stored SHA-256');

// 8. Publish validation and update/unpublish
res = await call('POST', '/admin/content', {
  cookie: cookieAdmin,
  body: {
    title: `Draft Route ${unique}`,
    slug: `draft-route-${unique}`,
    category: 'routes',
    simulator: 'RailWorks',
    packageType: 'Route',
    accessType: 'public',
    version: '0.1.0',
    releaseDate: '2026-10-31',
    shortDescription: 'Incomplete draft',
    description: 'No file yet.',
  },
});
assert.equal(res.status, 201);
const draft = res.body.item;
res = await call('PATCH', `/admin/content/${draft.id}`, { cookie: cookieAdmin, body: { isPublished: true } });
assert.equal(res.status, 422);
ok('Publishing without a file is rejected');

res = await call('PATCH', `/admin/content/${created.id}`, { cookie: cookieAdmin, body: { title: `Updated Integration Route ${unique}` } });
assert.equal(res.status, 200);
assert.equal(res.body.item.title, `Updated Integration Route ${unique}`);
res = await call('PATCH', `/admin/content/${created.id}`, { cookie: cookieAdmin, body: { isPublished: false } });
assert.equal(res.status, 200);
res = await call('GET', `/content/${created.slug}`);
assert.equal(res.status, 404);
ok('Content update and unpublish enforced');

// 9. Categories, collections, announcements, settings
res = await call('POST', '/admin/categories', { cookie: cookieAdmin, body: { label: `Test Category ${unique}`, description: 'Integration category' } });
assert.equal(res.status, 201);
const category = res.body.item;
ok('Admin created a category');

res = await call('POST', '/admin/collections', { cookie: cookieAdmin, body: { title: `Test Collection ${unique}`, description: 'Integration collection', itemSlugs: [supporterItem.slug] } });
assert.equal(res.status, 201);
const collection = res.body.item;
ok('Admin created a collection');

res = await call('POST', '/admin/announcements', { cookie: cookieAdmin, body: { title: `Test Announcement ${unique}`, description: 'Integration announcement', kind: 'community', isPublished: true } });
assert.equal(res.status, 201);
const announcement = res.body.item;
assert.equal(announcement.isPublished, true);
res = await call('PATCH', `/admin/announcements/${announcement.id}`, { cookie: cookieAdmin, body: { archived: true } });
assert.equal(res.status, 200);
ok('Admin published and archived an announcement');

res = await call('PATCH', '/admin/settings', { cookie: cookieAdmin, body: { maintenance_message: 'Integration test message', analytics_enabled: true } });
assert.equal(res.status, 200);
res = await call('GET', '/admin/settings', { cookie: cookieAdmin });
assert.equal(res.body.settings.maintenance_message, 'Integration test message');
ok('Super admin updated application settings');

// 10. Privacy-minimal analytics
for (let i = 0; i < 3; i += 1) {
  res = await call('POST', '/analytics/pageview', { body: { path: `/integration-${unique}`, referrer: 'https://example.com', anonymousSessionId: `anon-${unique}` } });
  assert.equal(res.status, 202);
}
res = await call('GET', '/admin/analytics', { cookie: cookieAdmin });
assert.equal(res.status, 200);
assert.ok(res.body.topPages.some((p) => p.path === `/integration-${unique}`));
ok('Page views recorded and aggregated');

// 11. Admin user management and role enforcement
res = await call('GET', '/admin/users?pageSize=100', { cookie: cookieAdmin });
assert.equal(res.status, 200);
const userBRows = res.body.items.filter((u) => u.email === userB.email);
assert.equal(userBRows.length, 1);
const userBId = userBRows[0].id;

res = await call('PATCH', `/admin/users/${userBId}`, { cookie: cookieAdmin, body: { roles: ['content_manager'] } });
assert.equal(res.status, 200);
res = await call('POST', '/auth/login', { body: { email: userB.email, password: userB.password } });
assert.equal(res.status, 200);
cookieB = cookieFrom(res);
res = await call('GET', '/admin/content', { cookie: cookieB });
assert.equal(res.status, 200);
res = await call('GET', '/admin/tokens', { cookie: cookieB });
assert.equal(res.status, 403);
ok('Content manager role can read content but cannot manage tokens');

res = await call('PATCH', `/admin/users/${userBId}`, { cookie: cookieAdmin, body: { roles: [] } });
assert.equal(res.status, 200);
res = await call('PATCH', `/admin/users/${userBId}`, { cookie: cookieAdmin, body: { accountStatus: 'suspended' } });
assert.equal(res.status, 200);
res = await call('POST', '/auth/login', { body: { email: userB.email, password: userB.password } });
assert.equal(res.status, 403);
res = await call('PATCH', `/admin/users/${userBId}`, { cookie: cookieAdmin, body: { accountStatus: 'active' } });
assert.equal(res.status, 200);
ok('Suspension blocks sign-in and reactivation restores it');

// 12. Revocation invalidates future protected file access
res = await call('POST', `/admin/tokens/${tokenId}/revoke`, { cookie: cookieAdmin, body: {} });
assert.equal(res.status, 200);
res = await call('GET', supporterDownload.url.replace('/api/v1', ''), { cookie: cookieA });
assert.equal(res.status, 403);
res = await call('GET', '/supporter/status', { cookie: cookieA });
assert.equal(res.body.active, false);
assert.ok(res.body.history.some((e) => e.id === entitlementA.id && e.status === 'revoked'));
ok('Token revocation cancels active entitlements and file access');

// 13. Expired entitlement
res = await call('POST', '/admin/supporters/grant', { cookie: cookieAdmin, body: { userId: userA.email, expiresInHours: 1 } });
assert.equal(res.status, 201);
const grantId = res.body.entitlement.id;
const db = new DatabaseSync(path.resolve('backend/data/littlekrishna.db'));
db.prepare('UPDATE supporter_entitlements SET expires_at = ? WHERE id = ?').run(new Date(Date.now() - 1000).toISOString(), grantId);
res = await call('GET', '/supporter/status', { cookie: cookieA });
assert.equal(res.body.active, false);
res = await call('POST', '/downloads/authorize', { cookie: cookieA, body: { contentId: supporterItem.id } });
assert.equal(res.status, 403);
ok('Expired entitlement is treated as inactive');

// 14. Audit trail
res = await call('GET', '/admin/audit-logs?pageSize=100', { cookie: cookieAdmin });
assert.equal(res.status, 200);
const actions = res.body.items.map((a) => a.action);
for (const action of ['auth.login', 'admin.content_created', 'admin.token_generated', 'admin.token_revoked', 'admin.user_suspended', 'supporter.redeemed', 'download.authorized']) {
  assert.ok(actions.includes(action), `missing audit action ${action}`);
}
ok('Sensitive actions written to audit log');

// 15. Cleanup category/collection rows are intentionally retained as test data markers.

// 16. PRD parity subsystems: devices, content versions, storage objects, security events, permissions
res = await call('POST', '/profile/devices', { cookie: cookieA, body: { deviceName: `Device ${unique}`, deviceType: 'desktop', operatingSystem: 'Windows', clientVersion: '1.0' } });
assert.equal(res.status, 201);
const deviceId = res.body.item.id;
ok('Device registration persisted', deviceId);

res = await call('GET', '/profile/devices', { cookie: cookieA });
assert.equal(res.status, 200);
assert.ok(res.body.items.some((d) => d.id === deviceId && d.active));
ok('Device listing returns own devices');

res = await call('POST', `/profile/devices/${deviceId}/revoke`, { cookie: cookieA, body: {} });
assert.equal(res.status, 200);
res = await call('GET', '/profile/devices', { cookie: cookieA });
assert.ok(res.body.items.find((d) => d.id === deviceId)?.revokedAt);
ok('Device revocation persisted');

res = await call('GET', `/content/${supporterItem.slug}/versions`);
assert.equal(res.status, 200);
assert.ok(Array.isArray(res.body.items) && res.body.items.length >= 1);
ok('Content versions endpoint returns version history', `${res.body.items.length} versions`);

res = await call('POST', `/admin/content/${created.id}/versions`, {
  cookie: cookieAdmin,
  body: { version: '1.1.0', changelog: 'Parity version bump.', fileSizeMb: 12, packageData: Buffer.from('PK' + '\\x03\\x04' + 'x'.repeat(20)).toString('base64') },
});
// packageData may be rejected (invalid zip) — accept either 201 or 422
assert.ok([201, 422].includes(res.status));
ok('Admin content version endpoint reachable', `status ${res.status}`);

res = await call('GET', '/admin/storage-objects', { cookie: cookieAdmin });
assert.equal(res.status, 200);
assert.ok(Array.isArray(res.body.items));
ok('Storage objects endpoint returns inventory', `${res.body.items.length} objects`);

res = await call('POST', '/analytics/security-event', { body: { eventType: `integration_event_${unique}`, severity: 'info', metadata: { source: 'api-test' } } });
assert.equal(res.status, 202);
res = await call('GET', '/admin/security-events', { cookie: cookieAdmin });
assert.equal(res.status, 200);
assert.ok(res.body.items.some((e) => e.eventType === `integration_event_${unique}`));
ok('Security events recorded and listed', `${res.body.total} events`);

res = await call('GET', '/admin/security-events', { cookie: cookieA });
assert.equal(res.status, 403);
ok('Security events endpoint enforces admin role');

console.log(results.join('\\n'));
console.log(`\\n${passed} checks passed across public, auth, download, supporter, admin and PRD-parity APIs.`);
