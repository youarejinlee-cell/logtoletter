const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Run real TS modules while replacing native adapters; no simulator is needed.
function harness(extra = {}) {
  const values = new Map();
  const cache = new Map();
  const mocks = {
    '@react-native-async-storage/async-storage': {
      getItem: async key => values.get(key) ?? null,
      setItem: async (key, value) => { values.set(key, value); },
      removeItem: async key => { values.delete(key); }
    },
    'react-native': { Platform: { OS: 'ios', select: options => options.ios } },
    ...extra
  };
  function load(file) {
    file = path.resolve(__dirname, '..', file);
    if (!path.extname(file)) file += '.ts';
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }
    }).outputText;
    const requireModule = id => id in mocks ? mocks[id] : id.startsWith('.') ? load(path.resolve(path.dirname(file), id)) : require(id);
    new Function('require', 'module', 'exports', '__DEV__', code)(requireModule, module, module.exports, false);
    return module.exports;
  }
  return { load, values };
}

const policy = harness().load('src/lib/accessPolicy.ts');
const start = '2026-10-05T10:00:00.000Z';

test('no trial starts simply by opening the app', () => {
  assert.equal(policy.getAccessState(undefined, false).status, 'not_started');
  assert.equal(policy.getAccessState(undefined, false).canCreate, true);
});
test('access ends exactly 30 days after the first save', () => {
  const before = policy.getAccessState(start, false, new Date('2026-11-04T09:59:59.999Z'));
  const at = policy.getAccessState(start, false, new Date('2026-11-04T10:00:00.000Z'));
  assert.equal(before.status, 'trial');
  assert.equal(before.daysRemaining, 1);
  assert.equal(at.status, 'expired');
  assert.equal(at.canCreate, false);
});
test('month/year rollover uses elapsed days, not calendar month end', () => {
  assert.equal(policy.getAccessState('2026-12-20T00:00:00Z', false, new Date('2026-12-20')).endsAt, '2027-01-19T00:00:00.000Z');
});
test('an existing subscriber keeps access after trial expiry', () => {
  assert.equal(policy.getAccessState(start, true, new Date('2027-12-01')).status, 'subscribed');
});
test('subscription expiry does not restart an old trial', () => {
  assert.equal(policy.getAccessState(start, false, new Date('2027-12-01')).canCreate, false);
});
test('future-dated starts cannot extend access', () => {
  assert.equal(policy.getAccessState('2030-01-01', false, new Date('2026-10-05')).canCreate, false);
});
test('account/guest merge retains the earliest start in either order', () => {
  const other = '2026-10-09T00:00:00Z';
  assert.equal(policy.earliestTrialStart(start, other), start);
  assert.equal(policy.earliestTrialStart(other, start), start);
  assert.equal(policy.earliestTrialStart('invalid', undefined, start), start);
});
test('equivalent timezone dates normalize consistently', () => {
  assert.equal(policy.normalizeTrialStart('2026-10-05T19:00:00+09:00'), start);
});
test('empty first launch does not persist a trial', async () => {
  const { load, values } = harness();
  const storage = load('src/lib/storage.ts');
  assert.equal((await storage.loadAppState(null)).trialStartedAt, undefined);
  assert.equal([...values.keys()].some(key => key.endsWith(":trial-start")), false);
});
test('deleting all local records cannot restart the trial', async () => {
  const storage = harness().load('src/lib/storage.ts');
  await storage.saveAppState({ ...storage.defaultState, trialStartedAt: start }, 'account-a');
  await storage.removeAppState('account-a');
  await storage.saveAppState(storage.defaultState, 'account-a');
  assert.equal((await storage.loadAppState('account-a')).trialStartedAt, start);
});
test('a later save cannot extend a remembered trial', async () => {
  const storage = harness().load('src/lib/storage.ts');
  await storage.saveAppState({ ...storage.defaultState, trialStartedAt: start }, 'account-a');
  await storage.saveAppState({ ...storage.defaultState, trialStartedAt: '2026-10-20' }, 'account-a');
  assert.equal((await storage.loadAppState('account-a')).trialStartedAt, start);
});
test('account A does not inherit account B or guest entitlement', async () => {
  const storage = harness().load('src/lib/storage.ts');
  await storage.saveAppState({ ...storage.defaultState, trialStartedAt: start }, 'account-a');
  assert.equal((await storage.loadAppState('account-b')).trialStartedAt, undefined);
  assert.equal((await storage.loadAppState(null)).trialStartedAt, undefined);
});
test('existing local records receive one transition period, not a reset each launch', async () => {
  const { load, values } = harness();
  const storage = load('src/lib/storage.ts');
  values.set(storage.appStateStorageKey(null), JSON.stringify({ ...storage.defaultState, entries: [{ id: 'old', text: 'old record', createdAt: '2020-01-01', energy: 50, mood: 'calm' }] }));
  const first = await storage.loadAppState(null);
  assert.ok(first.trialStartedAt);
  assert.equal((await storage.loadAppState(null)).trialStartedAt, first.trialStartedAt);
  assert.equal(first.entries.length, 1);
});

function subscriptionHarness({ active = true, packages = [], catalogFails = false } = {}) {
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY = 'test-key';
  let identity = null;
  const sdk = {
    setLogLevel() {}, configure: options => { identity = options.appUserID; },
    logIn: async id => { identity = id; }, logOut: async () => { identity = null; },
    getCustomerInfo: async () => ({ entitlements: { active: active ? { premium: {} } : {} }, managementURL: identity }),
    getOfferings: async () => { if (catalogFails) throw new Error('offline catalog'); return { current: { availablePackages: packages } }; }
  };
  return harness({ 'react-native-purchases': { __esModule: true, default: sdk, LOG_LEVEL: { DEBUG: 'debug' } } }).load('src/lib/subscription.ts');
}
test('catalog failure does not remove an existing subscription', async () => {
  const snapshot = await subscriptionHarness({ catalogFails: true }).syncRevenueCatUser('a');
  assert.equal(snapshot.active, true);
  assert.equal(snapshot.annualPackage, null);
});
test('a monthly product cannot be silently sold as annual', async () => {
  const snapshot = await subscriptionHarness({ packages: [{ packageType: 'MONTHLY' }] }).syncRevenueCatUser('a');
  assert.equal(snapshot.annualPackage, null);
});
test('concurrent account refreshes keep each SDK identity separate', async () => {
  const sdk = subscriptionHarness();
  const [a, b] = await Promise.all([sdk.syncRevenueCatUser('a'), sdk.syncRevenueCatUser('b')]);
  assert.equal(a.managementUrl, 'a');
  assert.equal(b.managementUrl, 'b');
});
