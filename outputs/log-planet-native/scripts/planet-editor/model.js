(function(root){
 const clone=x=>JSON.parse(JSON.stringify(x));
 function defaults(model){return Object.fromEntries(model.placements.map(p=>[p.id,{center:clone(p.center),scale:p.scale,...(p.category==='deco'?{rotation:p.rotation||0}:{})}]))}
 function validateValue(v){if(!v||!v.center||![v.center.x,v.center.y,v.scale].every(Number.isFinite)||Math.abs(v.center.x)>3000||Math.abs(v.center.y)>3000||v.scale<=0||v.scale>10)throw Error('좌표 또는 크기 값이 올바르지 않습니다.');if(v.rotation!==undefined&&(!Number.isFinite(v.rotation)||Math.abs(v.rotation)>360))throw Error('회전 값은 -360~360도여야 합니다.');return {center:{x:v.center.x,y:v.center.y},scale:v.scale,...(v.rotation!==undefined?{rotation:v.rotation}:{})}}
 function pack(model,draft){return {schema:'log-planet-placement/v2',layout:model.layout,baseline:model.baseline,canvas:model.canvas,coordinateSpace:'absolute-native-canvas; companion offsets already applied',placements:model.placements.map(p=>({id:p.id,category:p.category,slot:p.slot,level:p.level,side:p.side,asset:p.asset,...(p.category==='deco'?{frame:{left:draft[p.id].center.x-p.alphaCenter.x*draft[p.id].scale,top:draft[p.id].center.y-p.alphaCenter.y*draft[p.id].scale,width:p.canvas.width*draft[p.id].scale,height:p.canvas.height*draft[p.id].scale},preview:!!p.preview}:{}),...validateValue(draft[p.id])}))}}
 function unpack(model,data){
 const legacy=data?.schema==='log-planet-placement/v1'&&data.baseline===model.legacyBaseline;
 if(!data||(!legacy&&(data.schema!=='log-planet-placement/v2'||data.baseline!==model.baseline&&data.baseline!==model.previousBaseline&&data.baseline!==model.acceptedBaseline))||data.layout!==model.layout||data.canvas?.width!==1126||data.canvas?.height!==1397)throw Error('현재 행성 버전과 맞지 않는 파일입니다. 원래 편집기에서 열어주세요.');
 const prior=data?.schema==='log-planet-placement/v2'&&data.baseline===model.previousBaseline;
 const expected=model.placements.filter(p=>legacy?!['deco','companion'].includes(p.category):prior?p.category!=='companion':true);
 if(!Array.isArray(data.placements)||data.placements.length!==expected.length)throw Error('배치 항목이 누락되었습니다.');
 const result=(legacy||prior)?defaults(model):{},seen=new Set();
 for(const p of data.placements){const b=expected.find(x=>x.id===p.id);if(!b||seen.has(p.id)||['category','slot','level','side','asset'].some(k=>b[k]!==p[k]))throw Error('중복되거나 일치하지 않는 에셋 항목입니다.');seen.add(p.id);if(b.category==='deco'&&!Number.isFinite(p.rotation))throw Error('장식 회전 값이 누락되었습니다.');result[p.id]=validateValue(p);if(prior&&b.category==='deco'&&b.mood&&b.slot!=='etc_lake')result[p.id].scale*=.9}return result;
 }

 function layerRank(p,value,height){
  if(p.category==='deco'&&p.slot==='etc_lake'&&p.mood==='soSo')return 12;
  if(p.category==='deco')return p.mood?({soSo:1000,sad:1100,happy:1200}[p.mood]||1000):(value.center.y<height/2?0:20);
  if(p.category==='companion')return 11;
  const order=['land_04','land_02','land_06','land_03','land_05','land_01','etc_lake'];
  return 100+order.indexOf(p.slot)*10+p.level;
 }
 const api={layerRank,clone,defaults,pack,unpack,validateValue};if(typeof module!=='undefined')module.exports=api;else root.PlacementModel=api;
})(globalThis);
