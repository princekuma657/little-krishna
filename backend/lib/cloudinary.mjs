// Cloudinary provider stub for the LittleKrishna backend.
// Uses server-side credentials only. Never expose CLOUDINARY_API_SECRET to the browser.

import crypto from 'node:crypto';

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';
const API_KEY = process.env.CLOUDINARY_API_KEY || '';
const API_SECRET = process.env.CLOUDINARY_API_SECRET || '';

export function isCloudinaryConfigured() {
  return Boolean(CLOUD_NAME && API_KEY && API_SECRET);
}

export function cloudinaryConfig() {
  return { cloudName: CLOUD_NAME, apiKey: API_KEY, hasSecret: Boolean(API_SECRET) };
}

// Generate a signed upload URL/preset for direct browser uploads (signed by server).
export function signUpload(params = {}) {
  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = { timestamp, ...params };
  const sorted = Object.keys(toSign).sort().map((k) => `${k}=${toSign[k]}`).join('&');
  const signature = crypto.createHash('sha1').update(sorted + API_SECRET).digest('hex');
  return { timestamp, signature, apiKey: API_KEY, cloudName: CLOUD_NAME };
}

export function buildUrl(publicId, transforms = 'f_auto,q_auto') {
  if (!CLOUD_NAME || !publicId) return '';
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transforms}/${publicId}`;
}