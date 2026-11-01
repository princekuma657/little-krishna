import fs from 'node:fs';
import path from 'node:path';

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', '.git', 'data', 'storage'].includes(entry.name)) continue;
      walk(full, out);
    } else if (/\.(tsx?|css|html|md|mjs|sql)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const files = [...walk('frontend/src'), ...walk('docs'), ...walk('backend'), 'README.md'];
const hits = [];
for (const file of files) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    if (line.includes('\uFFFD')) hits.push(`${file}:${index + 1}: ${line.trim()}`);
  });
}
console.log(hits.length ? hits.join('\n') : 'no replacement characters found');
