// Offline regression tests: execute the real component and collection route with
// in-memory hooks, cookies, and database adapters. No network or database access.
/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS test runner, like the other scripts. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { test } = require('node:test');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const measurementId = 'G-TEST123456';
const plain = value => JSON.parse(JSON.stringify(value));
const isCommand = value => Object.prototype.toString.call(value) === '[object Arguments]';

function harness(options = {}) {
  const slots = [], effects = [], timers = new Map(), cookies = new Map();
  const requests = [], savedEvents = [], listeners = new Map(), cache = new Map();
  let cursor = 0, dirty = true, tree, nextTimer = 0;
  let actor = options.role ? { userId: 'fixture-user', role: options.role } : null;
  let params = new URLSearchParams(options.query || '');
  if (options.consent) cookies.set('lw_analytics_consent', options.consent);
  const location = { origin: 'https://linkwe.test', hostname: 'linkwe.test', pathname: options.pathname || '/' };
  const window = {
    location,
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: name => listeners.delete(name),
    dispatchEvent: event => listeners.get(event.type)?.(event),
    ...(options.gtag ? { gtag: options.gtag } : {}),
  };
  const document = { hidden: false, referrer: '', cookie: '', addEventListener() {}, removeEventListener() {} };
  const jar = {
    get: key => cookies.has(key) ? { value: cookies.get(key) } : undefined,
    set: (key, value) => cookies.set(key, value),
    delete: key => cookies.delete(key),
  };
  const prisma = {
    user: { findUnique: async () => actor ? { role: actor.role } : null },
    analyticsEvent: { createMany: async ({ data }) => { savedEvents.push(...data); return { count: data.length }; } },
    analyticsCollection: { upsert: async () => ({ id: 'main' }) },
    $transaction: values => Promise.all(values),
  };
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { value: initial };
      return [slots[index].value, value => {
        const next = typeof value === 'function' ? value(slots[index].value) : value;
        if (!Object.is(next, slots[index].value)) { slots[index].value = next; dirty = true; }
      }];
    },
    useRef(initial) {
      const index = cursor++;
      slots[index] ??= { current: initial };
      return slots[index];
    },
    useEffect(callback, deps) {
      const index = cursor++, prior = slots[index];
      if (!prior || deps.some((value, i) => !Object.is(value, prior.deps[i]))) {
        slots[index] = { deps, cleanup: prior?.cleanup };
        effects.push(() => { slots[index].cleanup?.(); slots[index].cleanup = callback(); });
      }
    },
  };
  const jsx = (type, props) => ({ type, props });
  const mocks = {
    react: hooks,
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'next/script': { default: 'Script', __esModule: true },
    'next/link': { default: 'Link', __esModule: true },
    'next/navigation': { usePathname: () => location.pathname, useSearchParams: () => params },
    'next/web-vitals': { useReportWebVitals() {} },
    'next/headers': { cookies: async () => jar },
    'server-only': {},
    '@/lib/auth/session': { getSession: async () => actor },
    '@/lib/prisma': { prisma },
    '@/lib/security/rate-limit': { checkRateLimit: async () => ({ allowed: true }) },
  };
  const context = vm.createContext({
    window, document, location, URL, URLSearchParams, Request, Response, Buffer, console, crypto,
    Event: class { constructor(type) { this.type = type; } },
    process: { env: { NODE_ENV: 'production', AUTH_SECRET: 'offline-regression-fixture', NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: options.measurementId ?? measurementId, ...options.env } },
    setTimeout: callback => { const id = ++nextTimer; timers.set(id, callback); return id; },
    clearTimeout: id => timers.delete(id),
    fetch: async (url, init) => {
      assert.equal(url, '/api/analytics', 'tests must never contact a real endpoint');
      requests.push(init?.body ? JSON.parse(init.body) : { action: 'GET' });
      const route = load(path.join(root, 'app/api/analytics/route.ts'));
      if (!init?.body) return route.GET();
      if (options.rejectStart && JSON.parse(init.body).action === 'start') return Response.json({ accepted: false });
      return route.POST(new Request('https://linkwe.test/api/analytics', {
        method: 'POST', headers: { origin: 'https://linkwe.test', 'content-type': 'application/json' }, body: init.body,
      }));
    },
  });
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const loadedModule = { exports: {} }; cache.set(file, loadedModule);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    const localRequire = request => {
      if (Object.hasOwn(mocks, request)) return mocks[request];
      if (request === 'node:crypto') return crypto;
      if (request.startsWith('@/') || request.startsWith('.')) {
        const target = request.startsWith('@/') ? path.join(root, request.slice(2)) : path.resolve(path.dirname(file), request);
        return load(target + (fs.existsSync(target + '.ts') ? '.ts' : '.tsx'));
      }
      throw new Error(`Unexpected dependency: ${request}`);
    };
    vm.runInContext(`(function(require,module,exports){${code}\n})`, context, { filename: file })(localRequire, loadedModule, loadedModule.exports);
    return loadedModule.exports;
  }
  const component = load(path.join(root, 'components/analytics/GoogleAnalytics.tsx'));
  async function settle() {
    for (let i = 0; i < 12; i++) {
      if (dirty) { dirty = false; cursor = 0; tree = component.default(); }
      while (effects.length) effects.shift()();
      await new Promise(resolve => setImmediate(resolve));
    }
    assert.equal(dirty, false, 'component should settle');
  }
  function find(type, predicate, node) {
    if (!node) return null;
    if (Array.isArray(node)) { for (const child of node) { const found = find(type, predicate, child); if (found) return found; } return null; }
    if (node.type === type && predicate(node.props)) return node;
    return find(type, predicate, node.props?.children ?? null);
  }
  return {
    window, requests, savedEvents, cookies, component, settle,
    script: () => find('Script', () => true, tree),
    async choose(accepted) {
      window.dispatchEvent({ type: 'linkwe:analytics-preferences' }); await settle();
      const button = find('button', props => props.children === (accepted ? 'Allow analytics' : 'Decline analytics'), tree);
      assert.ok(button); button.props.onClick(); await settle();
    },
    async navigate(pathname, role) {
      location.pathname = pathname; params = new URLSearchParams();
      if (role !== undefined) actor = role ? { userId: 'fixture-user', role } : null;
      dirty = true; await settle();
    },
    async flush() { for (const [id, callback] of [...timers]) { timers.delete(id); callback(); } await settle(); },
  };
}

