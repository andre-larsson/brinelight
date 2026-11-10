/* Minimal Chrome DevTools Protocol client for the headless UI tests and screenshot tools.
   Launches its own headless Chrome with an OS-chosen debug port and a throwaway profile,
   and only ever kills the process it started. Needs Node 22+ (global fetch and WebSocket). */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CHROME_CANDIDATES = [
  process.env.CHROME, 'google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

function findChrome() {
  const { execFileSync } = require('child_process');
  for (const c of CHROME_CANDIDATES) {
    if (c.includes('/')) { if (fs.existsSync(c)) return c; continue; }
    try { execFileSync('which', [c], { stdio: 'ignore' }); return c; } catch (e) { /* try next */ }
  }
  throw new Error('Chrome not found. Set CHROME=/path/to/chrome.');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launch() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'brinelight-chrome-'));
  const proc = spawn(findChrome(), [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars', '--mute-audio',
    '--autoplay-policy=no-user-gesture-required', 'about:blank',
  ], { stdio: 'ignore' });
  let port = null;
  for (let i = 0; i < 100 && !port; i++) {
    try { port = +fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]; } catch (e) { await sleep(100); }
  }
  if (!port) { proc.kill(); throw new Error('Chrome did not start'); }
  let list = [];
  for (let i = 0; i < 50; i++) {
    try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); if (list.some((t) => t.type === 'page')) break; } catch (e) { /* not ready */ }
    await sleep(100);
  }
  const target = list.find((t) => t.type === 'page');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.addEventListener('open', r); ws.addEventListener('error', j); });
  let id = 0;
  const pending = new Map();
  const listeners = new Set();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) rej(new Error(JSON.stringify(msg.error))); else res(msg.result);
    } else if (msg.method) listeners.forEach((l) => l(msg));
  });
  const send = (method, params = {}) => new Promise((res, rej) => {
    const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params }));
  });
  const errors = [];
  const logs = [];
  listeners.add((m) => {
    if (m.method === 'Runtime.exceptionThrown') errors.push('exception: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
    if (m.method === 'Runtime.consoleAPICalled') {
      const text = m.params.args.map((a) => a.value ?? a.description).join(' ');
      logs.push(m.params.type + ': ' + text);
      if (m.params.type === 'error') errors.push('console.error: ' + text);
    }
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push('log: ' + m.params.entry.text + ' ' + (m.params.entry.url || ''));
  });
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Log.enable');

  let touch = false;
  const page = {
    send, errors, logs, sleep,
    async viewport(w, h, opts = {}) {
      touch = !!opts.touch;
      await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: opts.dpr || 1, mobile: !!opts.mobile });
      await send('Emulation.setTouchEmulationEnabled', { enabled: touch, maxTouchPoints: 5 });
    },
    async goto(url) {
      const loaded = new Promise((r) => { const l = (m) => { if (m.method === 'Page.loadEventFired') { listeners.delete(l); r(); } }; listeners.add(l); });
      await send('Page.navigate', { url });
      await loaded;
      await sleep(250);
    },
    async eval(expr) {
      const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error('eval failed: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
      return r.result.value;
    },
    async waitFor(expr, timeout = 8000, what) {
      const t0 = Date.now();
      while (Date.now() - t0 < timeout) {
        if (await page.eval(`!!(${expr})`)) return true;
        await sleep(50);
      }
      throw new Error('timed out waiting for ' + (what || expr));
    },
    /* Centre of the first element matching a selector, or null. */
    async center(sel) {
      return page.eval(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null; const r = el.getBoundingClientRect(); if (!r.width) return null; return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    },
    async clickAt(x, y) {
      if (touch) {
        await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        await sleep(40);
        await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else {
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
        await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
        await sleep(30);
        await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
      }
      await sleep(60);
    },
    /* Click (or tap) the element; throws if it isn't on screen. */
    async click(sel) {
      const c = await page.center(sel);
      if (!c) throw new Error('not found or not visible: ' + sel);
      await page.clickAt(c.x, c.y);
    },
    async drag(x1, y1, x2, y2, steps = 8) {
      if (touch) {
        await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x1, y: y1 }] });
        for (let i = 1; i <= steps; i++) {
          await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x1 + (x2 - x1) * i / steps, y: y1 + (y2 - y1) * i / steps }] });
          await sleep(16);
        }
        await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else {
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x1, y: y1 });
        await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: x1, y: y1, button: 'left', clickCount: 1 });
        for (let i = 1; i <= steps; i++) {
          await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x1 + (x2 - x1) * i / steps, y: y1 + (y2 - y1) * i / steps, button: 'left', buttons: 1 });
          await sleep(16);
        }
        await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x2, y: y2, button: 'left', clickCount: 1 });
      }
      await sleep(60);
    },
    async key(key, code) {
      const special = { Enter: 13, Escape: 27, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, ' ': 32, Tab: 9 };
      const vk = special[key] || key.toUpperCase().charCodeAt(0);
      const text = key.length === 1 ? key : key === 'Enter' ? '\r' : undefined;
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: code || key, windowsVirtualKeyCode: vk, text });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: code || key, windowsVirtualKeyCode: vk });
      await sleep(60);
    },
    async screenshot(file) {
      const r = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
    },
    async close() {
      try { ws.close(); } catch (e) { /* ignore */ }
      proc.kill();
      await sleep(200);
      try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* ignore */ }
    },
  };
  return page;
}

module.exports = { launch, sleep };
