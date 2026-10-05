export const REQUESTS = 'd720501c-f188-4d9f-939d-9a4deef49a64';
export const MEMBERS = 'c0aa0b1a-40c5-4f38-8b4b-826dbe9f681d';
export const OWNER = 'c17b660b-bdab-4a69-a20b-906c8d98c241';
export const textOf = (p: any) => (p?.rich_text ?? p?.title ?? []).map((x: any) => x.plain_text ?? x.text?.content ?? '').join('');
export function payloadOf(page: any) {
 const p = page.properties;
 const action = p['작업']?.select?.name;
 const kind = ({'별 지급':'stars','별 회수':'stars','이용권 지급':'gift_days','이용권 지급 취소':'gift_revoke'} as Record<string,string>)[action];
 const n = p['수량']?.number;
 const reason = textOf(p['사유']).trim();
 const email = (p['회원 이메일']?.email ?? '').trim().toLowerCase();
 const reference = textOf(p['원본 거래 ID']).trim() || null;
 if (!kind || !email || reason.length < 3 || reason.length > 500) throw Error('회원 이메일·작업·사유(3~500자)를 확인하세요.');
 if (kind !== 'gift_revoke' && (!Number.isSafeInteger(n) || n < 1 || n > (kind === 'stars' ? 100000 : 1095))) throw Error('별은 1~100000개, 이용권은 1~1095일의 정수로 입력하세요.');
 if (kind === 'gift_revoke' ? (!reference || !/^[0-9a-f-]{36}$/i.test(reference) || (n !== null && n !== undefined && n !== 0)) : reference !== null) throw Error('지급 취소는 원본 거래 ID와 수량 0을 입력하세요. 다른 작업은 원본 거래 ID를 비워주세요.');
 return {email,kind,amount:kind === 'gift_revoke' ? 0 : action === '별 회수' ? -n : n,reason,reference};
}
export const rich = (s: string) => ({rich_text:[{text:{content:s.slice(0,1900)}}]});
