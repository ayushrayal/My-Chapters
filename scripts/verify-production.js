import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read ACCESS_CODE from server/.env if available
let accessCode = 'MY_CHAPTERS_EARLY_ACCESS_2026';
try {
  const envContent = fs.readFileSync(path.resolve(__dirname, '../server/.env'), 'utf-8');
  const match = envContent.match(/ACCESS_CODE=([^\r\n]+)/);
  if (match) {
    accessCode = match[1].trim();
  }
} catch {
  // fallback
}

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function verify() {
  console.log('=== Starting Local Production Serving Verification ===\n');
  let passCount = 0;
  let totalCount = 0;

  function assert(desc, condition, details = '') {
    totalCount++;
    if (condition) {
      passCount++;
      console.log(`✓ [PASS] ${desc}`);
    } else {
      console.error(`✗ [FAIL] ${desc} - ${details}`);
    }
  }

  // 1. Health check
  const healthRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/health',
    method: 'GET'
  });
  assert(
    '1. Health check endpoint returns 200 and JSON',
    healthRes.statusCode === 200 && healthRes.headers['content-type']?.includes('application/json'),
    `Status: ${healthRes.statusCode}`
  );

  // 2. Unknown API route returns 404 JSON, NOT HTML
  const unknownApiRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/some-unknown-route-that-does-not-exist',
    method: 'GET'
  });
  assert(
    '2. Unknown API route returns 404 JSON (NOT index.html)',
    unknownApiRes.statusCode === 404 &&
      unknownApiRes.headers['content-type']?.includes('application/json') &&
      !unknownApiRes.body.includes('<!DOCTYPE html>'),
    `Status: ${unknownApiRes.statusCode}, Body: ${unknownApiRes.body.slice(0, 100)}`
  );

  // 3. Root React frontend loads
  const rootRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/',
    method: 'GET'
  });
  assert(
    '3. Root path / returns 200 and React index.html',
    rootRes.statusCode === 200 &&
      rootRes.body.includes('<div id="root">') &&
      rootRes.headers['content-type']?.includes('text/html'),
    `Status: ${rootRes.statusCode}`
  );

  // Extract asset link from index.html
  const jsMatch = rootRes.body.match(/src="(\/assets\/[^"]+\.js)"/);
  const cssMatch = rootRes.body.match(/href="(\/assets\/[^"]+\.css)"/);

  if (jsMatch && jsMatch[1]) {
    const jsRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: jsMatch[1],
      method: 'GET'
    });
    assert(
      `4a. Static JavaScript asset (${jsMatch[1]}) loads with 200`,
      jsRes.statusCode === 200 && jsRes.body.length > 1000,
      `Status: ${jsRes.statusCode}`
    );
  }

  if (cssMatch && cssMatch[1]) {
    const cssRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: cssMatch[1],
      method: 'GET'
    });
    assert(
      `4b. Static CSS asset (${cssMatch[1]}) loads with 200`,
      cssRes.statusCode === 200 && cssRes.body.length > 1000,
      `Status: ${cssRes.statusCode}`
    );
  }

  // 5. SPA Fallback routes
  const spaRoutes = ['/gymflow', '/dayflow', '/someday', '/profile', '/dashboard', '/signin', '/signup'];
  for (const route of spaRoutes) {
    const routeRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: route,
      method: 'GET'
    });
    assert(
      `5. Direct navigation to ${route} serves React index.html (200)`,
      routeRes.statusCode === 200 && routeRes.body.includes('<div id="root">'),
      `Status: ${routeRes.statusCode}`
    );
  }

  // 6a. Authentication API test: invalid credentials returns 401 JSON
  const invalidSigninPayload = JSON.stringify({
    identifier: 'invalid_user_probe',
    password: 'WrongPassword123!'
  });
  const invalidRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/signin',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(invalidSigninPayload),
        Origin: 'http://localhost:5000'
      }
    },
    invalidSigninPayload
  );
  assert(
    '6a. API /api/auth/signin returns 401 JSON for invalid credentials',
    invalidRes.statusCode === 401 && invalidRes.headers['content-type']?.includes('application/json'),
    `Status: ${invalidRes.statusCode}`
  );

  // 6b. Authentication signup creates Space/User and returns HttpOnly auth cookie (201)
  const testId = Date.now();
  const signupPayload = JSON.stringify({
    username: `prod_test_${testId}`,
    email: `prod_test_${testId}@example.com`,
    password: 'SecurePassword123!',
    spaceName: `Test Space ${testId}`,
    accessCode: accessCode
  });

  const signupRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/signup',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(signupPayload),
        Origin: 'http://localhost:5000'
      }
    },
    signupPayload
  );

  assert(
    '6b. Authentication signup creates Space/User (201)',
    signupRes.statusCode === 201 && signupRes.body.includes('registered successfully'),
    `Status: ${signupRes.statusCode}, Body: ${signupRes.body.slice(0, 150)}`
  );

  // 6c. Authentication signin succeeds (200) and issues mc_auth_token cookie
  const signinPayload = JSON.stringify({
    identifier: `prod_test_${testId}`,
    password: 'SecurePassword123!'
  });
  const signinRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/signin',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(signinPayload),
        Origin: 'http://localhost:5000'
      }
    },
    signinPayload
  );
  assert(
    '6c. Authentication signin succeeds (200) and issues mc_auth_token cookie',
    signinRes.statusCode === 200 &&
      (signinRes.headers['set-cookie'] || []).some((c) => c.includes('mc_auth_token')),
    `Status: ${signinRes.statusCode}`
  );

  console.log(`\n=== Verification Results: ${passCount}/${totalCount} tests passed ===\n`);
  if (passCount !== totalCount) {
    process.exit(1);
  }
}

verify().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
