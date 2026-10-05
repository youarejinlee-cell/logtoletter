begin;
alter table public.notion_ledger_receipts add column snapshot_synced_at timestamptz;
create or replace function public.notion_member_snapshots() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(t),'[]') from (
 select u.id,u.email,coalesce((select sum(amount) from public.star_reward_ledger where user_id=u.id),0) balance,public.gift_access_until(u.id) gift_until
 from auth.users u join (select (result->>'user_id')::uuid user_id,min(coalesce(snapshot_synced_at,'epoch'::timestamptz)) synced from public.notion_ledger_receipts group by result->>'user_id') r on r.user_id=u.id
 order by r.synced,u.id limit 10
 ) t
$$;
create function public.notion_mark_member_synced(p_user uuid) returns void language sql security definer set search_path='' as $$
 update public.notion_ledger_receipts set snapshot_synced_at=now() where result->>'user_id'=p_user::text
$$;
revoke all on function public.notion_mark_member_synced(uuid) from public,anon,authenticated;
grant execute on function public.notion_mark_member_synced(uuid) to service_role;
create extension if not exists pg_net with schema extensions;
-- The caller secret is provisioned into Vault separately, never committed in source.
create function public.invoke_notion_ledger_sync() returns bigint language plpgsql security definer set search_path='' as $$
declare token text; request_id bigint;
begin
 select decrypted_secret into token from vault.decrypted_secrets where name='logplanet_notion_sync_secret';
 if token is null then raise exception 'Notion scheduler secret not configured'; end if;
 select net.http_post(url:='https://mrjhbcipfblumtnnpehg.supabase.co/functions/v1/notion-ledger-sync',headers:=jsonb_build_object('Content-Type','application/json','x-sync-secret',token),body:='{}'::jsonb,timeout_milliseconds:=120000) into request_id;
 return request_id;
end $$;
revoke all on function public.invoke_notion_ledger_sync() from public,anon,authenticated;
-- Enabled only after the live connection has passed validation.
commit;