test('consented anonymous startup queues gtag commands as Arguments objects', async () => {
  const h = harness({ consent: 'accepted' }); await h.settle();
  const commands = h.window.dataLayer;
  assert.ok(commands.length >= 4);
  assert.ok(commands.every(isCommand), 'gtag must receive Arguments, not arrays');
  assert.deepEqual(plain(commands.map(command => command[0])), ['consent', 'js', 'config', 'event']);
  assert.equal(commands[2][1], measurementId);
  assert.equal(commands[3][1], 'page_view');
  assert.equal(commands[2][2].send_page_view, false);
  assert.equal(commands[2][2].allow_google_signals, false);
  assert.equal(commands[0][2].ad_storage, 'denied');
  assert.equal(h.script().props.strategy, 'afterInteractive');
  await h.flush(); assert.equal(h.savedEvents[0].name, 'page_view');
});

test('event fallback also queues Arguments and strips private fields', async () => {
  const h = harness({ consent: 'accepted' }); await h.settle();
  h.window.gtag = undefined;
  h.component.trackGoogleAnalyticsEvent('search', { label: 'person@example.test', email: 'private', page_location: 'https://bad.test/?secret=yes', value: 2 });
  const command = h.window.dataLayer.at(-1);
  assert.ok(isCommand(command), 'event fallback must use the same gtag contract');
  assert.deepEqual(plain(command[2]), { page_location: 'https://linkwe.test/', page_path: '/', page_title: 'LinkWe', value: 2 });
});

