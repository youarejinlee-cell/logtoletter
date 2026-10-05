// Run while npm run planet:editor is serving the native model.
const assert=require('node:assert/strict');
const M=require('./planet-editor/model.js');
(async()=>{
 const model=await (await fetch('http://127.0.0.1:8793/model.json')).json();
 assert.equal(model.placements.filter(p=>!['deco','companion'].includes(p.category)).length,148);
 assert.equal(model.placements.filter(p=>p.category==='deco'&&p.slot!=='space').length,63);
 assert.ok(!model.placements.some(p=>p.asset.includes('seagull')));
 assert.ok(!model.placements.some(p=>p.asset.includes('astronaut')));
 for(const state of Object.values(model.states))assert.ok(!state.layers.some(p=>p.name.includes('astronaut')));
 assert.equal(model.placements.filter(p=>p.category==='companion').length,8);
 const draft=M.defaults(model), first=model.placements[0],deco=model.placements.find(p=>p.category==='deco');
 draft[first.id].center.x+=37.25;draft[first.id].scale*=1.23;
 draft[deco.id].center.y+=42;draft[deco.id].rotation=32;draft[deco.id].scale*=1.2;
 const exported=M.pack(model,draft);
 assert.deepEqual(M.unpack(model,JSON.parse(JSON.stringify(exported))),draft);
 const exportedDeco=exported.placements.find(p=>p.id===deco.id);
 assert.equal(exportedDeco.frame.width,deco.canvas.width*draft[deco.id].scale);
 const frame=p=>({left:draft[p.id].center.x-p.alphaCenter.x*draft[p.id].scale,top:draft[p.id].center.y-p.alphaCenter.y*draft[p.id].scale});
 for(const p of model.placements)assert.ok(Object.values(frame(p)).every(Number.isFinite));
 for(const mutate of [d=>d.baseline='old',d=>d.placements.pop(),d=>d.placements[1]=d.placements[0],d=>d.placements[0].asset='wrong.png',d=>d.placements[0].center.x=null,d=>d.placements[0].scale=-1,d=>d.canvas.width=320,d=>d.placements.find(p=>p.category==='deco').rotation=NaN]){
  const invalid=M.clone(exported);mutate(invalid);assert.throws(()=>M.unpack(model,invalid));
 }
 assert.equal(draft[first.id].center.x,first.center.x+37.25);
 // The user's prior v1 export remains importable after adding decoration editing.
 const legacy={...exported,schema:'log-planet-placement/v1',baseline:model.legacyBaseline,placements:exported.placements.filter(p=>!['deco','companion'].includes(p.category))};
 const migrated=M.unpack(model,legacy);assert.deepEqual(migrated[first.id],draft[first.id]);assert.deepEqual(migrated[deco.id],M.defaults(model)[deco.id]);
 // Pair precedence must hold even for a front continent's earliest growth layer.
 for(const [front,back] of [['land_01','land_02'],['land_03','land_04'],['land_05','land_06']]) {
  assert.ok(M.layerRank({slot:front,level:1},{},1397)>M.layerRank({slot:back,level:4},{},1397));
 }
 assert.ok(M.layerRank({category:'deco'},{center:{y:698}},1397)<10);
 assert.ok(M.layerRank({category:'deco'},{center:{y:699}},1397)>10);
 for(const p of model.placements.filter(p=>p.mood&&!(p.slot==='etc_lake'&&p.mood==='soSo')))assert.ok(M.layerRank(p,draft[p.id],1397)>M.layerRank({slot:'land_01',level:4},{},1397));
 const companionRank=M.layerRank({category:'companion'},{},1397);
 assert.ok(companionRank>10&&companionRank<M.layerRank({category:'deco'},{center:{y:699}},1397));
 const moodRanks=['soSo','sad','happy'].map(mood=>M.layerRank({category:'deco',mood},{},1397));
 assert.ok(moodRanks[0]<moodRanks[1]&&moodRanks[1]<moodRanks[2]);
 for(const p of model.placements.filter(p=>!['deco','companion'].includes(p.category)))assert.ok(M.layerRank(p,draft[p.id],1397)<moodRanks[0]);
 for(const p of model.placements.filter(p=>p.slot==='etc_lake'&&p.mood==='soSo')){const rank=M.layerRank(p,draft[p.id],1397);assert.ok(rank>companionRank&&rank<20);}
 const previous={...exported,baseline:model.previousBaseline,placements:exported.placements.filter(p=>p.category!=='companion')};
 const prior=M.unpack(model,previous);
 for(const p of model.placements.filter(p=>p.mood&&p.slot!=='etc_lake'))assert.equal(prior[p.id].scale,draft[p.id].scale*.9);
 assert.deepEqual(M.unpack(model,M.pack(model,prior)),prior); // Never shrink again on re-import.
 for(const p of model.placements.filter(p=>p.category==='companion')){
  const response=await fetch('http://127.0.0.1:8793'+p.src);assert.equal(response.status,200);
 }
 console.log('PASS: 8 companions, pair precedence, dynamic deco depth, mood overlays, migration once; 148 category + 63 mood deco placements; no astronauts or seagulls; exact v2 roundtrip; legacy import; rotation, size, frame export; 8 invalid cases.');
})().catch(e=>{console.error(e);process.exitCode=1});
