import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const clientDir = path.resolve(rootDir, 'client');
const clientDistDir = path.resolve(clientDir, 'dist');
const serverPublicDir = path.resolve(rootDir, 'server', 'public');

console.log('[Build] Starting production build process for My Chapters...');
console.log(`[Build] Client Directory: ${clientDir}`);
console.log(`[Build] Target Public Directory: ${serverPublicDir}`);

// 1. Run Vite production build in client directory
console.log('[Build] Executing "npm run build" in client...');
execSync('npm run build', { cwd: clientDir, stdio: 'inherit' });

if (!fs.existsSync(clientDistDir)) {
  console.error(`[Build] Error: Build output directory not found at ${clientDistDir}`);
  process.exit(1);
}

// 2. Safely clean stale files in server/public before copying
console.log(`[Build] Cleaning existing server/public directory...`);
if (fs.existsSync(serverPublicDir)) {
  fs.rmSync(serverPublicDir, { recursive: true, force: true });
}
fs.mkdirSync(serverPublicDir, { recursive: true });

// 3. Copy complete build output (index.html, assets, icons, etc.) to server/public
console.log(`[Build] Copying built assets from ${clientDistDir} to ${serverPublicDir}...`);
fs.cpSync(clientDistDir, serverPublicDir, { recursive: true });

// 4. Verify critical files
const copiedIndex = path.join(serverPublicDir, 'index.html');
const copiedAssets = path.join(serverPublicDir, 'assets');

if (!fs.existsSync(copiedIndex)) {
  console.error('[Build] Verification Failed: index.html was not copied to server/public!');
  process.exit(1);
}

if (!fs.existsSync(copiedAssets)) {
  console.error('[Build] Verification Failed: assets directory was not copied to server/public!');
  process.exit(1);
}

console.log('[Build] ✓ Production build successfully created and copied to server/public!');
console.log(`[Build] Verified: ${copiedIndex}`);
console.log(`[Build] Verified: ${copiedAssets}`);
