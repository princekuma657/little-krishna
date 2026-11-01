// Cloudinary helpers — only the cloud name is used in the browser.
// API key / secret must stay server-side (see backend/lib/cloudinary.mjs).

const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;

export const isCloudinaryConfigured = Boolean(cloudName);

export function cloudinaryUrl(publicId: string, transforms = 'f_auto,q_auto') {
  if (!cloudName || !publicId) return '';
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms}/${publicId}`;
}

export function cloudinaryVideoUrl(publicId: string) {
  if (!cloudName || !publicId) return '';
  return `https://res.cloudinary.com/${cloudName}/video/upload/f_auto,q_auto/${publicId}`;
}