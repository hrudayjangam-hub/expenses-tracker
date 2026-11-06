const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const WebSocket = require('ws');

const BASE = process.env.ET_BASE_URL || 'http://localhost:5173';
const CDP = process.env.ET_CDP_URL || 'http://127.0.0.1:9222';
const DOWNLOAD_DIR = path.join(__dirname, 'downloads');
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

let chromeProc = null;
function stopChrome() {
  if (chromeProc) { try { chromeProc.kill(); } catch {} chromeProc = null; }
}

function req(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const r = http.request(
      { hostname: u.hostname, port: u.port, path: u.pathname + u.search, method: opts.method || 'GET', headers: opts.headers || {} },
      (res) => { let d = ''; res.on('data', (c) => (d += c)); res.on('end', () => resolve(d)); }
    );
    r.on('error', reject);
    if (opts.body) r.write(opts.body);
    r.end();
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  | ' + detail : ''}`);
}

const HELPERS = `
(function(){
  const norm = s => (s || '').replace(/\\s+/g, ' ').trim();
  window.__norm = norm;
  window.__btns = (text, root) => {
    const scope = root || document;
    const all = Array.from(scope.querySelectorAll('button, a, [role=button]')).filter(b => b.offsetParent !== null);
    const label = b => norm(b.innerText) || norm(b.getAttribute('aria-label'));
    let els = all.filter(b => label(b) === text);
    if (!els.length) els = all.filter(b => label(b).includes(text));
    return els;
  };
  window.__click = (text, root) => {
    const els = window.__btns(text, root);
    if (!els.length) return 'not-found:' + text;
    els[0].click();
    return 'clicked';
  };
  window.__setVal = (el, value) => {
    if (!el) return 'no-el';
    const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype
      : el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) desc.set.call(el, value); else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return 'set';
  };
  window.__txt = () => document.body.innerText.replace(/\\s+/g, ' ');
  window.__dialog = () => document.querySelector('[role=dialog]');
  return 'helpers-ready';
})()`;

