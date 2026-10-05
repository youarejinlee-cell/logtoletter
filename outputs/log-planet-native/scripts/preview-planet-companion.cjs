// Local placement editor: reads native placement functions and approved bundled PNGs.
// Editing stays in browser drafts; exporting never writes into the project server-side.
const fs = require('fs');
const path = require('path');
const http = require('http');
const ts = require('typescript');
const { PNG } = require('pngjs');
const root = path.resolve(__dirname, '..');
const [baseFile = path.join(root,'assets/assets_v5/continent/bare_planet.png'), companionFile = path.resolve(root,'../../../character/assets/characters/romi_seated.png'), portArg = '8793'] = process.argv.slice(2);
if (!baseFile || !companionFile) throw new Error('Usage: node scripts/preview-planet-companion.cjs <base.png> <companion.png> [port]');
for (const file of [baseFile, companionFile]) if (!fs.existsSync(file)) throw new Error(`Missing preview input: ${file}`);
const images = [];
function url(file) { const id = images.indexOf(file); if (id >= 0) return `/image/${id}`; images.push(file); return `/image/${images.length - 1}`; }
const cache = new Map();
let artwork;
function load(file) {
  if (!path.extname(file)) file += '.ts';
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  let source = fs.readFileSync(file, 'utf8');
  if (file.endsWith('UniverseScreen.tsx')) source += '\nexport const preview = { v4DecoAssets, v4Slots, v4RankSlots, v4AssetFor, v4PlacementFor, v4LayerFrame, v4SlotFrame, activeV4Deco, activeV4MoodDeco, v4DecoFrame, v4MoodDecoFrame };';
  const compiled = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mockRequire = id => {
    if (id.endsWith('.png') || id.endsWith('.mp3')) return path.resolve(path.dirname(file), id);
    if (id.endsWith('/planetArtwork')) return { planetArtwork: artwork };
    if (id.endsWith('/planetDecoProgression') || id.endsWith('/planetDecoOverrides') || id.endsWith('/planetPlacementOverrides') || id.endsWith('/planetCompanionLayout') || id.endsWith('/entryCategories')) return load(path.resolve(path.dirname(file), id));
    if (id === 'react-native') return { StyleSheet: { create: x => x, absoluteFillObject: {} } };
    return {};
  };
  new Function('require', 'module', 'exports', compiled)(mockRequire, module, module.exports);
  return module.exports;
}
const layout = load(path.join(root, 'src/lib/planetCompanionLayout.ts'));
artwork = { layout: 'companion-seat-v1', base: baseFile, companion: { source: companionFile, geometry: layout.ROMI_SEATED_GEOMETRY } };
const api = load(path.join(root, 'src/screens/UniverseScreen.tsx')).preview;
// Verify the actual bundled registry, not just a synthetic list of assets.
const expectedOrder=['alien-1','airship','venus','mars','pirateship','alien-2','satellite','rocket','saturn','mercury'];
for(let count=0;count<=33;count++){
 const actual=api.activeV4Deco({totalEntries:count}).map(a=>a.key);
 const expected=expectedOrder.slice(0,Math.floor(count/3));
 if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('Deco unlock mismatch at '+count);
}
for(const a of api.v4DecoAssets)if(!fs.existsSync(a.source))throw new Error('Missing bundled decoration '+a.key);
console.log('Verified actual bundled decoration unlocks for 0–33 records.');
const W = 1126, H = 1397;
const categories = ['work', 'taste', 'relationship', 'self-discipline', 'wealth', 'health'];
function layer(source, frame, name, rotation) { return { src: url(source), frame, name, rotation }; }
function scene(level, rotation, mood, original = false) {
  artwork.layout = original ? 'original' : 'companion-seat-v1';
  const counts = [0, 1, 4, 7, 10];
  const entries = Array.from({ length: counts[level] }, () => ({ mood, energy: 50 }));
  const visible = categories.map((_, i) => ({ key: categories[(i + rotation) % 6], entries: entries }));
  const data = { totalEntries: entries.length * 7, etcEntries: entries };
  const deco = api.activeV4Deco(data);
  const moodDeco = api.activeV4MoodDeco(visible, data);
  const layers = deco.filter(a => a.layer === 'background').map(a => layer(a.source, api.v4DecoFrame(a,W,H),a.key,a.rotation));
  layers.push(layer(original ? path.join(root,'assets/assets_v4/continent/bare_planet.png') : baseFile, {left:0,top:0,width:W,height:H},'base'));
  if (!original) layers.push(layer(companionFile,layout.companionFrame(layout.ROMI_SEATED_GEOMETRY,W,H),'Romi'));
  layers.push(...deco.filter(a=>a.layer==='boundary').map(a=>layer(a.source,api.v4DecoFrame(a,W,H),a.key,a.rotation)));
  for (let lv=1;lv<=level;lv++) visible.forEach((continent,i)=> {
    if (!continent.entries.length) return;
    const slot=api.v4Slots[api.v4RankSlots[i]], placement=api.v4PlacementFor(continent.key,slot);
    const asset=api.v4AssetFor(continent.key,lv,placement.sides[lv]);
    if(asset) layers.push(layer(asset.source,api.v4LayerFrame(slot,placement,asset,lv,W,H),`${continent.key}-${lv}`));
  });
  layers.push(...deco.filter(a=>a.layer==='foreground').map(a=>layer(a.source,api.v4DecoFrame(a,W,H),a.key,a.rotation)));
  layers.push(...moodDeco.filter(a=>a.slot!=='etc_lake').map(a=>layer(a.source,api.v4MoodDecoFrame(a,W,H),a.key,a.rotation)));
  if(level>0) for(let lv=1;lv<=level;lv++){
    const slot=api.v4Slots.etc_lake,placement=api.v4PlacementFor('etc',slot),asset=api.v4AssetFor('etc',lv,placement.sides[lv]);
    if(asset)layers.push(layer(asset.source,api.v4LayerFrame(slot,placement,asset,lv,W,H),`lake-${lv}`));
  }
  layers.push(...moodDeco.filter(a=>a.slot==='etc_lake').map(a=>layer(a.source,api.v4MoodDecoFrame(a,W,H),a.key,a.rotation)));
  const hits=visible.map((_,i)=>api.v4SlotFrame(api.v4Slots[api.v4RankSlots[i]],W,H));
  return { layers,hits };
}
const states={};for(const mood of ['happy','sad','soSo'])for(let rotation=0;rotation<6;rotation++)for(let level=0;level<=4;level++)states[`${level}-${rotation}-${mood}`]=scene(level,rotation,mood);
states.original=scene(4,0,'happy',true);
// Confirm the edited base has retained the app's coordinate canvas, and alpha exists.
for(const file of [baseFile,companionFile]){
  const png=PNG.sync.read(fs.readFileSync(file));let clear=0;for(let i=3;i<png.data.length;i+=4)if(png.data[i]===0)clear++;
  if(!clear)throw new Error('Expected genuine transparent pixels');
  if(file===baseFile&&(png.width!==W||png.height!==H))throw new Error('Base canvas dimensions do not match app');
}
// Geometry checks cover all generated combinations without altering any source PNG.
const geometryChecks = [];
for (const [key, state] of Object.entries(states)) {
  for (const item of state.layers) {
    if (!Object.values(item.frame).every(Number.isFinite) || item.frame.width <= 0 || item.frame.height <= 0) throw new Error(`Invalid frame: ${key}/${item.name}`);
  }
  if (key !== 'original') {
    const romi = state.layers.find(item => item.name === 'Romi');
    const seatX = romi.frame.left + layout.ROMI_SEATED_GEOMETRY.seatAnchor.x / layout.ROMI_SEATED_GEOMETRY.canvas.width * romi.frame.width;
    const seatY = romi.frame.top + layout.ROMI_SEATED_GEOMETRY.seatAnchor.y / layout.ROMI_SEATED_GEOMETRY.canvas.height * romi.frame.height;
    if (state.hits.some(hit => seatX >= hit.left && seatX <= hit.left + hit.width && seatY >= hit.top && seatY <= hit.top + hit.height)) throw new Error(`Seat overlaps continent touch target: ${key}`);
  }
  geometryChecks.push(key);
}
console.log(`Verified finite frames and seat touch exclusion for ${geometryChecks.length - 1} combinations.`);
for (const width of [320, 390, 768]) {
  const frame = layout.companionFrame(layout.ROMI_SEATED_GEOMETRY, width, width * H / W);
  const seat = (frame.left + layout.ROMI_SEATED_GEOMETRY.seatAnchor.x / layout.ROMI_SEATED_GEOMETRY.canvas.width * frame.width) / width;
  if (Math.abs(seat - layout.ROMI_SEATED_GEOMETRY.planetAnchor.x / W) > 1e-9) throw new Error('Companion anchor changes with viewport');
}

