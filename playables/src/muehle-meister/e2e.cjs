#!/usr/bin/env node
/**
 * Ende-zu-Ende-Test der spielbaren Anzeige in headless Edge (Chrome DevTools Protocol, ohne Zusatzpakete).
 *
 *   node scripts/playable/e2e.cjs [datei.html] [--shots <ordner>]
 *
 * Je Größe × Sprache: Seite laden (mobile Emulation, Touch an), alle drei Rätsel mit echten
 * Touch-Events durchspielen, Endkarte prüfen, Store-Knopf tippen. Geprüft werden:
 *  - Brücke: wm:ready, wm:cleared, wm:cta (über ReactNativeWebView wie auf Android)
 *  - nichts ragt aus dem Bild, kein abgeschnittener Titel, Endkarte vollständig sichtbar
 *  - keine JavaScript-Fehler
 */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const args = process.argv.slice(2);
const shotsIdx = args.indexOf('--shots');
const SHOTS = shotsIdx >= 0 ? path.resolve(args[shotsIdx + 1]) : null;
const FILE = path.resolve(args.find((a, i) => !a.startsWith('--') && i !== shotsIdx + 1) || path.join(__dirname, 'dist', 'muehle-meister.html'));
const URL_BASE = 'file:///' + FILE.replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/').replace(/^file:\/\/\/([A-Za-z])%3A/, 'file:///$1:');
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p));
const PORT = 9300 + Math.floor(Math.random() * 500);

