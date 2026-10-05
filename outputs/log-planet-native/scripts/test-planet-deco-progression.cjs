const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const source = fs.readFileSync(require('node:path').join(__dirname, '../src/lib/planetDecoProgression.ts'), 'utf8');
const compiled = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const target = {exports:{}};
new Function('exports','module',compiled)(target.exports,target);
const {planetDecoOrder, unlockedPlanetDeco} = target.exports;
const assets = [...planetDecoOrder].reverse().map(key=>({key}));
assets.push({key:'seagull-1'},{key:'seagull-2'});
assert.deepEqual(unlockedPlanetDeco(assets,2),[]);
assert.deepEqual(unlockedPlanetDeco(assets,3),[{key:'alien-1'}]);
assert.deepEqual(unlockedPlanetDeco(assets,5),[{key:'alien-1'}]);
assert.deepEqual(unlockedPlanetDeco(assets,6),[{key:'alien-1'},{key:'airship'}]);
for(let records=0;records<=33;records++){
 const keys=unlockedPlanetDeco(assets,records).map(x=>x.key);
 assert.equal(keys.length,Math.min(10,Math.floor(records/3)));
 assert.ok(!keys.some(key=>key.startsWith('seagull')));
}
const incomplete=assets.filter(x=>x.key!=='venus');
assert.deepEqual(unlockedPlanetDeco(incomplete,11).map(x=>x.key),['alien-1','airship']);
assert.deepEqual(unlockedPlanetDeco(incomplete,12).map(x=>x.key),['alien-1','airship','mars']);
assert.equal(unlockedPlanetDeco(assets,29).at(-1).key,planetDecoOrder[8]);
assert.equal(unlockedPlanetDeco(assets,30).at(-1).key,'mercury');
console.log('PASS: three-record boundaries, cumulative order, no seagulls, missing-art milestones retained, cap at 30 records.');
