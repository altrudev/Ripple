// Ripple browser checks — run before every deploy, after `node tests/core.test.js`.
//
//   node tests/browser.check.js                      # checks ./index.html
//   node tests/browser.check.js https://altru.dev/apps/ripple/try   # checks the live page (offline parts only)
//
// Needs Playwright (`playwright` or `playwright-core`) and a Chromium. Not a project dependency:
// install it wherever you run checks (e.g. `npm i -g playwright-core` + `npx playwright install chromium`).
// Set CHROME=/path/to/chrome to choose the browser binary.
//
// Uses only the built-in example and a made-up account, so it needs no GitHub calls.
// Real-data checks (your account, a real repo) are separate: they spend GitHub's hourly allowance.
'use strict';
const path = require('path'), fs = require('fs');
let pw; try { pw = require('playwright'); } catch (e) { try { pw = require('playwright-core'); } catch (e2) { console.error('Install playwright or playwright-core first.'); process.exit(2); } }

function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const base = path.join(process.env.HOME || '', '.cache/ms-playwright');
  if (!fs.existsSync(base)) return undefined;
  return fs.readdirSync(base).flatMap(d => [path.join(base, d, 'chrome-linux64/chrome'), path.join(base, d, 'chrome-linux/chrome'), path.join(base, d, 'chrome-win/chrome.exe')]).find(fs.existsSync);
}

const target = process.argv[2] || 'file://' + path.resolve(__dirname, '..', 'index.html');
let passed = 0, failed = 0;
const ok = (cond, what) => { if (cond) { passed++; console.log('ok  ', what); } else { failed++; process.exitCode = 1; console.log('FAIL', what); } };

// A made-up account: five purposes, READMEs that overlap, a few health problems.
function fakeAccount() {
  const now = Date.now(), DAYMS = 86400000, repos = [];
  const T = ['eye gaze aac webgazer calibration board accessibility', 'signed receipts ledger evidence wallet agent assurance', 'godot tactical board game units', 'encrypted relay messenger phone hosting privacy', 'developer tools cli terminal diff proof'];
  for (let i = 0; i < 40; i++) repos.push({
    name: ['gaze', 'receipt', 'tactics', 'relay', 'tool'][i % 5] + '-' + i, description: i % 4 ? T[i % 5].split(' ').slice(0, 3).join(' ') : '',
    topics: [], language: ['Go', 'Python', 'GDScript', 'JavaScript', 'Rust'][i % 5], size: 100 * i, stargazers_count: 0,
    created_at: new Date(now - (300 - i * 7) * DAYMS).toISOString(), pushed_at: new Date(now - i * 9 * DAYMS).toISOString(),
    html_url: 'https://github.com/test/r' + i, license: i % 3 ? { spdx_id: 'MIT' } : null, open_issues_count: i === 5 ? 12 : 0,
    _f: { 'README.md': T[i % 5] + (i % 6 === 0 ? ' see receipt-1' : '') }
  });
  return repos;
}

