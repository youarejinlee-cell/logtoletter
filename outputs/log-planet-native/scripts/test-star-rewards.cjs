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

const rewards=harness().load('src/lib/starRewards.ts');
const now=new Date('2026-10-05T08:00:00.000Z');
const entry=(id,createdAt=now.toISOString())=>({id,text:'오늘 기록',mood:'happy',energy:50,createdAt});
const amount=w=>rewards.starBalance(w);
test('daily first only and all lifetime thresholds add once',()=>{
 let w=rewards.emptyStarWallet();
 for(let i=1;i<=110;i++){w=rewards.rewardGuestEntry(w,[],entry(String(i)),now);if([1,4,5,10,20,109,110].includes(i))assert.equal(amount(w),1+(i>=5?1:0)+(i>=10?2:0)+(i>=20?3:0)+(i>=109?10:0));}
 assert.equal(amount(rewards.rewardGuestEntry(w,[],entry('1'),now)),17);
});
test('Korean midnight opens another daily reward, not another lifetime reward',()=>{
 let w=rewards.rewardGuestEntry(rewards.emptyStarWallet(),[],entry('a','2026-10-05T14:59:59Z'),new Date('2026-10-05T14:59:59Z'));
 w=rewards.rewardGuestEntry(w,[],entry('b','2026-10-05T15:00:00Z'),new Date('2026-10-05T15:00:00Z'));assert.equal(amount(w),2);
});
test('anniversaries pay at elapsed 30 and 109 days, independently of records',()=>{
 const w={...rewards.emptyStarWallet(),firstMetAt:now.toISOString()};
 assert.equal(amount(rewards.rewardGuestMissions(w,[],new Date(+now+30*86400000-1))),0);
 let n=rewards.rewardGuestMissions(w,[],new Date(+now+30*86400000));assert.equal(amount(n),3);
 n=rewards.rewardGuestMissions(n,[],new Date(+now+109*86400000));assert.equal(amount(n),13);
 assert.equal(amount(rewards.rewardGuestMissions(n,[],new Date(+now+110*86400000))),13);
});
test('notification reward is idempotent after serialization',()=>{
 let w=rewards.rewardGuestNotification(rewards.emptyStarWallet(),now);assert.equal(amount(w),5);
 w=rewards.normalizeStarWallet(JSON.parse(JSON.stringify(w)));assert.equal(amount(rewards.rewardGuestNotification(w,now)),5);
});
test('historical and future records do not earn a daily reward; imported records count once toward milestones',()=>{
 assert.equal(amount(rewards.rewardGuestEntry(rewards.emptyStarWallet(),[],entry('old','2020-01-01'),now)),0);
 assert.equal(amount(rewards.rewardGuestEntry(rewards.emptyStarWallet(),[],entry('future','2099-01-01'),now)),0);
 const rows=Array.from({length:5},(_,i)=>entry('old'+i,'2020-01-01'));
 let w=rewards.rewardGuestMissions(rewards.emptyStarWallet(),rows,now);assert.equal(amount(w),1);
 assert.equal(amount(rewards.rewardGuestMissions(w,rows,now)),1);
});
test('legacy daily rewards are kept without a second daily payout on transition day; monthly retired',()=>{
 const old={...rewards.emptyStarWallet(),transactions:[{id:'daily:2026-10-05:1',amount:5,reason:'old reward',createdAt:now.toISOString()}]};
 assert.equal(amount(rewards.rewardGuestEntry(old,[],entry('new'),now)),5);
 assert.deepEqual(rewards.rewardGuestAnalysis(old,[entry('old','2026-09-01')],'2026-09',now),old);
});
test('admin debits survive normalization while arbitrary negative rewards are rejected',()=>{
 const w={...rewards.emptyStarWallet(),transactions:[{id:'credit',amount:10,reason:'credit',createdAt:now.toISOString()},{id:'admin:test',amount:-3,reason:'correction',createdAt:now.toISOString()},{id:'forged',amount:-999,reason:'bad',createdAt:now.toISOString()}]};
 assert.equal(amount(rewards.normalizeStarWallet(w)),7);
});
test('React updater replay is pure',()=>{
 const w=rewards.emptyStarWallet();assert.deepEqual(rewards.rewardGuestEntry(w,[],entry('a'),now),rewards.rewardGuestEntry(w,[],entry('a'),now));assert.equal(amount(w),0);
});
test('deletion and reload preserve lifetime count and first meeting; accounts stay isolated',async()=>{
 const h=harness(),s=h.load('src/lib/storage.ts');let w=rewards.emptyStarWallet();
 for(let i=0;i<5;i++)w=rewards.rewardGuestEntry(w,[],entry('e'+i),now);
 await s.saveAppState({...s.defaultState,stars:w});await s.removeAppState(null);
 const loaded=await s.loadAppState();assert.equal(amount(loaded.stars),2);assert.equal(Object.keys(loaded.stars.seenEntries).length,5);assert.equal(loaded.stars.firstMetAt,w.firstMetAt);
 assert.equal(amount((await s.loadAppState('other')).stars),0);
 assert.equal(amount(rewards.rewardGuestEntry(loaded.stars,[],entry('e0'),now)),2);
});
test('overlapping saves merge rewards without dropping milestones',async()=>{
 const h=harness(),s=h.load('src/lib/storage.ts');const first=rewards.rewardGuestEntry(rewards.emptyStarWallet(),[],entry('a'),now);let fifth=first;
 for(let i=0;i<4;i++)fifth=rewards.rewardGuestEntry(fifth,[],entry('b'+i),now);
 await Promise.all([s.saveAppState({...s.defaultState,stars:fifth}),s.saveAppState({...s.defaultState,stars:first})]);assert.equal(amount((await s.loadAppState()).stars),2);
});
test('shop charges exactly 50 once, equips purchased friend, and roundtrips debit',()=>{
 const w={...rewards.emptyStarWallet(),transactions:[{id:'fixture',amount:60,reason:'test',createdAt:now.toISOString()}]};
 const bought=rewards.purchaseGuestFriend(w,'rogi',now);
 assert.equal(amount(bought),10);assert.equal(bought.selectedFriend,'rogi');assert.equal(rewards.ownsLogFriend(bought,'rogi'),true);
 assert.deepEqual(rewards.purchaseGuestFriend(bought,'rogi',now),bought);
 assert.deepEqual(rewards.normalizeStarWallet(JSON.parse(JSON.stringify(bought))),bought);
 assert.equal(amount(w),60);
});
test('insufficient balance, unowned selection and invalid item do not change wallet',()=>{
 const w=rewards.emptyStarWallet();
 assert.equal(rewards.purchaseGuestFriend(w,'roa',now),w);
 assert.equal(rewards.selectGuestFriend(w,'rona'),w);
 assert.equal(rewards.purchaseGuestFriend(w,'unknown',now),w);
});
test('owned friends switch freely and purchases survive record reset',async()=>{
 const h=harness();const storage=h.load('src/lib/storage.ts');
 let w={...rewards.emptyStarWallet(),transactions:[{id:'fixture',amount:100,reason:'test',createdAt:now.toISOString()}]};
 w=rewards.purchaseGuestFriend(w,'roa',now);w=rewards.purchaseGuestFriend(w,'rona',now);
 w=rewards.selectGuestFriend(w,'roa');assert.equal(amount(w),0);
 await storage.saveAppState({...storage.defaultState,stars:w},null);
 await storage.removeAppState(null);
 const restored=(await storage.loadAppState(null)).stars;
 assert.equal(restored.selectedFriend,'roa');assert.equal(amount(restored),0);assert.equal(rewards.ownsLogFriend(restored,'rona'),true);
 assert.equal(rewards.selectGuestFriend(restored,'romi').selectedFriend,'romi');
});