const SIZES = [
  { name: 'overlay-hoch', w: 360, h: 540 },
  { name: 'vollbild-hoch', w: 390, h: 844 },
  { name: 'klein-hoch', w: 320, h: 420 },
  { name: 'overlay-quer', w: 510, h: 360 },
  { name: 'vollbild-quer', w: 844, h: 390 },
  { name: 'tablet-quer', w: 1024, h: 600 },
];
const LANGS = (process.env.E2E_LANGS || 'de,en,es,fr,it,nl,pt').split(',');
const ONLY = process.env.E2E_SIZES ? process.env.E2E_SIZES.split(',') : null;
const DEBUG = !!process.env.E2E_DEBUG;
const dbg = (...a) => { if (DEBUG) console.log('  ·', ...a); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function json(url) {
  for (let i = 0; i < 50; i++) {
    try { return await (await fetch(url)).json(); } catch { await sleep(200); }
  }
  throw new Error('DevTools nicht erreichbar: ' + url);
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
    } else listeners.forEach((fn) => fn(msg));
  };
  const send = (method, params = {}) => new Promise((res, rej) => {
    const i = ++id;
    const timer = setTimeout(() => { pending.delete(i); rej(new Error('CDP-Zeitüberschreitung: ' + method)); }, 15000);
    pending.set(i, { res: (v) => { clearTimeout(timer); res(v); }, rej: (e) => { clearTimeout(timer); rej(e); } });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  return new Promise((res) => { ws.onopen = () => res({ send, on: (fn) => listeners.push(fn), close: () => ws.close() }); });
}

async function main() {
  if (!EDGE) throw new Error('Edge nicht gefunden');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'muehle-e2e-'));
  const edge = spawn(EDGE, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile, '--no-first-run', '--autoplay-policy=no-user-gesture-required',
    // Headless gilt die Seite als verdeckt: nach ~5 min bündelt Chrome Timer sonst auf eine Minute.
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    '--disable-features=IntensiveWakeUpThrottling', 'about:blank'], { stdio: 'ignore' });
  let cdp;
  const failures = [];
  try {
    const list = await json(`http://127.0.0.1:${PORT}/json/list`);
    const page = list.find((t) => t.type === 'page');
    cdp = await connect(page.webSocketDebuggerUrl);
    const errors = [];
    cdp.on((m) => {
      if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
      if (m.method === 'Page.screencastFrame') cdp.send('Page.screencastFrameAck', { sessionId: m.params.sessionId }).catch(() => {});
    });
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    // Android-Brücke nachbilden: die Anzeige schickt dann alles an window.__sent.
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__sent=[];window.ReactNativeWebView={postMessage:function(m){window.__sent.push(JSON.parse(m));}};' });
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    const evaluate = async (expr) => (await cdp.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result.value;
    // Headless rendert nur bei Bedarf; ein Touch-Event wartet aber auf ein Bild. Ein winziger
    // Screenshot parallel dazu erzwingt den Frame, sonst hängt dispatchTouchEvent.
    const frame = () => cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 1, clip: { x: 0, y: 0, width: 1, height: 1, scale: 1 } }).catch(() => {});
    const touch = (params) => Promise.all([cdp.send('Input.dispatchTouchEvent', params), frame()]);
    const tapAt = async (x, y) => {
      await touch({ type: 'touchStart', touchPoints: [{ x, y }] });
      await sleep(40);
      await touch({ type: 'touchEnd', touchPoints: [] });
    };
    const tapNode = async (p) => {
      const c = await evaluate(`(()=>{const r=document.getElementById('board').getBoundingClientRect();const c=MuehleEngine.COORDS[${p}];return [r.left+c[0]*r.width,r.top+c[1]*r.height];})()`);
      await tapAt(c[0], c[1]);
    };
    const tapEl = async (sel) => {
      const c = await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2];})()`);
      await tapAt(c[0], c[1]);
    };
    const until = async (expr, ms = 8000) => {
      const t0 = Date.now();
      while (Date.now() - t0 < ms) { if (await evaluate(expr)) return true; await sleep(60); }
      return false;
    };
    const state = (k) => `window.__muehlePlayable&&window.__muehlePlayable.state().${k}`;
    const firstBlack = () => evaluate(`MuehleEngine.removable(window.__muehlePlayable.state().board,'B')[0]`);

    for (const size of SIZES.filter((s) => !ONLY || ONLY.includes(s.name))) {
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: size.w, height: size.h, deviceScaleFactor: 2, mobile: true });
      await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 10, everyNthFrame: 4 });
      for (const lang of LANGS) {
        const tag = `${size.name} ${size.w}x${size.h} ${lang}`;
        errors.length = 0;
        dbg('navigate', lang);
        await cdp.send('Page.navigate', { url: `${URL_BASE}?lang=${lang}&muted=1` });
        const problems = [];
        if (!(await until(`window.__sent&&window.__sent.some(m=>m.type==='wm:ready')`, 4000))) problems.push('kein wm:ready');
        await sleep(150);
        const layout = await evaluate(`(()=>{const W=innerWidth,H=innerHeight,o=[];
          document.querySelectorAll('main > *, .stage > *').forEach(e=>{if(getComputedStyle(e).display==='none')return;const r=e.getBoundingClientRect();if(r.bottom>H+1||r.right>W+1||r.left<-1||r.top<-1)o.push((e.id||e.className)+' '+Math.round(r.top)+'..'+Math.round(r.bottom));});
          const t=document.getElementById('title');if(t.scrollWidth>t.clientWidth+1&&getComputedStyle(t).whiteSpace==='nowrap')o.push('Titel abgeschnitten');
          if(document.documentElement.scrollHeight>H+1)o.push('scrollt');
          return {o,S:window.__muehlePlayable.state().size};})()`);
        problems.push(...layout.o);
        if (layout.S < 150) problems.push('Brett zu klein: ' + layout.S);
        if (SHOTS && lang === 'de') {
          fs.mkdirSync(SHOTS, { recursive: true });
          const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
          fs.writeFileSync(path.join(SHOTS, `${size.name}-start.png`), Buffer.from(shot.data, 'base64'));
        }
        // Rätsel 1: setzen + schlagen
        let ok = await until(`${state('mode')}==='play'`);
        await tapNode(2);
        ok = ok && (await until(`${state('mode')}==='capture'`));
        await tapNode(await firstBlack());
        ok = ok && (await until(`${state('level')}===1&&${state('mode')}==='play'`));
        // Rätsel 2: ein falscher Zug (springt zurück), dann der richtige
        await tapNode(4); await sleep(80); await tapNode(3);
        ok = ok && (await until(`${state('mode')}==='play'&&window.__muehlePlayable.state().board[4]==='W'`, 5000));
        await tapNode(19); await sleep(80); await tapNode(18);
        ok = ok && (await until(`${state('mode')}==='capture'`));
        await tapNode(9); // geschützter Stein in der schwarzen Mühle: darf nichts tun
        await sleep(200);
        if ((await evaluate(`window.__muehlePlayable.state().board[9]`)) !== 'B') problems.push('geschützter Stein geschlagen');
        await tapNode(await firstBlack());
        ok = ok && (await until(`${state('level')}===2&&${state('mode')}==='play'`));
        // Rätsel 3: Zwickmühle
        await tapNode(1); await sleep(80); await tapNode(9);
        ok = ok && (await until(`${state('mode')}==='capture'`));
        await tapNode(await firstBlack());
        ok = ok && (await until(`${state('mode')}==='play'`));
        await tapNode(9); await sleep(80); await tapNode(1);
        ok = ok && (await until(`${state('mode')}==='capture'`));
        if (SHOTS && lang === 'de') {
          await sleep(300);
          const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
          fs.writeFileSync(path.join(SHOTS, `${size.name}-zwick.png`), Buffer.from(shot.data, 'base64'));
        }
        await tapNode(await firstBlack());
        ok = ok && (await until(`${state('mode')}==='end'`));
        if (!ok) problems.push('Durchlauf hängt bei ' + JSON.stringify(await evaluate(`window.__muehlePlayable.state()`)));
        await sleep(700);
        const card = await evaluate(`(()=>{const r=document.querySelector('.card').getBoundingClientRect(),i=document.getElementById('end-icon').getBoundingClientRect();return [r.top,r.bottom,innerHeight,i.top];})()`);
        if (card[0] < -1 || card[1] > card[2] + 1 || card[3] < -1) problems.push('Endkarte ragt heraus ' + card.map(Math.round).join('/'));
        if (SHOTS && lang === 'de') {
          const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
          fs.writeFileSync(path.join(SHOTS, `${size.name}-ende.png`), Buffer.from(shot.data, 'base64'));
        }
        dbg('end card', card);
        await tapEl('#end-cta');
        await sleep(150);
        const sent = await evaluate(`window.__sent.map(m=>m.type+(m.url?'@'+m.url:''))`);
        if (!sent.includes('wm:cleared')) problems.push('kein wm:cleared');
        if (!sent.some((s) => s === 'wm:cta@https://play.google.com/store/apps/details?id=app.muehle.muehle')) problems.push('kein wm:cta mit Store-Link');
        if (errors.length) problems.push('JS-Fehler: ' + errors.join(' | '));
        console.log((problems.length ? 'FEHLER ' : 'ok     ') + tag + (problems.length ? ' – ' + problems.join('; ') : ''));
        if (problems.length) failures.push(tag);
      }
      await cdp.send('Page.stopScreencast');
    }
  } finally {
    if (cdp) cdp.close();
    edge.kill();
    await sleep(300);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  }
  console.log(failures.length ? `\n${failures.length} Fehler` : '\nAlle Durchläufe ok');
  process.exit(failures.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