(async () => {
  const b = await pw.chromium.launch({ executablePath: findChrome() });
  const errs = [];
  const open = async (w, h) => { const pg = await b.newPage({ viewport: { width: w, height: h } }); pg.on('pageerror', e => errs.push(e.message)); await pg.goto(target); await pg.waitForTimeout(1200); return pg; };
  const noScroll = pg => pg.evaluate(() => document.scrollingElement.scrollHeight - innerHeight);
  const loadAccount = pg => pg.evaluate(src => { const repos = eval(src)(); run(Promise.resolve({ graph: buildAccountGraph('test', repos), meta: { name: 'test', ref: '40 repos', kind: 'account', owner: 'test' } })); }, '(' + fakeAccount.toString() + ')');

  // 1. Example map + time + health
  let pg = await open(1366, 768);
  const s1 = await pg.evaluate(() => ({ unit: S.unit, n: S.nodes.length, time: !document.getElementById('timebar').hidden, rings: S.nodes.filter(n => n._h).length }));
  ok(s1.unit === 'files' && s1.n > 20, 'example map loads (' + s1.n + ' objects)');
  ok(s1.time, 'example has a time bar (built-in history)');
  ok(s1.rings > 5, 'health rings on code files');
  await pg.evaluate(() => { const r = document.getElementById('trange'); r.value = 1; r.dispatchEvent(new Event('input')); });
  ok(await pg.evaluate(() => S.nodes.some(n => n._hid)), 'time: files not yet added are hidden at an early commit');

  // 2. Inside a file + ripple through functions
  await pg.evaluate(() => { const r = document.getElementById('trange'); r.value = r.max; r.dispatchEvent(new Event('input')); lookInside(S.byId.get('js/ui/render.js')); });
  await pg.waitForTimeout(500);
  const s2 = await pg.evaluate(() => { setRemoved('fn:escape', true); return { unit: S.unit, hit: ['fn:row', 'fn:render', 'in:js/ui/pages/home.js'].every(id => S.depth.has(id)) }; });
  ok(s2.unit === 'functions', 'Look inside opens the function map');
  ok(s2.hit, 'switching a function off ripples to its callers, in and out of the file');
  await pg.evaluate(() => { S.removed.clear(); setRemoved('__none__', false); backToFiles(); });
  ok(await pg.evaluate(() => S.unit === 'files'), '← All files goes back');

  // 3. Account: purpose groups, health, suggested links, frame time
  await loadAccount(pg); await pg.waitForTimeout(2500);
  const s3 = await pg.evaluate(() => {
    const t0 = performance.now(); for (let i = 0; i < 20; i++) draw(t0); const ms = (performance.now() - t0) / 20;
    return { unit: S.unit, groups: S.groupOrder.length, ghosts: S.ghosts.length, warn: Array.from(S.health.values()).filter(h => h.level === 'warn').length, ms };
  });
  ok(s3.unit === 'repos' && s3.groups >= 4, 'account map groups by purpose (' + s3.groups + ' groups)');
  ok(s3.ghosts > 0, 'suggested links found (' + s3.ghosts + ')');
  ok(s3.warn > 0, 'health flags repos worth a look');
  ok(s3.ms < 16, 'a frame draws in under 16 ms (' + s3.ms.toFixed(2) + ' ms)');
  await pg.close();

  // 4. The page never scrolls — every size × every state that grows a panel
  let states = 0, scrolled = [];
  for (const [w, h] of [[1366, 768], [1920, 1080], [1024, 640], [390, 844]]) {
    pg = await open(w, h);
    const chk = async what => { states++; const s = await noScroll(pg); if (s > 0) scrolled.push(w + 'x' + h + ' ' + what + ' +' + s + 'px'); };
    await chk('example');
    await pg.evaluate(() => select('js/store.js')); await chk('example, file selected');
    await pg.evaluate(() => document.querySelector('.ins').click()); await chk('example, insight open');
    await pg.evaluate(() => lookInside(S.byId.get('js/ui/render.js'))); await pg.waitForTimeout(200); await pg.evaluate(() => select('fn:render')); await chk('inside a file, function selected');
    await loadAccount(pg); await pg.waitForTimeout(1200); await chk('account');
    await pg.evaluate(() => select('repo:gaze-0')); await chk('account, repo selected');
    for (const k of ['Needs attention', 'Suggested links', 'Standalone']) { await pg.evaluate(k => { const c = Array.from(document.querySelectorAll('.ins')).find(e => e.textContent.indexOf(k) === 0); if (c) c.click(); }, k); await chk('account, ' + k + ' open'); }
    await pg.evaluate(() => { const r = document.getElementById('trange'); r.value = 300; r.dispatchEvent(new Event('input')); }); await chk('account, time moved back');
    await pg.close();
  }
  ok(!scrolled.length, 'page never scrolls (' + states + ' states)' + (scrolled.length ? ': ' + scrolled.join('; ') : ''));
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));

  await b.close();
  console.log('\n' + passed + ' passed' + (failed ? ', ' + failed + ' FAILED' : ''));
})();