for (const consent of [undefined, 'declined']) {
  test(`no Google script, commands, or events with ${consent || 'unset'} consent`, async () => {
    const h = harness({ consent }); await h.settle();
    h.component.trackGoogleAnalyticsEvent('page_view'); await h.flush();
    assert.equal(h.script(), null); assert.equal(h.window.gtag, undefined);
    assert.equal(h.requests.some(request => request.action === 'start'), false);
    assert.equal(h.savedEvents.length, 0);
  });
}

for (const role of ['ADMIN', 'COURIER']) {
  test(`${role} stays excluded even with accepted consent`, async () => {
    const h = harness({ role, consent: 'accepted' }); await h.settle(); await h.flush();
    assert.equal(h.component.analyticsEnabled(), false); assert.equal(h.script(), null);
    assert.equal(h.window.gtag, undefined); assert.equal(h.savedEvents.length, 0);
  });
}

test('consent grant, revoke, and re-grant use valid commands and stop forwarding while declined', async () => {
  const h = harness(); await h.settle(); await h.choose(true);
  assert.ok(h.component.analyticsEnabled()); assert.ok(h.script());
  await h.choose(false);
  assert.equal(h.component.analyticsEnabled(), false); assert.equal(h.script(), null);
  assert.equal(h.window[`ga-disable-${measurementId}`], true);
  assert.equal(h.window.dataLayer.at(-1)[2].analytics_storage, 'denied');
  const count = h.window.dataLayer.length;
  h.component.trackGoogleAnalyticsEvent('search'); assert.equal(h.window.dataLayer.length, count);
  await h.choose(true);
  assert.equal(h.window[`ga-disable-${measurementId}`], false);
  assert.equal(h.window.dataLayer.at(-1)[2].analytics_storage, 'granted');
  assert.ok(h.window.dataLayer.every(isCommand));
});

test('a denied session start cannot load Google or forward events', async () => {
  const h = harness({ consent: 'accepted', rejectStart: true }); await h.settle();
  assert.equal(h.script(), null); assert.equal(h.window.gtag, undefined);
  assert.equal(h.component.analyticsEnabled(), false);
});

test('private routes and preview environments remain excluded', async () => {
  for (const options of [{ pathname: '/dashboard/admin' }, { env: { VERCEL_ENV: 'preview' } }]) {
    const h = harness({ consent: 'accepted', ...options }); await h.settle();
    assert.equal(h.script(), null); assert.equal(h.window.gtag, undefined);
    assert.equal(h.component.analyticsEnabled(), false);
  }
});

test('transition to an excluded role disables an already initialized Google tag', async () => {
  const h = harness({ consent: 'accepted' }); await h.settle();
  const count = h.window.dataLayer.length;
  await h.navigate('/shop', 'COURIER');
  h.component.trackGoogleAnalyticsEvent('page_view');
  assert.equal(h.script(), null); assert.equal(h.window[`ga-disable-${measurementId}`], true);
  assert.equal(h.window.dataLayer.length, count);
});

test('an existing gtag function is preserved', async () => {
  const calls = [], gtag = (...args) => calls.push(args);
  const h = harness({ consent: 'accepted', gtag }); await h.settle();
  assert.equal(h.window.gtag, gtag); assert.equal(calls[2][0], 'config');
  assert.equal(calls[3][1], 'page_view');
});

test('missing or invalid measurement IDs retain first-party collection without Google', async () => {
  for (const id of ['', 'invalid-id']) {
    const h = harness({ consent: 'accepted', measurementId: id }); await h.settle(); await h.flush();
    assert.equal(h.window.gtag, undefined); assert.equal(h.script(), null);
    assert.equal(h.savedEvents[0].name, 'page_view');
  }
});
