begin;
lock table public.entries in share row exclusive mode;
-- Rollout timestamp lets offline records earn on their original day without
-- retroactively rewarding old backups imported after this feature launches.
create table public.star_reward_policy (
 singleton boolean primary key default true check(singleton),
 enabled_at timestamptz not null default now()
);
insert into public.star_reward_policy(singleton) values(true);
alter table public.star_reward_policy enable row level security;
revoke all on public.star_reward_policy from public, anon, authenticated;
-- Server-owned, append-only reward history. Deleting entries never deletes rewards.
create table public.star_reward_ledger (
 user_id uuid not null references auth.users(id) on delete cascade,
 reward_key text not null,
 amount integer not null check(amount > 0),
 reason text not null,
 created_at timestamptz not null default now(),
 primary key(user_id,reward_key)
);
create table public.star_reward_entries (
 user_id uuid not null references auth.users(id) on delete cascade,
 entry_id uuid not null,
 reward_day date not null,
 primary key(user_id,entry_id)
);
alter table public.star_reward_ledger enable row level security;
alter table public.star_reward_entries enable row level security;
revoke all on public.star_reward_ledger, public.star_reward_entries from anon, authenticated;
grant select on public.star_reward_ledger to authenticated;
create policy star_rewards_read_own on public.star_reward_ledger for select to authenticated using ((select auth.uid())=user_id);
-- Existing records establish counts without retroactive payouts.
insert into public.star_reward_entries(user_id,entry_id,reward_day)
select user_id,id,(created_at at time zone 'Asia/Seoul')::date from public.entries
on conflict do nothing;
create function public.award_daily_record_stars() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_day date := (new.created_at at time zone 'Asia/Seoul')::date; v_count integer; v_amount integer; v_added integer;
begin
 perform pg_advisory_xact_lock(hashtextextended('star:'||new.user_id::text,0));
 insert into public.star_reward_entries(user_id,entry_id,reward_day)
 values(new.user_id,new.id,(new.created_at at time zone 'Asia/Seoul')::date) on conflict do nothing;
 get diagnostics v_added = row_count;
 if v_added=0 or new.created_at > now() or new.created_at < (select enabled_at from public.star_reward_policy where singleton) then return new; end if;
 select count(*) into v_count from public.star_reward_entries where user_id=new.user_id and reward_day=v_day;
 v_amount := case v_count when 1 then 5 when 3 then 3 when 5 then 2 else 0 end;
 if v_amount>0 then
  insert into public.star_reward_ledger(user_id,reward_key,amount,reason)
  values(new.user_id,'daily:'||v_day::text||':'||v_count::text,v_amount,'오늘 '||v_count::text||'번째 기록') on conflict do nothing;
 end if;
 return new;
end $$;
revoke all on function public.award_daily_record_stars() from public, anon, authenticated;
create trigger entries_award_daily_stars after insert on public.entries for each row execute function public.award_daily_record_stars();
create function public.claim_monthly_analysis_stars(p_month text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_start date; v_end date;
begin
 if v_user is null then raise exception 'Authentication required'; end if;
 if p_month !~ '^\d{4}-(0[1-9]|1[0-2])$' then raise exception 'Invalid month'; end if;
 v_start := (p_month||'-01')::date;
 v_end := (v_start + interval '1 month')::date;
 if v_end > (now() at time zone 'Asia/Seoul')::date then return; end if;
 if not exists(select 1 from public.entries where user_id=v_user and created_at >= (v_start::timestamp at time zone 'Asia/Seoul') and created_at < (v_end::timestamp at time zone 'Asia/Seoul')) then return; end if;
 insert into public.star_reward_ledger(user_id,reward_key,amount,reason)
 values(v_user,'monthly:'||p_month,20,p_month||' 월간 분석') on conflict do nothing;
end $$;
revoke all on function public.claim_monthly_analysis_stars(text) from public, anon;
grant execute on function public.claim_monthly_analysis_stars(text) to authenticated;
commit;
