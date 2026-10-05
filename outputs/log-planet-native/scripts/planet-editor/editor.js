(async()=>{
'use strict';
const $=id=>document.getElementById(id), M=PlacementModel;
try {
const response=await fetch('/model.json');if(!response.ok)throw Error('배치 데이터를 불러오지 못했습니다.');
const model=await response.json(), initial=M.defaults(model), key='log-planet-editor:'+model.baseline;
let draft=M.clone(initial), undo=[],redo=[],drag=null;
const status=text=>$('status').textContent=text;
try{const saved=localStorage.getItem(key);if(saved)draft=M.unpack(model,JSON.parse(saved));else if(!model.acceptedBaseline){const old=localStorage.getItem('log-planet-editor:'+model.previousBaseline);if(old)draft=M.unpack(model,JSON.parse(old));}status(saved?'이전 임시 저장을 불러왔습니다.':'준비됐어요. 선택한 에셋을 드래그해 보세요.')}catch{status('임시 저장을 읽지 못했습니다. JSON 파일을 가져올 수 있습니다.')}
const decos=model.placements.filter(p=>p.category==='deco');
for(const p of decos){const option=document.createElement('option');option.value=p.id;option.textContent=p.label;$('deco').append(option)}
const companionId=()=>`companion/${$('friend').value}/${$('pose').value}`;
const current=()=>model.placements.find(p=>p.id===($('mode').value==='companion'?companionId():$('mode').value==='deco'?$('deco').value:[$('category').value,$('slot').value,$('level').value].join('/')));
const round=n=>Math.round(n*100)/100;
function save(){try{localStorage.setItem(key,JSON.stringify(M.pack(model,draft)));status('브라우저에 임시 저장됨 · 최종 결과는 JSON으로 전달해 주세요.')}catch{status('브라우저 저장 공간을 사용할 수 없습니다. JSON을 내려받아 보관하세요.')}}
function checkpoint(before=M.clone(draft)){undo.push(before);if(undo.length>100)undo.shift();redo=[]}
function updateHistory(){ $('undo').disabled=!undo.length;$('redo').disabled=!redo.length;$('count').textContent=Object.keys(draft).filter(id=>JSON.stringify(draft[id])!==JSON.stringify(initial[id])).length+' / '+model.placements.length+'개 수정';}
function commit(change){const before=M.clone(draft);change();if(JSON.stringify(before)!==JSON.stringify(draft)){checkpoint(before);save()}render()}
function frame(p){const d=draft[p.id];return {left:d.center.x-p.alphaCenter.x*d.scale,top:d.center.y-p.alphaCenter.y*d.scale,width:p.canvas.width*d.scale,height:p.canvas.height*d.scale}}
function rect(el,f){el.style.left=f.left/1126*100+'%';el.style.top=f.top/1397*100+'%';el.style.width=f.width/1126*100+'%';el.style.height=f.height/1397*100+'%'}
function img(src,f,opacity=1,rotation=0){const el=document.createElement('img');el.src=src;el.alt='';el.draggable=false;rect(el,f);el.style.opacity=opacity;if(rotation)el.style.transform='rotate('+rotation+'deg)';$('layers').append(el)}
function render(){const selected=current(),selectedValue=draft[selected.id];
$('selection').textContent=['deco','companion'].includes(selected.category)?selected.label:$('category').selectedOptions[0].text+' · '+$('slot').selectedOptions[0].text+' · Lv.'+selected.level;
$('angle').value=selectedValue.rotation||0;
$('assetName').textContent=selected.asset.split('/').pop();$('x').value=round(selectedValue.center.x);$('y').value=round(selectedValue.center.y);$('size').value=round(selectedValue.scale/selected.scale*100);
const cats=['work','taste','relationship','self-discipline','wealth','health'];const slotIndex=Math.max(0,model.slots.indexOf(selected.slot));const rotation=['etc','deco','companion'].includes(selected.category)?0:(cats.indexOf(selected.category)-slotIndex+6)%6;
const growth=+$('growth').value, scene=model.states[growth+'-'+rotation+'-'+($('mood').value==='all'?'soSo':$('mood').value)];
$('layers').replaceChildren();
// Build one complete scene before sorting: selected extras never bypass layer rules.
const visible = new Map();
function include(p){visible.set(p.id,p)}
for(const slot of [...model.slots,'etc_lake']){
 const cat=slot==='etc_lake'?'etc':cats[(model.slots.indexOf(slot)+rotation)%6];
 for(let lv=1;lv<=growth;lv++)include(model.placements.find(p=>p.category===cat&&p.slot===slot&&p.level===lv));
}
for(const p of decos)if(!p.mood||$('mood').value==='all'||p.mood===$('mood').value)include(p);
include(model.placements.find(p=>p.id===companionId()));
include(selected);
const base=scene.layers.find(l=>l.name==='base');
const layers=[{id:'base',rank:10,src:base.src,frame:base.frame}];
for(const p of visible.values())layers.push({id:p.id,rank:M.layerRank(p,draft[p.id],model.canvas.height),p});
layers.sort((a,b)=>a.rank-b.rank||a.id.localeCompare(b.id));
for(const l of layers){
 if(l.p){const p=l.p;img(p.src,frame(p),p.id===selected.id||p.category==='companion'||!$('dim').checked?1:.32,draft[p.id].rotation||0)}else img(l.src,l.frame);
 $('layers').lastElementChild.dataset.layer=l.id;
}
if($('guides').checked){
 const line=document.createElement('div');line.className='centerline';line.textContent='일반 데코 앞·뒤 경계';$('layers').append(line);
 const anchor=document.createElement('div');anchor.className='anchor';const c=draft[companionId()].center;anchor.style.left=c.x/1126*100+'%';anchor.style.top=c.y/1397*100+'%';$('layers').append(anchor);
}
$('selectionBox').hidden=$('clean').checked;
if($('zones').checked)scene.hits.forEach((f,i)=>{const el=document.createElement('div');el.className='zone';el.textContent='대륙 '+(i+1);rect(el,f);$('layers').append(el)});
const f=frame(selected), a=selected.alphaBox,s=selectedValue.scale;rect($('selectionBox'),{left:f.left+a.x*s,top:f.top+a.y*s,width:a.width*s,height:a.height*s});
$('selectionBox').style.transform=selectedValue.rotation?'rotate('+selectedValue.rotation+'deg)':'';
updateHistory();}
function selectionChanged(){$('clean').checked=false;const isDeco=$('mode').value==='deco',isCompanion=$('mode').value==='companion';$('decoLabel').hidden=!isDeco;$('rotationLabel').hidden=!isDeco;
for(const id of ['category','slot','level'])$(id).closest('label').hidden=isDeco||isCompanion;
if(isCompanion){render();return}
if(isDeco){const p=current();if(p.mood)$('mood').value=p.mood;$('growth').value='4';render();return}
const etc=$('category').value==='etc';$('slot').disabled=etc;for(const option of $('slot').options)option.disabled=etc?option.value!=='etc_lake':option.value==='etc_lake';if(etc)$('slot').value='etc_lake';else if($('slot').value==='etc_lake')$('slot').value='land_01';render()}
for(const id of ['mode','deco','category','slot','level'])$(id).onchange=selectionChanged;
for(const id of ['growth','dim','mood','zones','guides','clean','friend','pose'])$(id).onchange=render;
$('editFriend').onclick=()=>{$('mode').value='companion';selectionChanged()};
$('overview').onclick=()=>{$('growth').value='4';$('mood').value='all';$('dim').checked=false;$('clean').checked=true;render()};
const devices={iphone:{width:393,height:852,top:180,bottom:90},galaxy:{width:360,height:800,top:164,bottom:80},large:{width:430,height:932,top:180,bottom:90}};
function updateDevice(){
 const d=devices[$('device').value],world=$('world'),stage=$('stage'),viewport=world.parentElement;
 world.classList.toggle('device-mode',!!d);world.classList.toggle('clip-device',!!d&&$('clipDevice').checked);$('deviceGuide').hidden=!d;
 world.style.cssText='';stage.style.cssText='';
 if(!d){world.style.width=+$('zoom').value===1?'min(100%,calc((80vh - 32px) * 0.89189))':650*+$('zoom').value+'px';$('deviceInfo').textContent='기기를 선택해 화면 경계와 안전 영역을 확인하세요.';return}
 const size=Math.min(d.width-24,390),height=size*1397/1126;
 world.style.width=d.width+'px';world.style.height=d.height+'px';world.style.setProperty('--safe-top',d.top+'px');world.style.setProperty('--safe-bottom',d.bottom+'px');
 world.style.zoom=Math.min((viewport.clientWidth-32)/d.width,(viewport.clientHeight-32)/d.height)*+$('zoom').value;
 Object.assign(stage.style,{width:size+'px',height:height+'px',left:(d.width-size)/2+'px',top:(d.top+(d.height-d.top-d.bottom-height)/2)+'px'});
 $('deviceInfo').textContent=d.width+' × '+d.height+' 논리 px · 에셋 85%, 아래 20px. 안전 영역과 앱 UI 높이는 참고용이며 실제 기기 설정에 따라 달라집니다.';
}
$('device').onchange=updateDevice;$('clipDevice').onchange=updateDevice;$('zoom').onchange=updateDevice;
new ResizeObserver(updateDevice).observe($('world').parentElement);

for(const axis of ['x','y'])$(axis).onchange=()=>{const p=current(),v=Number($(axis).value);if(!$(axis).value||!Number.isFinite(v)||Math.abs(v)>3000){status('좌표는 -3000~3000 범위로 입력하세요.');return render()}commit(()=>draft[p.id].center[axis]=v)};
$('angle').onchange=()=>{const angle=Number($('angle').value);if(!$('angle').value||!Number.isFinite(angle)||Math.abs(angle)>360){status('회전은 -360~360도 범위로 입력하세요.');return render()}commit(()=>draft[current().id].rotation=angle)};
$('size').onchange=()=>{const value=Number($('size').value),p=current();if(!Number.isFinite(value)||value<10||value>300){status('크기는 10~300%로 입력하세요.');return render()}commit(()=>draft[p.id].scale=p.scale*value/100)};
const box=$('selectionBox');
box.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();box.focus();const bounds=$('stage').getBoundingClientRect();drag={id:current().id,x:e.clientX,y:e.clientY,before:M.clone(draft),ratio:1126/bounds.width};box.setPointerCapture(e.pointerId)};
box.onpointermove=e=>{if(!drag)return;const orig=drag.before[drag.id].center;draft[drag.id].center={x:Math.max(-3000,Math.min(3000,round(orig.x+(e.clientX-drag.x)*drag.ratio))),y:Math.max(-3000,Math.min(3000,round(orig.y+(e.clientY-drag.y)*drag.ratio)))};render()};
box.onpointerup=()=>{if(!drag)return;if(JSON.stringify(drag.before)!==JSON.stringify(draft)){checkpoint(drag.before);save()}drag=null;render()};
box.onpointercancel=()=>{if(drag){draft=drag.before;drag=null;render()}};
$('stage').onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const amount=e.shiftKey?10:1;commit(()=>{const c=draft[current().id].center,axis=e.key==='ArrowLeft'||e.key==='ArrowRight'?'x':'y';c[axis]=Math.max(-3000,Math.min(3000,c[axis]+(e.key==='ArrowLeft'||e.key==='ArrowUp'?-amount:amount)))})};
$('undo').onclick=()=>{if(undo.length){redo.push(M.clone(draft));draft=undo.pop();save();render()}};
$('redo').onclick=()=>{if(redo.length){undo.push(M.clone(draft));draft=redo.pop();save();render()}};
$('reset').onclick=()=>commit(()=>draft[current().id]=M.clone(initial[current().id]));
const json=()=>JSON.stringify({...M.pack(model,draft),preview:{friend:$('friend').value,pose:$('pose').value,mood:$('mood').value,growth:+$('growth').value},layerRules:{continentBackToFront:[4,2,6,3,5,1],decoDividerY:1397/2,moodScale:.9,backToFront:["background-deco","base","companion","lake-streetlights","foreground-deco","continent-assets","trees","clouds","lights"]}},null,2);
function showJson(){ $('jsonText').value=json();$('dialogStatus').textContent='';$('jsonDialog').showModal()}
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText(json());status('최종 JSON을 복사했습니다. 대화에 붙여넣어 주세요.')}catch{showJson();$('jsonText').select();$('dialogStatus').textContent='복사 권한이 없어 내용을 표시했습니다. 전체 선택 후 복사해 주세요.'}};
$('download').onclick=()=>{const url=URL.createObjectURL(new Blob([json()],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='log-planet-placements-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);status('JSON 내려받기를 요청했습니다. 내려받은 파일을 이 대화에 첨부해 주세요.')};
function importJson(text){const data=JSON.parse(text),next=M.unpack(model,data);if(data.preview){if(['romi','rogi','roa','rona'].includes(data.preview.friend))$('friend').value=data.preview.friend;if(['standing','seated'].includes(data.preview.pose))$('pose').value=data.preview.pose;}commit(()=>draft=next);status('JSON 배치를 불러왔습니다. 되돌리기로 이전 작업을 복원할 수 있습니다.')}
$('importOpen').onclick=showJson;$('closeDialog').onclick=()=>$('jsonDialog').close();
$('importText').onclick=()=>{try{importJson($('jsonText').value);$('jsonDialog').close()}catch(e){$('dialogStatus').textContent='불러오기 실패: '+e.message}};
$('importFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>2e6)throw Error('파일이 너무 큽니다.');importJson(await file.text())}catch(error){status('불러오기 실패: '+error.message)}e.target.value=''};
selectionChanged();
}catch(error){$('status').textContent='편집기를 열지 못했습니다: '+error.message}
})();
