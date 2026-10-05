begin;
create table public.notion_ledger_receipts (
 page_id uuid primary key, payload jsonb not null, result jsonb not null,
 created_at timestamptz not null default now()
);
alter table public.notion_ledger_receipts enable row level security;
revoke all on public.notion_ledger_receipts from public,anon,authenticated;
create table public.notion_sync_lock(id boolean primary key default true check(id), token uuid, expires_at timestamptz);
alter table public.notion_sync_lock enable row level security;
revoke all on public.notion_sync_lock from public,anon,authenticated;
insert into public.notion_sync_lock(id) values(true);
create function public.notion_sync_lease(p_token uuid,p_release boolean default false) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if p_release then update public.notion_sync_lock set expires_at=now() where id and token=p_token;
 else update public.notion_sync_lock set token=p_token,expires_at=now()+interval '5 minutes' where id and (expires_at is null or expires_at<now()); end if;
 return found;
end $$;
create function public.notion_apply_request(p_page uuid,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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
create function public.notion_get_receipt(p_page uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('payload',payload,'result',result) from public.notion_ledger_receipts where page_id=p_page
$$;
create function public.notion_member_snapshots() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(t),'[]') from (
 select u.id,u.email,coalesce((select sum(amount) from public.star_reward_ledger where user_id=u.id),0) balance,public.gift_access_until(u.id) gift_until
 from auth.users u where exists(select 1 from public.notion_ledger_receipts r where r.result->>'user_id'=u.id::text)
 ) t
$$;
revoke all on function public.notion_sync_lease(uuid,boolean),public.notion_apply_request(uuid,jsonb),public.notion_get_receipt(uuid),public.notion_member_snapshots() from public,anon,authenticated;
grant execute on function public.notion_sync_lease(uuid,boolean),public.notion_apply_request(uuid,jsonb),public.notion_get_receipt(uuid),public.notion_member_snapshots() to service_role;
commit;
