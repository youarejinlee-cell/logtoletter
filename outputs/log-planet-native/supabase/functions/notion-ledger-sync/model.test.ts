import {payloadOf} from './model.ts';
const page=(action:string,n:number|null=50,reference='')=>({properties:{'작업':{select:{name:action}},'수량':{number:n},'회원 이메일':{email:' USER@example.com '},'사유':{rich_text:[{plain_text:'이벤트 지급'}]},'원본 거래 ID':{rich_text:[{plain_text:reference}]}}});
function equal(a:unknown,b:unknown){if(JSON.stringify(a)!==JSON.stringify(b))throw Error('Assertion failed');}
function rejects(fn:()=>unknown){let failed=false;try{fn();}catch{failed=true;}if(!failed)throw Error('Expected validation failure');}
Deno.test('signed credits, positive debit input, and normalized member email',()=>{equal(payloadOf(page('별 지급')).amount,50);equal(payloadOf(page('별 회수')).amount,-50);equal(payloadOf(page('별 지급')).email,'user@example.com');});
Deno.test('reject fractional, negative, excess amounts and unknown actions',()=>{for(const n of [-1,0,1.5,100001])rejects(()=>payloadOf(page('별 지급',n)));rejects(()=>payloadOf(page('이용권 지급',1096)));rejects(()=>payloadOf(page('unknown')));});
Deno.test('revocation requires reference and zero amount',()=>{rejects(()=>payloadOf(page('이용권 지급 취소',0)));equal(payloadOf(page('이용권 지급 취소',0,'11111111-1111-4111-8111-111111111111')).amount,0);rejects(()=>payloadOf(page('이용권 지급 취소',1,'11111111-1111-4111-8111-111111111111')));});
