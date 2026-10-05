/**
 * Measure real Core Web Vitals + resource waterfall per route by driving the
 * already-installed Chromium over the DevTools Protocol (no npm install:
 * the browser binary ships with the Playwright MCP server).
 *
 * Usage:
 *   node scripts/measure-vitals.js <baseUrl> / /tests /cefr
 *
 * Reports per route: TTFB, FCP, LCP, CLS, TBT, long tasks, request count,
 * JS/CSS/total transfer bytes, DOM node count and the largest resources.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

function findChromium() {
  const root = path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright');
  if (!fs.existsSync(root)) return null;
  for (const dir of fs.readdirSync(root)) {
    if (!dir.startsWith('chromium-')) continue;
    for (const rel of [
      ['chrome-win64', 'chrome.exe'],
      ['chrome-win', 'chrome.exe'],
      ['chrome-linux', 'chrome'],
      ['chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'],
    ]) {
      const p = path.join(root, dir, ...rel);
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

const BASE = process.argv[2] || 'http://127.0.0.1:3100';
const ROUTES = process.argv.slice(3);
if (ROUTES.length === 0) ROUTES.push('/');

const executablePath = findChromium();
if (!executablePath) {
  console.error('No Chromium binary found under ms-playwright.');
  process.exit(1);
}

const PORT = 9333 + Math.floor(Math.random() * 400);

function httpJson(url) {
  return new Promise((resolve, reject) => {
    require('http')
      .get(url, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

async function waitFor(fn, timeoutMs = 20000, step = 250) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const v = await fn();
      if (v) return v;
    } catch {
      /* not up yet */
    }
    if (Date.now() > deadline) throw new Error('timed out waiting for Chrome');
    await new Promise((r) => setTimeout(r, step));
  }
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.listeners = [];
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method) {
        for (const l of this.listeners) l(msg);
      }
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    this.ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error('CDP timeout: ' + method));
        }
      }, 60000);
    });
  }
  on(fn) {
    this.listeners.push(fn);
  }
}

