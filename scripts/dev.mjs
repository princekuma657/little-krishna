import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();

function run(name, command, args, cwd, shell = process.platform === 'win32') {
  const child = spawn(command, args, {
    cwd,
    stdio: 'inherit',
    env: process.env,
    shell,
  });
  child.on('exit', (code) => {
    if (code !== 0) {
      console.error(`[LittleKrishna] ${name} exited with code ${code}`);
      shutdown(code ?? 1);
    }
  });
  return child;
}

let shuttingDown = false;
const children = [];

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  setTimeout(() => process.exit(code), 250);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

const backend = run('API', process.execPath, [path.join(root, 'backend', 'server.mjs')], root, false);
children.push(backend);
const frontend = run('Web', process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev'], path.join(root, 'frontend'), true);
children.push(frontend);

console.log('[LittleKrishna] API: http://127.0.0.1:8787');
console.log('[LittleKrishna] Web: http://localhost:5173');
