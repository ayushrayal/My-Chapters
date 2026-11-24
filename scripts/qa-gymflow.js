import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import jwt from '../server/node_modules/jsonwebtoken/index.js';

const ARTIFACT_DIR = 'C:\\Users\\ayush\\.gemini\\antigravity\\brain\\f9600297-c0e8-42aa-b980-277e7b18808f';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_PROFILE = 'C:\\Users\\ayush\\AppData\\Local\\Temp\\chrome-qa-profile-' + Date.now();
const JWT_SECRET = '46e04cc3c3960c03122cadc347518d9e377894023ec271ce8f0c2f01071ec3f6';
const PORT = 9222;

const authToken = jwt.sign(
  { sub: '6af2dfa16ac42d46029cf920', sid: '6b0464008a88fd490f6cefb1' },
  JWT_SECRET,
  { expiresIn: '7d' }
);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startChrome() {
  const proc = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      `--remote-debugging-port=${PORT}`,
      '--remote-allow-origins=*',
      '--disable-gpu',
      `--user-data-dir=${TEMP_PROFILE}`,
      'about:blank'
    ],
    { stdio: 'ignore' }
  );

  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) {
        console.log('Chrome CDP is ready on port', PORT);
        return proc;
      }
    } catch {}
    await sleep(200);
  }
  throw new Error('Chrome failed to start');
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 1;
    this.callbacks = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && this.callbacks.has(data.id)) {
        const { resolve, reject } = this.callbacks.get(data.id);
        this.callbacks.delete(data.id);
        if (data.error) reject(new Error(data.error.message));
        else resolve(data.result);
      }
    };
  }

  send(method, params = {}) {
    const id = this.msgId++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function main() {
  let chromeProc;
  let cdp;

  try {
    chromeProc = await startChrome();
    const newPageRes = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' });
    const target = await newPageRes.json();
    console.log('Target created:', target.webSocketDebuggerUrl);

    cdp = new CDPClient(target.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Network.enable');
    await cdp.send('DOM.enable');

    // Set auth cookie for both client and backend origins
    await cdp.send('Network.setCookie', {
      name: 'mc_auth_token',
      value: authToken,
      url: 'http://localhost:5000',
      sameSite: 'Lax',
      httpOnly: true
    });
    await cdp.send('Network.setCookie', {
      name: 'mc_auth_token',
      value: authToken,
      url: 'http://localhost:5174',
      sameSite: 'Lax'
    });

    // Helper to capture screenshot
    async function capture(filename, width = 390, height = 844, isMobile = true) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 2,
        mobile: isMobile
      });
      await sleep(300);

      // Check horizontal overflow
      const overflowResult = await cdp.send('Runtime.evaluate', {
        expression: '({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth })',
        returnByValue: true
      });
      console.log(`[${filename}] Viewport ${width}x${height} overflow check:`, overflowResult.result?.value);

      const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
      const filePath = path.join(ARTIFACT_DIR, filename);
      fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
      console.log(`Captured ${filename} (${fs.statSync(filePath).size} bytes)`);
    }

    // Helper to evaluate click
    async function clickSelector(selector) {
      await cdp.send('Runtime.evaluate', {
        expression: `
          (() => {
            const el = document.querySelector('${selector}');
            if (el) { el.click(); return true; }
            return false;
          })()
        `
      });
      await sleep(400);
    }

    async function clickTab(tabText) {
      await cdp.send('Runtime.evaluate', {
        expression: `
          (() => {
            const tabs = Array.from(document.querySelectorAll('.gymflow-tabs__tab'));
            const target = tabs.find(t => t.textContent.includes('${tabText}'));
            if (target) { target.click(); return true; }
            return false;
          })()
        `
      });
      await sleep(400);
    }

    // 1. Navigate to GymFlow
    console.log('Navigating to http://localhost:5174/gymflow...');
    await cdp.send('Page.navigate', { url: 'http://localhost:5174/gymflow' });
    await sleep(2000);

    // Viewport test at 360px
    await capture('qa_gymflow_360_workout.png', 360, 800, true);

    // Viewport test at 390px (Workout Tab)
    await capture('qa_gymflow_390_workout.png', 390, 844, true);

    // Viewport test at 430px
    await capture('qa_gymflow_430_workout.png', 430, 932, true);

    // 2. Templates Tab at 390px
    await clickTab('Templates');
    await capture('qa_gymflow_390_templates.png', 390, 844, true);

    // Open Create Template Modal
    await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Create Template'));
          if (btn) btn.click();
        })()
      `
    });
    await sleep(500);
    await capture('qa_gymflow_390_create_template_modal.png', 390, 844, true);

    // Close Modal
    await clickSelector('.gymflow-modal-card__close-btn');
    await sleep(300);

    // 3. Schedule Tab at 390px
    await clickTab('Schedule');
    await capture('qa_gymflow_390_schedule.png', 390, 844, true);

    // Open Weekly Schedule Modal
    await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Edit Schedule'));
          if (btn) btn.click();
        })()
      `
    });
    await sleep(500);
    await capture('qa_gymflow_390_weekly_schedule_modal.png', 390, 844, true);

    // Close Modal
    await clickSelector('.gymflow-modal-card__close-btn');
    await sleep(300);

    // 4. Analytics Tab at 390px
    await clickTab('Analytics');
    await capture('qa_gymflow_390_analytics.png', 390, 844, true);

    // Open Filters Bottom Sheet on Analytics
    await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Filters'));
          if (btn) btn.click();
        })()
      `
    });
    await sleep(500);
    await capture('qa_gymflow_390_analytics_filters.png', 390, 844, true);

    // Close Filter Sheet
    await clickSelector('.gymflow-modal-card__close-btn');
    await sleep(300);

    // 5. Desktop View (1280px & 1440px)
    await clickTab('Workout');
    await capture('qa_gymflow_desktop_1280_workout.png', 1280, 800, false);
    await clickTab('Analytics');
    await capture('qa_gymflow_desktop_1280_analytics.png', 1280, 800, false);

    console.log('All visual QA captures completed successfully!');
  } catch (err) {
    console.error('Error in QA capture:', err);
  } finally {
    if (cdp) cdp.close();
    if (chromeProc) chromeProc.kill();
    try {
      fs.rmSync(TEMP_PROFILE, { recursive: true, force: true });
    } catch {}
  }
}

main();
