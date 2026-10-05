import { REQUESTS, MEMBERS, OWNER, payloadOf, rich } from './model.ts';
const env = (key: string) => { const v = Deno.env.get(key); if (!v) throw Error(`Missing ${key}`); return v; };
const pause = (ms: number) => new Promise(r=>setTimeout(r,ms));
async function notion(path: string, method='GET', body?: unknown): Promise<any> {
 for (let i=0;i<3;i++) {
  await pause(360);
  const res = await fetch(`https://api.notion.com/v1/${path}`, {method,headers:{Authorization:`Bearer ${env('NOTION_API_TOKEN')}`,'Notion-Version':'2025-09-03','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  if (res.status===429 || res.status>=500) {await pause(Math.min(Number(res.headers.get('Retry-After')||2)*1000,5000));continue;}
  const data=await res.json(); if (!res.ok) throw Error(`Notion ${res.status}: ${data.code}`); return data;
 }
 throw Error('Notion 재시도 한도 초과');
}
async function rpc(name:string,body:unknown={}) {
 const key=env('SUPABASE_SERVICE_ROLE_KEY');
 const res=await fetch(`${env('SUPABASE_URL')}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
 const raw=await res.text(); const data=raw ? JSON.parse(raw) : null; if (!res.ok) throw Error(data?.message || `DB ${res.status}`); return data;
}
const status=(p:any)=>p.properties['상태']?.select?.name;
const validParent=(p:any)=>p.parent?.data_source_id===REQUESTS;
async function patch(id:string,properties:any){return notion(`pages/${id}`,'PATCH',{properties});}
async function syncMembers() {
 const members=await rpc('notion_member_snapshots');
 for (const m of members) {
  const found=await notion(`data_sources/${MEMBERS}/query`,'POST',{filter:{property:'회원 ID',rich_text:{equals:m.id}},page_size:2});
  const properties={'회원':{title:[{text:{content:m.email}}]},'회원 이메일':{email:m.email},'회원 ID':rich(m.id),'별 잔액':{number:Number(m.balance)},'이벤트 이용권 만료':{date:m.gift_until?{start:m.gift_until}:null},'최근 동기화':{date:{start:new Date().toISOString()}},'동기화 상태':{select:{name:'정상'}}};
  if(found.results.length) await patch(found.results[0].id,properties);
  else await notion('pages','POST',{parent:{type:'data_source_id',data_source_id:MEMBERS},properties});
  await rpc('notion_mark_member_synced',{p_user:m.id});
 }
 return members.length;
}
Deno.serve(async req=>{
 const expected=Deno.env.get('NOTION_SYNC_SECRET');
 if(!expected || req.headers.get('x-sync-secret')!==expected) return new Response('Unauthorized',{status:401});
 if(req.method!=='POST') return new Response('Method not allowed',{status:405});
 const token=crypto.randomUUID(); let locked=false;
 try {
  const mode=new URL(req.url).searchParams.get('mode');
  if(mode==='verify-write') {
   let testPage:any;
   try {
    testPage=await notion('pages','POST',{parent:{type:'data_source_id',data_source_id:REQUESTS},properties:{'요청명':{title:[{text:{content:'연결 검증 · 자동 보관 · 지급 없음'}}]},'상태':{select:{name:'작성 중'}}}});
    await patch(testPage.id,{'처리 결과':rich('서버 읽기·쓰기 점검 완료. 지급 요청이 아닙니다.')});
    return Response.json({ok:true,write_verified:true,no_grant:true});
   } finally {if(testPage) await notion(`pages/${testPage.id}`,'PATCH',{archived:true});}
  }
  if(mode==='probe') {
   const a=await notion(`data_sources/${REQUESTS}`); const b=await notion(`data_sources/${MEMBERS}`);
   const bot=await notion(`users/me`);
   return Response.json({ok:true,requests:a.id,members:b.id,bot:bot.id});
  }
  locked=await rpc('notion_sync_lease',{p_token:token});
  if(!locked) return Response.json({skipped:'already_running'});
  const batch=await notion(`data_sources/${REQUESTS}/query`,'POST',{filter:{property:'상태',select:{equals:'승인'}},sorts:[{timestamp:'created_time',direction:'ascending'}],page_size:10});
  let completed=0,failed=0;
  for(const candidate of batch.results) {
   try {
    const page=await notion(`pages/${candidate.id}`);
    if(!validParent(page)||page.archived||page.in_trash||status(page)!=='승인') continue;
    const existing=await rpc('notion_get_receipt',{p_page:page.id});
    const payload=payloadOf(page);
    // A completed DB receipt can be mirrored again after a Notion write failure.
    if(!existing && page.last_edited_by?.id!==OWNER) throw Error('운영자 계정으로 내용을 확인하고 승인 상태로 변경해주세요.');
    const fresh=await notion(`pages/${page.id}`);
    if(fresh.last_edited_time!==page.last_edited_time || status(fresh)!=='승인' || JSON.stringify(payloadOf(fresh))!==JSON.stringify(payload) || fresh.last_edited_by?.id!==page.last_edited_by?.id) continue;
    const result=await rpc('notion_apply_request',{p_page:page.id,p_payload:payload});
    // Snapshot input comes from the canonical receipt so editing after approval never alters a posted grant.
    await patch(page.id,{'상태':{select:{name:'완료'}},'회원 ID':rich(result.user_id),'처리 거래 ID':rich(result.id),'처리 시각':{date:{start:result.created_at}},'처리 결과':rich(`${payload.email} | ${payload.kind} | ${payload.amount} | ${payload.reason}${result.effective_until?' | 만료 '+result.effective_until:''}`)});
    completed++;
   } catch(e) {
    failed++; console.error('request_failed',candidate.id,String(e));
    // DB may already have committed. A retry reuses the same page UUID.
    try {await patch(candidate.id,{'상태':{select:{name:'오류'}},'처리 결과':rich(String(e)+' / 수정 후 승인으로 변경하면 같은 거래 ID로 재확인합니다.')});} catch { /* Leave approved for next scheduled retry. */ }
   }
  }
  const synced=await syncMembers();
  return Response.json({ok:true,completed,failed,synced,more:batch.has_more});
 } catch(e) {console.error(String(e));return Response.json({ok:false,error:String(e)},{status:500});}
 finally {if(locked) await rpc('notion_sync_lease',{p_token:token,p_release:true}).catch(()=>{});}
});