artwork.layout = 'companion-seat-v1';
const placements=[];
for(const category of [...categories,'etc']) for(const slotKey of category==='etc'?['etc_lake']:api.v4RankSlots) for(let level=1;level<=4;level++) {
 const slot=api.v4Slots[slotKey], placement=api.v4PlacementFor(category,slot), asset=api.v4AssetFor(category,level,placement.sides[level]);
 if(!asset)throw new Error('Missing asset');
 const frame=api.v4LayerFrame(slot,placement,asset,level,W,H);
 placements.push({id:category+'/'+slotKey+'/'+level,category,slot:slotKey,level,side:placement.sides[level],asset:path.relative(root,asset.source),src:url(asset.source),canvas:asset.canvas,alphaBox:asset.alphaBox,alphaCenter:asset.alphaCenter,center:placement.levelCenters[level],scale:frame.width/asset.canvas.width});
}
// Decorations use their final native frames, including existing per-slot mood adjustments.
// A normalized virtual canvas preserves Image resizeMode=contain, including non-square art.
const decoNames={venus:'금성',mercury:'수성','alien-1':'그록 · 기록 보디가드','alien-2':'프록 · 기록 보디가드',mars:'화성',saturn:'토성',rocket:'로켓',satellite:'인공위성',airship:'비행선',pirateship:'해적선','seagull-1':'갈매기 1','seagull-2':'갈매기 2'};
const seenDeco=new Set();
for(const mood of ['soSo','happy','sad']) for(const item of states['4-0-'+mood].layers){
 if(['base','Romi'].includes(item.name)||/^(work|taste|relationship|self-discipline|wealth|health|lake)-\d$/.test(item.name)||seenDeco.has(item.name))continue;
 seenDeco.add(item.name);
 const file=images[Number(item.src.split('/').pop())], f=item.frame;
 const slotMatch=item.name.match(/^(land_\d+|etc_lake)-(neutral|positive|negative)-(\d+)$/);
 const width=1000,height=1000*f.height/f.width;
 placements.push({id:'deco/'+item.name,category:'deco',slot:slotMatch?slotMatch[1]:'space',level:1,side:'center',asset:path.relative(root,file),src:item.src,canvas:{width,height},alphaCenter:{x:width/2,y:height/2},alphaBox:{x:0,y:0,width,height},center:{x:f.left+f.width/2,y:f.top+f.height/2},scale:f.width/width,rotation:item.rotation||0,decoKey:item.name,mood:slotMatch?mood:null,label:decoNames[item.name]||(slotMatch[1]+' · '+({neutral:'나무·가로등',positive:'반짝임',negative:'구름'}[slotMatch[2]])+' '+(+slotMatch[3]+1))});
}
// Optional unsaved ImageGen previews remain outside the project until asset save approval.
const previewManifest=process.env.PLANET_DECO_PREVIEW_MANIFEST;
if(previewManifest){
 const previews=JSON.parse(fs.readFileSync(previewManifest,'utf8'));
 for(const p of previews){
  if(seenDeco.has(p.key))continue;
  const png=PNG.sync.read(fs.readFileSync(p.file)),width=png.width,height=png.height;
  placements.push({id:'deco/'+p.key,category:'deco',slot:'space',level:1,side:'center',asset:p.asset,src:url(p.file),canvas:{width,height},alphaCenter:{x:width/2,y:height/2},alphaBox:{x:0,y:0,width,height},center:p.center,scale:p.width/width,rotation:0,decoKey:p.key,mood:null,label:p.label+' · 시안',preview:true,layer:p.layer||'boundary'});
 }
}
const crypto=require('crypto');
const baseline=crypto.createHash('sha256').update(JSON.stringify(placements.map(({src,...p})=>p))).update(fs.readFileSync(baseFile)).digest('hex');
// Use visible sprite bounds rather than transparent canvas margins for companion alignment.
const previousBaseline = baseline;
const companions = [];
const approvedCompanions = load(path.join(root, "src/lib/planetCompanionOverrides.ts"));
for (const [friend, label] of Object.entries({romi:'로미',rogi:'로기',roa:'로아',rona:'로나'})) {
 for (const pose of ['standing','seated']) {
  const file = path.resolve(root, '../../../character/assets/characters', `${friend}-${pose}-standard.png`);
  const png = PNG.sync.read(fs.readFileSync(file));
  let left=png.width,top=png.height,right=0,bottom=0;
  for(let y=0;y<png.height;y++) for(let x=0;x<png.width;x++) if(png.data[(y*png.width+x)*4+3]>32){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}
  const box={x:left,y:top,width:right-left+1,height:bottom-top+1};
  const anchor={x:left+box.width*.5,y:pose==='standing'?bottom:top+box.height*.77};
  const scale=220/box.width;
  const entry={id:`companion/${friend}/${pose}`,category:'companion',slot:'seat',level:1,side:'center',friend,pose,label:label+' · '+(pose==='standing'?'서기':'앉기'),asset:path.relative(root,file),src:url(file),canvas:{width:png.width,height:png.height},alphaBox:box,alphaCenter:anchor,center:{...layout.ROMI_SEATED_GEOMETRY.planetAnchor},scale};
  const approved=approvedCompanions.planetCompanionOverrides[`${friend}/${pose}`];
  if(approved){entry.center=approved.center;entry.scale=approved.scale;entry.alphaCenter=approved.anchor;}
  placements.push(entry);companions.push(entry.id);
 }
}
// Shrink each continent's mood overlay about its center once, not on each render.
// Imported mood frames already contain the approved reduction; never multiply twice.
const editorBaseline=crypto.createHash('sha256').update(baseline).update(JSON.stringify(placements.map(({src,...p})=>p))).digest('hex');
const model={legacyBaseline:'877e6c9d4df34f4f8b846405b1cad44704680c23ed760b63d9d55d7e80e7c720',baseline:editorBaseline,previousBaseline,acceptedBaseline:approvedCompanions.approvedEditorBaseline,companions,canvas:{width:W,height:H},layout:'companion-seat-v1',placements,slots:api.v4RankSlots,states};
const publicDir=path.join(__dirname,'planet-editor');
const server=http.createServer((req,res)=>{
 if(req.url==='/model.json'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify(model))}
 const files={'/':'index.html','/index.html':'index.html','/editor.js':'editor.js','/model.js':'model.js','/style.css':'style.css'};
 if(files[req.url]){const f=files[req.url];res.writeHead(200,{'Content-Type':f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html; charset=utf-8','Cache-Control':'no-store'});return fs.createReadStream(path.join(publicDir,f)).pipe(res)}
 const match=req.url.match(/^\/image\/(\d+)$/), file=match&&images[Number(match[1])];
 if(!file){res.writeHead(404);return res.end()}
 res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
});
server.listen(Number(portArg),'127.0.0.1',()=>console.log(`Planet editor: http://127.0.0.1:${portArg} — ${placements.length} editable placements`));
