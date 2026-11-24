import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const clientDir = path.resolve(rootDir, 'client');
const serverDir = path.resolve(rootDir, 'server');
const clientDistDir = path.resolve(clientDir, 'dist');
const serverPublicDir = path.resolve(rootDir, 'server', 'public');

console.log('[Build] ========================================');
console.log('[Build] Starting production build for My Chapters');
console.log(`[Build] Root Directory:   ${rootDir}`);
console.log(`[Build] Client Directory: ${clientDir}`);
console.log(`[Build] Server Directory: ${serverDir}`);
console.log(`[Build] Target Public:    ${serverPublicDir}`);
console.log('[Build] ========================================\n');

// 1. Ensure backend dependencies are installed
console.log('[Build] [Step 1/5] Checking backend dependencies in server/...');
const serverNodeModules = path.join(serverDir, 'node_modules');
if (!fs.existsSync(serverNodeModules) || !fs.existsSync(path.join(serverNodeModules, 'express'))) {
  console.log('[Build] Installing server dependencies...');
  execSync('npm install --production=false', { cwd: serverDir, stdio: 'inherit' });
} else {
  console.log('[Build] Server dependencies are already installed.');
}

// 2. Ensure frontend dependencies are installed (including devDependencies like vite)
console.log('\n[Build] [Step 2/5] Checking frontend dependencies in client/...');
const clientNodeModules = path.join(clientDir, 'node_modules');
if (!fs.existsSync(clientNodeModules) || !fs.existsSync(path.join(clientNodeModules, 'vite'))) {
  console.log('[Build] Installing client dependencies (with devDependencies for Vite)...');
  execSync('npm install --include=dev', { cwd: clientDir, stdio: 'inherit' });
} else {
  console.log('[Build] Client dependencies are already installed.');
}

// 3. Run Vite production build in client directory
console.log('\n[Build] [Step 3/5] Executing "npm run build" in client...');
execSync('npm run build', { cwd: clientDir, stdio: 'inherit' });

if (!fs.existsSync(clientDistDir)) {
  console.error(`[Build] Error: Build output directory not found at ${clientDistDir}`);
  process.exit(1);
}

// 4. Safely clean and prepare server/public directory
console.log(`\n[Build] [Step 4/5] Preparing ${serverPublicDir}...`);
if (fs.existsSync(serverPublicDir)) {
  fs.rmSync(serverPublicDir, { recursive: true, force: true });
}
fs.mkdirSync(serverPublicDir, { recursive: true });

// Copy complete build output (index.html, assets, icons, etc.) to server/public
console.log(`[Build] Copying built client assets from ${clientDistDir} to ${serverPublicDir}...`);
fs.cpSync(clientDistDir, serverPublicDir, { recursive: true });

// 5. Verify critical files and backend integrity
console.log('\n[Build] [Step 5/5] Verifying production build outputs and backend integrity...');
const copiedIndex = path.join(serverPublicDir, 'index.html');
const copiedAssets = path.join(serverPublicDir, 'assets');
const serverEntry = path.join(serverDir, 'src', 'server.js');
const serverApp = path.join(serverDir, 'src', 'app.js');

if (!fs.existsSync(copiedIndex)) {
  console.error('[Build] Verification Failed: index.html was not copied to server/public!');
  process.exit(1);
}

if (!fs.existsSync(copiedAssets)) {
  console.error('[Build] Verification Failed: assets directory was not copied to server/public!');
  process.exit(1);
}

if (!fs.existsSync(serverEntry) || !fs.existsSync(serverApp)) {
  console.error('[Build] Verification Failed: Backend entry files are missing!');
  process.exit(1);
}

console.log('[Build] ✓ Production build successfully created and verified in server/public!');
console.log(`[Build] Verified Frontend Index: ${copiedIndex}`);
console.log(`[Build] Verified Frontend Assets: ${copiedAssets}`);
console.log(`[Build] Verified Backend Entry:   ${serverEntry}`);
console.log('[Build] Done!\n');