(async () => {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-prof-'));
  const chrome = spawn(
    executablePath,
    [
      '--headless=new',
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${userDataDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      '--window-size=1366,900',
      '--hide-scrollbars',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  const cleanup = () => {
    try {
      chrome.kill();
    } catch {
      /* already gone */
    }
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  };
  process.on('exit', cleanup);

  const version = await waitFor(() => httpJson(`http://127.0.0.1:${PORT}/json/version`));
  console.log(`Using ${version.Browser}\n`);

  const WebSocket = await (async () => {
    for (const name of ['ws', 'websocket']) {
      try {
        return require(name);
      } catch {
        /* try next */
      }
    }
    throw new Error('No WebSocket module available (need Node >= 22 global WebSocket)');
  })();

  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });
  const cdp = new Cdp(ws);

  const results = [];

  for (const route of ROUTES) {
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });

    const resources = [];
    const byRequestId = new Map();
    cdp.on((msg) => {
      if (msg.sessionId !== sessionId) return;
      if (msg.method === 'Network.responseReceived') {
        const r = msg.params.response;
        const entry = {
          requestId: msg.params.requestId,
          url: r.url,
          status: r.status,
          type: r.mimeType,
          encoded: r.encodedDataLength,
          fromCache: r.fromDiskCache || r.fromPrefetchCache,
        };
        resources.push(entry);
        byRequestId.set(entry.requestId, entry);
      }
      if (msg.method === 'Network.loadingFinished') {
        const hit = byRequestId.get(msg.params.requestId);
        // encodedDataLength on loadingFinished is the real transferred byte
        // count (the responseReceived value is 0 while the body streams).
        if (hit) {
          hit.finished = true;
          hit.encoded = msg.params.encodedDataLength || hit.encoded;
        }
      }
    });

    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Network.enable', {}, sessionId);
    // A warm HTTP cache reports ~0 bytes and hides real transfer cost. Each
    // route gets a fresh browser context anyway, so force a network fetch.
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true }, sessionId);
    await cdp.send('Runtime.enable', {}, sessionId);
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1366,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    }, sessionId);

    // Install the vitals observers before any script runs on the page.
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        window.__vitals = { lcp: 0, cls: 0, longTasks: 0, tbt: 0 };
        try {
          new PerformanceObserver((l) => {
            for (const e of l.getEntries()) window.__vitals.lcp = e.startTime;
          }).observe({ type: 'largest-contentful-paint', buffered: true });
        } catch (e) {}
        try {
          new PerformanceObserver((l) => {
            for (const e of l.getEntries()) if (!e.hadRecentInput) window.__vitals.cls += e.value;
          }).observe({ type: 'layout-shift', buffered: true });
        } catch (e) {}
        try {
          new PerformanceObserver((l) => {
            for (const e of l.getEntries()) {
              window.__vitals.longTasks++;
              window.__vitals.tbt += Math.max(0, e.duration - 50);
            }
          }).observe({ type: 'longtask', buffered: true });
        } catch (e) {}
      `,
    }, sessionId);

    await cdp.send("Page.navigate", { url: new URL(BASE + route).href }, sessionId);

    // Wait for the load event, then let the page settle and record.
    await waitFor(async () => {
      const r = await cdp.send(
        'Runtime.evaluate',
        { expression: 'document.readyState === "complete"', returnByValue: true },
        sessionId
      );
      return r.result.value === true;
    }, 45000);
    await new Promise((r) => setTimeout(r, 4000));

    const probe = await cdp.send(
      'Runtime.evaluate',
      {
        expression: `(() => {
          const nav = performance.getEntriesByType('navigation')[0] || {};
          const paints = {};
          for (const p of performance.getEntriesByType('paint')) paints[p.name] = p.startTime;
          const v = window.__vitals || {};
          return JSON.stringify({
            ttfb: nav.responseStart || 0,
            dcl: nav.domContentLoadedEventEnd || 0,
            load: nav.loadEventEnd || 0,
            fcp: paints['first-contentful-paint'] || 0,
            lcp: v.lcp || 0,
            cls: v.cls || 0,
            tbt: v.tbt || 0,
            longTasks: v.longTasks || 0,
            domNodes: document.querySelectorAll('*').length
          });
        })()`,
        returnByValue: true,
      },
      sessionId
    );
    const m = JSON.parse(probe.result.value);

    let js = 0;
    let css = 0;
    let total = 0;
    for (const r of resources) {
      const len = r.finished ? r.encoded : 0;
      total += len;
      if (r.type.includes('javascript')) js += len;
      if (r.type.includes('css')) css += len;
    }

    resources.sort((a, b) => (b.finished ? b.encoded : 0) - (a.finished ? a.encoded : 0));
    results.push({ route, ...m, js, css, total, requests: resources.length, largest: resources.slice(0, 10) });

    await cdp.send('Target.closeTarget', { targetId });
  }

  console.log('\n============ CORE WEB VITALS — production build ============\n');
  console.log(
    'route'.padEnd(13) +
      'TTFB'.padStart(7) +
      'FCP'.padStart(7) +
      'LCP'.padStart(8) +
      'CLS'.padStart(7) +
      'TBT'.padStart(7) +
      'LT'.padStart(4) +
      'req'.padStart(5) +
      'JS KB'.padStart(8) +
      'CSS KB'.padStart(7) +
      'tot KB'.padStart(8) +
      'DOM'.padStart(7)
  );
  console.log('-'.repeat(96));
  for (const r of results) {
    console.log(
      r.route.padEnd(13) +
        Math.round(r.ttfb).toString().padStart(7) +
        Math.round(r.fcp).toString().padStart(7) +
        Math.round(r.lcp).toString().padStart(8) +
        r.cls.toFixed(3).padStart(7) +
        Math.round(r.tbt).toString().padStart(7) +
        String(r.longTasks).padStart(4) +
        String(r.requests).padStart(5) +
        (r.js / 1024).toFixed(0).padStart(8) +
        (r.css / 1024).toFixed(0).padStart(7) +
        (r.total / 1024).toFixed(0).padStart(8) +
        String(r.domNodes).padStart(7)
    );
  }
  console.log('\n(ms for TTFB/FCP/LCP/TBT · CLS unitless · LT = long tasks >50ms)');

  for (const r of results) {
    console.log(`\n--- ${r.route}: largest transferred resources ---`);
    for (const res of r.largest) {
      if (!res.finished || res.encoded < 3000) continue;
      console.log(
        `  ${(res.encoded / 1024).toFixed(1).padStart(9)} KB  ${String(res.type).padEnd(24)} ${res.url.slice(0, 100)}`
      );
    }
  }

  ws.close();
  cleanup();
  process.exit(0);
})().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});