const { spawn } = require('node:child_process');
const path = require('node:path');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = ['backend', 'frontend'].map(part => spawn(npm, ['run', 'dev'], { cwd: path.resolve(__dirname, '..', part), stdio: 'inherit', shell: process.platform === 'win32' }));
let stopped = false;
function stop(code = 0) {
  if (stopped) return; stopped = true;
  for (const child of children) {
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    else child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(code), 500);
}
for (const child of children) child.on('exit', code => stop(code ?? 0));
process.on('SIGINT', () => stop()); process.on('SIGTERM', () => stop());
