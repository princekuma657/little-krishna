const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function readFileAsBase64(file: File): Promise<string> {
  if (!file.name.toLowerCase().endsWith('.zip')) {
    return Promise.reject(new Error('Choose a .zip package.'));
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return Promise.reject(new Error('Local uploads are limited to 10 MB. Production archives belong in controlled storage.'));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('The selected file could not be read.'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(file);
  });
}