(async () => {
  // ---------- PREFLIGHT: app up, Chrome CDP available ----------
  const reachable = async (url) => { try { await req(url); return true; } catch { return false; } };
  if (!(await reachable(BASE))) {
    console.error(`App not reachable at ${BASE}.\nStart it first:\n  cd backend  && npm start   # :5000\n  cd frontend && npm run dev  # :5173`);
    process.exit(3);
  }
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

  let cdpUp = await reachable(CDP + '/json/version');
  if (!cdpUp) {
    const exe = CHROME_CANDIDATES.find((p) => { try { return fs.existsSync(p); } catch { return false; } });
    if (!exe) { console.error('Chrome not found. Set CHROME_PATH to your Chrome binary.'); process.exit(3); }
    chromeProc = spawn(exe, [
      '--headless=new', '--disable-gpu', '--no-first-run',
      '--remote-debugging-port=9222',
      '--user-data-dir=' + path.join(__dirname, '.chrome-profile'),
      'about:blank',
    ], { stdio: 'ignore' });
    for (let i = 0; i < 60 && !cdpUp; i++) { await sleep(500); cdpUp = await reachable(CDP + '/json/version'); }
    if (!cdpUp) { console.error('Chrome DevTools endpoint did not come up on port 9222.'); stopChrome(); process.exit(3); }
    console.log('launched headless Chrome for this run');
  }

  const targets = JSON.parse(await req(CDP + '/json'));
  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl, { perMessageDeflate: false, maxPayload: 64 * 1024 * 1024 });

  let id = 0; const pending = new Map(); const errors = []; const warns = [];
  ws.on('message', (m) => {
    const msg = JSON.parse(m.toString());
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    if (msg.method === 'Runtime.exceptionThrown') {
      errors.push('EXCEPTION ' + (msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text || '').slice(0, 300));
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      const t = (msg.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ');
      if (t.trim()) errors.push('CONSOLE ' + t.slice(0, 250));
    }
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      const t = msg.params.entry.text;
      if (!/401|favicon|Failed to load resource/.test(t)) errors.push('LOG ' + t.slice(0, 250));
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'warning') {
      const t = (msg.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ');
      if (t.trim()) warns.push(t.slice(0, 150));
    }
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const i = ++id; pending.set(i, resolve);
      ws.send(JSON.stringify({ id: i, method, params }));
      setTimeout(() => { if (pending.has(i)) { pending.delete(i); reject(new Error('cdp timeout ' + method)); } }, 25000);
    });

  const ev = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.result.exceptionDetails) throw new Error('eval failed: ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text));
    return r.result.result.value;
  };
  const helpers = () => ev(HELPERS);
  const waitFor = async (expression, timeout = 8000, step = 250) => {
    const t0 = Date.now();
    let last;
    while (Date.now() - t0 < timeout) {
      last = await ev(expression);
      if (last) return last;
      await sleep(step);
    }
    return last;
  };

  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
  await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  try {
    await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DOWNLOAD_DIR, eventsEnabled: true });
  } catch (e) { console.log('note: download behavior not set -', e.message); }

  // ---------- 0. CLEANUP leftovers from previous runs ----------
  const login = JSON.parse(await req(BASE + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@expenses.app', password: 'Demo@1234' }),
  }));
  if (!login.success) throw new Error('api login failed');
  const auth = { Authorization: 'Bearer ' + login.token, 'Content-Type': 'application/json' };
  const stale = JSON.parse(await req(BASE + `/api/transactions?search=${encodeURIComponent('E2E automated test entry')}&limit=50`, { headers: auth }));
  const staleRows = stale?.data?.transactions || stale?.transactions || [];
  for (const t of staleRows) {
    await req(BASE + '/api/transactions/' + t._id, { method: 'DELETE', headers: auth });
  }
  console.log(`cleanup: removed ${staleRows.length} leftover test transaction(s)\n`);

  // ---------- 1. LOGIN ----------
  await send('Page.navigate', { url: BASE + '/login' });
  await sleep(2500);
  await ev('localStorage.clear(); "cleared"');
  await send('Page.navigate', { url: BASE + '/login' });
  await helpers();
  await waitFor(`!!document.querySelector('input[type=email]')`, 8000);
  await ev(`window.__setVal(document.querySelector('input[type=email]'), 'demo@expenses.app'); window.__setVal(document.querySelector('input[type=password]'), 'Demo@1234'); 'ok'`);
  await ev(`window.__click('Log in'); 'ok'`);
  const loggedIn = await waitFor(`location.pathname === '/' && document.body.innerText.includes('Hello, Demo')`, 9000);
  check('Login: demo account signs in and lands on dashboard', !!loggedIn, loggedIn ? '' : 'path=' + await ev('location.pathname'));

  // ---------- 2. ADD TRANSACTION ----------
  await send('Page.navigate', { url: BASE + '/transactions' });
  await helpers();
  await waitFor(`document.body.innerText.includes('Search, filter')`, 9000);
  await ev(`window.__click('Add transaction'); 'ok'`);
  const modalOpen = await waitFor(`!!window.__dialog() && window.__dialog().innerText.includes('Record a new income')`, 6000);
  check('Transactions: "Add transaction" modal opens', !!modalOpen);
  await ev(`
    const d = window.__dialog();
    window.__setVal(d.querySelector('input[type=number]'), '4321.99');
    const sel = d.querySelectorAll('select')[0];
    const opt = Array.from(sel.options).find(o => o.value && o.value !== 'Food') || sel.options[1];
    window.__setVal(sel, opt.value);
    window.__setVal(d.querySelector('textarea'), 'E2E automated test entry');
    window.__cat = opt.value;
    'ok'`);
  await ev(`window.__click('Add transaction', window.__dialog()); 'ok'`);
  const added = await waitFor(`document.body.innerText.includes('Transaction added')`, 9000);
  check('Transactions: create via modal + success toast', !!added);
  await waitFor(`!window.__dialog()`, 5000);

  // ---------- 3. SEARCH ----------
  await ev(`window.__setVal(document.querySelector('input[aria-label="Search transactions"]'), 'E2E automated test entry'); 'ok'`);
  const found = await waitFor(`(() => {
    const trs = Array.from(document.querySelectorAll('tbody tr'));
    return trs.length > 0 && trs.length <= 3 && trs.every(r => r.innerText.includes('E2E automated test entry'));
  })()`, 8000);
  const rowCount = await ev(`document.querySelectorAll('tbody tr').length`);
  check('Transactions: search filters to the new record', !!found, `rows=${rowCount}`);

  // ---------- 4. VIEW DETAIL ----------
  await ev(`(() => { const tr = Array.from(document.querySelectorAll('tbody tr')).find(r => r.innerText.includes('E2E automated test entry')); tr.click(); return 'ok'; })()`);
  const detail = await waitFor(`!!window.__dialog() && window.__dialog().innerText.includes('Category')`, 6000);
  const detailHasAmount = detail ? (await ev(`window.__dialog().innerText`)).includes('4,321.99') : false;
  check('Transactions: detail view shows full record', !!detail && detailHasAmount, detailHasAmount ? '' : 'amount missing');
  await ev(`window.__click('Close dialog'); 'ok'`);
  await waitFor(`!window.__dialog()`, 5000);

  // ---------- 5. EDIT ----------
  await ev(`(() => {
    const tr = Array.from(document.querySelectorAll('tbody tr')).find(r => r.innerText.includes('E2E automated test entry'));
    if (!tr) return 'no-row';
    tr.querySelector('button[aria-label="Edit transaction"]').click();
    return 'ok';
  })()`);
  const editOpen = await waitFor(`!!window.__dialog() && window.__dialog().innerText.includes('Edit transaction')`, 6000);
  check('Transactions: edit modal opens prefilled', !!editOpen);
  await ev(`window.__setVal(window.__dialog().querySelector('input[type=number]'), '5555.55'); 'ok'`);
  await ev(`window.__click('Save changes', window.__dialog()); 'ok'`);
  const updated = await waitFor(`document.body.innerText.includes('Transaction updated')`, 9000);
  check('Transactions: update saves + success toast', !!updated);
  const showsNew = await waitFor(`document.body.innerText.includes('5,555.55')`, 7000);
  check('Transactions: updated amount renders in list', !!showsNew);

  // ---------- 6. DELETE ----------
  await ev(`(() => {
    const tr = Array.from(document.querySelectorAll('tbody tr')).find(r => r.innerText.includes('E2E automated test entry'));
    if (!tr) return 'no-row';
    tr.querySelector('button[aria-label="Delete transaction"]').click();
    return 'ok';
  })()`);
  const delOpen = await waitFor(`!!window.__dialog() && window.__dialog().innerText.includes('Delete transaction')`, 6000);
  check('Transactions: delete confirmation dialog appears', !!delOpen);
  await ev(`window.__click('Delete', window.__dialog()); 'ok'`);
  const deleted = await waitFor(`document.body.innerText.includes('Transaction deleted')`, 9000);
  check('Transactions: delete confirms + success toast', !!deleted);
  const gone = await waitFor(`!document.body.innerText.includes('E2E automated test entry')`, 7000);
  check('Transactions: record removed after delete', !!gone);

  // ---------- 7. BUDGETS ----------
  await send('Page.navigate', { url: BASE + '/budgets' });
  await helpers();
  await waitFor(`document.body.innerText.includes('Set monthly limits')`, 9000);
  const beforeBudgets = await ev(`document.querySelectorAll('article').length`);
  await ev(`window.__click('New budget'); 'ok'`);
  const budgetModal = await waitFor(`!!window.__dialog() && window.__dialog().innerText.includes('Create budget')`, 6000);
  check('Budgets: create modal opens', !!budgetModal);
  await ev(`
    const d = window.__dialog();
    const sel = d.querySelectorAll('select')[0];
    const opt = Array.from(sel.options).find(o => o.value && !o.value.startsWith('Overall'));
    if (!opt) throw new Error('no free category available for budget test');
    window.__setVal(sel, opt.value);
    window.__budgetCat = opt.value;
    window.__setVal(d.querySelector('input[type=number]'), '4321');
    'ok'`);
  await ev(`window.__click('Create budget', window.__dialog()); 'ok'`);
  const budgetCreated = await waitFor(`document.body.innerText.includes('Budget created')`, 9000);
  check('Budgets: create via modal + success toast', !!budgetCreated);
  const budgetShown = await waitFor(`Array.from(document.querySelectorAll('article')).some(a => a.innerText.includes(window.__budgetCat) && a.innerText.includes('4,321.00'))`, 8000);
  check('Budgets: new budget card renders with amount', !!budgetShown, `cat=${await ev('window.__budgetCat || ""')}`);
  await ev(`(() => {
    const btn = Array.from(document.querySelectorAll('button[aria-label="Delete budget"]'))
      .find(b => (b.closest('article')?.innerText || '').includes(window.__budgetCat));
    if (!btn) return 'no-btn';
    btn.click(); return 'ok';
  })()`);
  const budgetDelOpen = await waitFor(`!!window.__dialog() && window.__dialog().innerText.includes('Delete budget?')`, 6000);
  check('Budgets: delete confirmation dialog appears', !!budgetDelOpen);
  await ev(`window.__click('Delete', window.__dialog()); 'ok'`);
  const budgetDeleted = await waitFor(`document.body.innerText.includes('Budget deleted')`, 9000);
  check('Budgets: delete confirms + success toast', !!budgetDeleted);
  const budgetCountBack = await waitFor(`document.querySelectorAll('article').length === ${beforeBudgets}`, 8000);
  check('Budgets: list back to original count', !!budgetCountBack, `${beforeBudgets} cards`);

  // ---------- 8. CATEGORIES ----------
  await send('Page.navigate', { url: BASE + '/categories' });
  await helpers();
  await waitFor(`document.body.innerText.includes('Organise transactions')`, 9000);
  await ev(`window.__click('New category'); 'ok'`);
  const catModal = await waitFor(`!!window.__dialog() && window.__dialog().innerText.includes('New category')`, 6000);
  check('Categories: create modal opens', !!catModal);
  await ev(`window.__setVal(window.__dialog().querySelector('input[placeholder="e.g. Subscriptions"]'), 'E2E Test Cat'); 'ok'`);
  await ev(`window.__click('Create category', window.__dialog()); 'ok'`);
  const catCreated = await waitFor(`document.body.innerText.includes('Category created')`, 9000);
  check('Categories: create via modal + success toast', !!catCreated);
  const catShown = await waitFor(`document.body.innerText.includes('E2E Test Cat')`, 7000);
  check('Categories: new category appears in list', !!catShown);
  await ev(`(() => { const b = document.querySelector('button[aria-label="Delete E2E Test Cat"]'); if (!b) return 'no-btn'; b.click(); return 'ok'; })()`);
  const catDelOpen = await waitFor(`!!window.__dialog() && window.__dialog().innerText.includes('Delete category?')`, 6000);
  check('Categories: delete confirmation dialog appears', !!catDelOpen);
  await ev(`window.__click('Delete', window.__dialog()); 'ok'`);
  const catDeleted = await waitFor(`document.body.innerText.includes('Category deleted')`, 9000);
  check('Categories: delete confirms + success toast', !!catDeleted);
  const catGone = await waitFor(`!document.body.innerText.includes('E2E Test Cat')`, 7000);
  check('Categories: category removed', !!catGone);

  // ---------- 9. REPORTS + CSV EXPORT ----------
  await send('Page.navigate', { url: BASE + '/reports' });
  await helpers();
  await waitFor(`document.body.innerText.includes('TOTAL INCOME') || document.body.innerText.includes('Generate monthly')`, 10000);
  await ev(`window.__click('CSV'); 'ok'`);
  const csvToast = await waitFor(`document.body.innerText.includes('CSV downloaded')`, 9000);
  check('Reports: CSV export runs + confirms download', !!csvToast);
  await sleep(1500);
  let csvFile = '';
  try { csvFile = fs.readdirSync(DOWNLOAD_DIR).filter(f => f.endsWith('.csv')).join(', '); } catch {}
  check('Reports: CSV file written to disk', !!csvFile, csvFile || 'no file (headless download dir not set)');

  // ---------- 10. ANALYTICS + DASHBOARD SMOKE ----------
  await send('Page.navigate', { url: BASE + '/analytics' });
  await helpers();
  const analyticsOk = await waitFor(`document.body.innerText.includes('AVG DAILY EXPENSE') && document.body.innerText.includes('Category-wise analysis')`, 10000);
  check('Analytics: page renders KPIs + charts', !!analyticsOk);

  await send('Page.navigate', { url: BASE + '/' });
  await helpers();
  const dashOk = await waitFor(`document.body.innerText.includes('TOTAL BALANCE') && document.body.innerText.includes('Spending trend')`, 10000);
  check('Dashboard: page renders balance + charts', !!dashOk);
  const stickyOk = await ev(`(() => {
    const h = document.querySelector('header');
    if (!h) return 'no-header';
    window.scrollTo(0, 400);
    return new Promise(r => setTimeout(() => {
      const scrolled = h.className.includes('shadow-');
      window.scrollTo(0, 0);
      setTimeout(() => r(scrolled && !h.className.includes('shadow-') ? 'blur-toggled' : 'static:' + h.className.slice(0, 80)), 500);
    }, 500));
  })()`);
  check('Dashboard: sticky header blur reacts to scroll', stickyOk === 'blur-toggled', String(stickyOk));

  // ---------- 11. THEME TOGGLE ----------
  const beforeDark = await ev(`document.documentElement.classList.contains('dark')`);
  await ev(`document.querySelector('button[aria-label="Toggle theme"]').click(); 'ok'`);
  await sleep(600);
  const afterDark = await ev(`document.documentElement.classList.contains('dark')`);
  check('Settings: theme toggle flips light/dark', beforeDark !== afterDark, `dark ${beforeDark} -> ${afterDark}`);

  // ---------- 12. LOGOUT ----------
  await ev(`(() => { const els = window.__btns('Log out'); if (!els.length) return 'no-btn'; els[0].click(); return 'ok'; })()`);
  const loggedOut = await waitFor(`location.pathname === '/login'`, 8000);
  check('Logout: returns to login screen', !!loggedOut, await ev('location.pathname'));
  const stillWorks = await waitFor(`document.body.innerText.includes('Welcome back')`, 6000);
  check('Login screen renders after logout', !!stillWorks);

  // ---------- SUMMARY ----------
  console.log('\n=== RESULTS ===');
  const passed = results.filter((r) => r.ok).length;
  console.log(`${passed}/${results.length} checks passed`);
  console.log(`JS errors: ${errors.length}`);
  errors.slice(0, 10).forEach((e) => console.log('  ' + e));
  console.log(`Console warnings: ${warns.length}`);
  warns.slice(0, 5).forEach((e) => console.log('  ' + e));
  const failed = results.filter((r) => !r.ok);
  if (failed.length) { console.log('FAILURES:'); failed.forEach((f) => console.log('  - ' + f.name)); }

  ws.close();
  stopChrome();
  process.exit(failed.length || errors.length ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); stopChrome(); process.exit(2); });
