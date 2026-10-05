begin;
create or replace function public.notion_apply_request(p_page uuid,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.notion_ledger_receipts; actor uuid; member uuid; res jsonb; previous_sub text; previous_claims text;
begin
 perform pg_advisory_xact_lock(hashtextextended('notion:'||p_page::text,0));
 select * into r from public.notion_ledger_receipts where page_id=p_page;
 if found then
  if r.payload<>p_payload then raise exception '이미 처리된 요청은 수정할 수 없습니다. 새 요청을 만드세요.'; end if;
  return r.result;
 end if;
 select a.user_id into actor from public.logplanet_admins a join auth.users u on u.id=a.user_id where lower(u.email)='you.are.jinlee@gmail.com';
 if actor is null then raise exception '운영자 권한이 없습니다.'; end if;
 select id into member from auth.users where lower(email)=lower(trim(p_payload->>'email'));
 if member is null then raise exception '회원 이메일을 찾을 수 없습니다.'; end if;
 if p_payload->>'kind'='gift_revoke' and exists(
  select 1 from public.admin_operations target join public.admin_operations later
  on later.user_id=target.user_id and later.kind='gift_days' and (later.created_at,later.id)>(target.created_at,target.id)
  where target.id=nullif(p_payload->>'reference','')::uuid
  and not exists(select 1 from public.admin_operations revoked where revoked.kind='gift_revoke' and revoked.reference_id=later.id)
 ) then raise exception '이후에 추가된 이용권이 있습니다. 가장 최근 지급부터 취소해주세요.'; end if;
 previous_sub:=current_setting('request.jwt.claim.sub',true);
 previous_claims:=current_setting('request.jwt.claims',true);
 -- Only the service-role worker can enter this adapter. No client-supplied actor.
 perform set_config('request.jwt.claim.sub',actor::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 res:=public.admin_apply_operation(p_page,member,p_payload->>'kind',(p_payload->>'amount')::integer,p_payload->>'reason',nullif(p_payload->>'reference','')::uuid);
 perform set_config('request.jwt.claim.sub',coalesce(previous_sub,''),true);
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);
 insert into public.notion_ledger_receipts(page_id,payload,result) values(p_page,p_payload,res);
 return res;
end $$;
commit;
