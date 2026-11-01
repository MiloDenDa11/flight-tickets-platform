const { spawn } = require('node:child_process');
const { readFileSync } = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const children = [];
let stopped = false;

function portInUse(port) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: 'localhost', port });
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', error => {
      socket.destroy();
      if (error.code === 'ECONNREFUSED') resolve(false);
      else reject(error);
    });
    socket.setTimeout(1500, () => {
      socket.destroy();
      reject(new Error(`Timed out checking localhost:${port}`));
    });
  });
}

async function alreadyRunning(service) {
  if (!await portInUse(service.port)) return false;
  const url = `http://localhost:${service.port}`;
  try {
    const response = await fetch(url + service.probe, { signal: AbortSignal.timeout(15000) });
    const body = await response.json();
    if (service.matches(body)) {
      console.log(`[dev] Reusing ${service.name}: ${url}`);
      return true;
    }
  } catch { /* An occupied port must belong to this application before reusing it. */ }
  throw new Error(`Port ${service.port} is in use, but could not verify the Flight Tickets ${service.name}. Stop that process or choose another port before running npm run dev.`);
}

async function main() {
  let backendEnv = {};
  try {
    const dotenv = require(path.join(root, 'backend/node_modules/dotenv'));
    backendEnv = dotenv.parse(readFileSync(path.join(root, 'backend/.env')));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const services = [
    { name: 'backend', port: Number(process.env.PORT || backendEnv.PORT || 3001), probe: '/api/v1/health', matches: body => body?.data?.service === 'flight-tickets-platform' },
    { name: 'frontend', port: Number(process.env.VITE_DEV_PORT || 5174), probe: '/package.json', matches: body => body?.name === 'flight-tickets-platform-frontend' },
  ];
  for (const service of services) {
    if (!Number.isInteger(service.port) || service.port < 1 || service.port > 65535) throw new Error(`Invalid ${service.name} port: ${service.port}`);
  }

  // Check both services before spawning, so a port conflict cannot stop a newly started backend.
  const running = await Promise.all(services.map(alreadyRunning));
  if (stopped) return;
  for (const [index, service] of services.entries()) {
    if (running[index]) continue;
    const options = { cwd: path.join(root, service.name), stdio: 'inherit', windowsHide: true };
    const child = process.env.npm_execpath
      ? spawn(process.execPath, [process.env.npm_execpath, 'run', 'dev'], options)
      : process.platform === 'win32'
        ? spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'npm run dev'], options)
        : spawn('npm', ['run', 'dev'], options);
    children.push(child);
    child.on('error', error => { console.error(`[dev] ${error.message}`); stop(1); });
    child.on('exit', code => stop(code ?? 0));
  }
  if (!children.length) console.log('[dev] Flight Tickets is already running. Open the frontend URL above.');
}

function stop(code = 0) {
  if (stopped) return; stopped = true;
  for (const child of children) {
    if (!child.pid || child.exitCode !== null || child.signalCode !== null) continue;
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    else child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(code), 500);
}
process.on('SIGINT', () => stop()); process.on('SIGTERM', () => stop());
main().catch(error => { console.error(`[dev] ${error.message}`); process.exitCode = 1; });
