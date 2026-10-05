begin;
alter table public.star_reward_ledger drop constraint star_reward_ledger_amount_check;
alter table public.star_reward_ledger add constraint star_reward_ledger_amount_check check (
 (reward_key !~ '^purchase:' and amount > 0) or
 (reward_key in ('purchase:logfriend:rogi','purchase:logfriend:roa','purchase:logfriend:rona') and amount = -50)
);
create table public.log_friend_selection (
 user_id uuid primary key references auth.users(id) on delete cascade,
 friend_id text not null check (friend_id in ('romi','rogi','roa','rona'))
);
alter table public.log_friend_selection enable row level security;
revoke all on public.log_friend_selection from public, anon, authenticated;
grant select on public.log_friend_selection to authenticated;
create policy log_friend_read_own on public.log_friend_selection for select to authenticated using ((select auth.uid())=user_id);
create function public.purchase_log_friend(p_friend text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_balance bigint; v_name text;
begin
 if v_user is null then raise exception 'Authentication required'; end if;
 if p_friend is null or p_friend not in ('rogi','roa','rona') then raise exception 'Invalid friend'; end if;
 -- Same lock as daily rewards: balance check, debit, ownership, selection are atomic.
 perform pg_advisory_xact_lock(hashtextextended('star:'||v_user::text,0));
 if exists(select 1 from public.star_reward_ledger where user_id=v_user and reward_key='purchase:logfriend:'||p_friend) then return; end if;
 select coalesce(sum(amount),0) into v_balance from public.star_reward_ledger where user_id=v_user;
 if v_balance<50 then raise exception 'Not enough stars'; end if;
 v_name := case p_friend when 'rogi' then '로기' when 'roa' then '로아' else '로나' end;
 insert into public.star_reward_ledger(user_id,reward_key,amount,reason)
 values(v_user,'purchase:logfriend:'||p_friend,-50,v_name||' 구매');
 insert into public.log_friend_selection(user_id,friend_id) values(v_user,p_friend)
 on conflict(user_id) do update set friend_id=excluded.friend_id;
end $$;
create function public.select_log_friend(p_friend text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
 if v_user is null then raise exception 'Authentication required'; end if;
 if p_friend is null or p_friend not in ('romi','rogi','roa','rona') then raise exception 'Invalid friend'; end if;
 perform pg_advisory_xact_lock(hashtextextended('star:'||v_user::text,0));
 if p_friend<>'romi' and not exists(select 1 from public.star_reward_ledger where user_id=v_user and reward_key='purchase:logfriend:'||p_friend) then raise exception 'Friend not owned'; end if;
 insert into public.log_friend_selection(user_id,friend_id) values(v_user,p_friend)
 on conflict(user_id) do update set friend_id=excluded.friend_id;
end $$;
revoke all on function public.purchase_log_friend(text), public.select_log_friend(text) from public, anon;
grant execute on function public.purchase_log_friend(text), public.select_log_friend(text) to authenticated;
commit;
