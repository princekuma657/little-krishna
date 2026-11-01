// Google Drive private direct download provider for LittleKrishna backend.
// Uses OAuth2 refresh-token flow with server-side credentials only.
// Never expose credentials or file IDs to the frontend.

import https from 'node:https';

const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET || '';
const REFRESH_TOKEN = process.env.GOOGLE_DRIVE_REFRESH_TOKEN || '';

let cachedAccessToken = null;
let tokenExpiry = 0;

export function isDriveConfigured() {
  return Boolean(CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN);
}

// Obtain a fresh access token using the refresh token.
async function getAccessToken() {
  if (cachedAccessToken && Date.now() < tokenExpiry - 60000) {
    return cachedAccessToken;
  }
  if (!isDriveConfigured()) {
    throw new Error('Google Drive credentials are not configured.');
  }
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: REFRESH_TOKEN,
    grant_type: 'refresh_token',
  }).toString();

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || 'Failed to obtain Google Drive access token.');
  }
  cachedAccessToken = json.access_token;
  tokenExpiry = Date.now() + (json.expires_in || 3600) * 1000;
  return cachedAccessToken;
}

// Fetch file metadata from Drive.
export async function getFileMetadata(fileId) {
  const token = await getAccessToken();
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,size,md5Checksum`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || 'Failed to fetch Drive file metadata.');
  }
  return {
    id: json.id,
    name: json.name,
    mimeType: json.mimeType,
    size: json.size ? Number(json.size) : null,
    md5Checksum: json.md5Checksum || null,
  };
}

// Check if a Drive file is accessible.
export async function checkAvailability(fileId) {
  try {
    const meta = await getFileMetadata(fileId);
    return { available: true, metadata: meta };
  } catch (err) {
    return { available: false, error: err.message };
  }
}

// Stream a file from Drive to a writable response.
// Returns a promise that resolves when streaming completes.
export async function streamFile(fileId, res, filename, expectedSize) {
  const token = await getAccessToken();
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;

  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { Authorization: `Bearer ${token}` } }, (driveRes) => {
      if (driveRes.statusCode !== 200) {
        let body = '';
        driveRes.on('data', (c) => { body += c; });
        driveRes.on('end', () => {
          try {
            const j = JSON.parse(body);
            reject(new Error(j.error?.message || `Drive API returned ${driveRes.statusCode}`));
          } catch {
            reject(new Error(`Drive API returned ${driveRes.statusCode}`));
          }
        });
        return;
      }

      const contentType = driveRes.headers['content-type'] || 'application/octet-stream';
      const contentLength = driveRes.headers['content-length'] || expectedSize;

      res.writeHead(200, {
        'Content-Type': contentType,
        ...(contentLength ? { 'Content-Length': contentLength } : {}),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      });

      driveRes.pipe(res);
      driveRes.on('end', resolve);
      driveRes.on('error', reject);
      res.on('close', () => {
        if (!res.writableEnded) {
          driveRes.destroy();
          reject(new Error('Client disconnected during download.'));
        }
      });
    });
    req.on('error', reject);
  });
}

// Test the Drive connection (fetch a known file or just get an access token).
export async function testConnection() {
  if (!isDriveConfigured()) {
    return { ok: false, error: 'Google Drive credentials are not configured. Set GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN.' };
  }
  try {
    await getAccessToken();
    return { ok: true, message: 'Google Drive OAuth connection successful.' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}