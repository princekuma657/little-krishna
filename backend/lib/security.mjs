import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'backend/data');
fs.mkdirSync(DATA_DIR, { recursive: true });

function loadOrCreateSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const file = path.join(DATA_DIR, 'session.secret');
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();
  const secret = crypto.randomBytes(48).toString('hex');
  fs.writeFileSync(file, secret, { mode: 0o600 });
  return secret;
}

const SECRET = loadOrCreateSecret();

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

export function signSession(payload, ttlMs = 7 * 24 * 60 * 60 * 1000) {
  const body = b64url(JSON.stringify({ ...payload, exp: Date.now() + ttlMs }));
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifySession(token) {
  if (!token || typeof token !== 'string') return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function signDownloadToken(payload, ttlMs = 5 * 60 * 1000) {
  const body = b64url(JSON.stringify({ ...payload, exp: Date.now() + ttlMs }));
  const sig = crypto.createHmac('sha256', SECRET).update(`download:${body}`).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyDownloadToken(token) {
  if (!token || typeof token !== 'string') return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', SECRET).update(`download:${body}`).digest('base64url');
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function randomToken(prefix = 'lk_supporter') {
  return `${prefix}_${crypto.randomBytes(24).toString('base64url')}`;
}

export function uuid() {
  return crypto.randomUUID();
}

export function nowIso() {
  return new Date().toISOString();
}

// Simple in-memory fixed-window rate limiter.
const buckets = new Map();

export function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, resetAt: now + windowMs };
  }
  bucket.count += 1;
  if (bucket.count > max) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }
  return { allowed: true, remaining: max - bucket.count, resetAt: bucket.resetAt };
}
