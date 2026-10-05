begin;
lock table public.entries in share row exclusive mode;
create table public.star_mission_progress(user_id uuid primary key references auth.users(id) on delete cascade,first_met_at timestamptz not null default now(),notification_completed_at timestamptz);
alter table public.star_mission_progress enable row level security;
revoke all on public.star_mission_progress from public,anon,authenticated;
insert into public.star_mission_progress(user_id,first_met_at) select u.id,least(u.created_at,coalesce((select min(e.created_at) from public.entries e where e.user_id=u.id),u.created_at),now()) from auth.users u;
-- Policy transition does not erase any previously earned or spent stars.
update public.star_reward_policy set enabled_at=now() where singleton;
create function public.award_star_milestones(p_user uuid) returns void language plpgsql security definer set search_path='' as $$
declare n integer; met timestamptz; milestone record;
begin
 perform pg_advisory_xact_lock(hashtextextended('star:'||p_user::text,0));
 insert into public.star_mission_progress(user_id,first_met_at) select id,least(created_at,now()) from auth.users where id=p_user on conflict do nothing;
 select first_met_at into met from public.star_mission_progress where user_id=p_user;
 select count(*) into n from public.star_reward_entries where user_id=p_user and reward_day <= (now() at time zone 'Asia/Seoul')::date;
 for milestone in select * from (values(5,1),(10,2),(20,3),(109,10)) as m(threshold,stars) loop
  if n>=milestone.threshold then insert into public.star_reward_ledger(user_id,reward_key,amount,reason) values(p_user,'mission:v2:records:'||milestone.threshold,milestone.stars,'누적 '||milestone.threshold||'번째 기록') on conflict do nothing; end if;
 end loop;
 for milestone in select * from (values(30,3),(109,10)) as m(threshold,stars) loop
  if now()>=met+make_interval(days=>milestone.threshold) then insert into public.star_reward_ledger(user_id,reward_key,amount,reason) values(p_user,'mission:v2:days:'||milestone.threshold,milestone.stars,'로그플래닛과 만난 지 '||milestone.threshold||'일') on conflict do nothing; end if;
 end loop;
end $$;
revoke all on function public.award_star_milestones(uuid) from public,anon,authenticated;
create or replace function public.award_daily_record_stars() returns trigger language plpgsql security definer set search_path='' as $$
declare added integer; d date := (new.created_at at time zone 'Asia/Seoul')::date;
begin
 perform pg_advisory_xact_lock(hashtextextended('star:'||new.user_id::text,0));
 if new.created_at>now() then return new; end if;
 insert into public.star_reward_entries(user_id,entry_id,reward_day) values(new.user_id,new.id,d) on conflict do nothing;
 get diagnostics added=row_count;
 if added=0 then return new; end if;
 if new.created_at >= (select enabled_at from public.star_reward_policy where singleton)
 and not exists(select 1 from public.star_reward_ledger where user_id=new.user_id and reward_key like 'daily:'||d::text||':%') then
  insert into public.star_reward_ledger(user_id,reward_key,amount,reason) values(new.user_id,'daily:v2:'||d::text,1,'오늘 첫 기록') on conflict do nothing;
 end if;
 perform public.award_star_milestones(new.user_id);
 return new;
end $$;
-- Legacy clients can still call the old RPC, but monthly analysis no longer pays.
create or replace function public.claim_monthly_analysis_stars(p_month text) returns void language plpgsql security definer set search_path='' as $$ begin if auth.uid() is null then raise exception 'Authentication required'; end if; end $$;
create function public.refresh_star_missions() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); p public.star_mission_progress; n integer;
begin
 if u is null then raise exception 'Authentication required'; end if;
 perform public.award_star_milestones(u);
 select * into p from public.star_mission_progress where user_id=u;
 select count(*) into n from public.star_reward_entries where user_id=u and reward_day<=(now() at time zone 'Asia/Seoul')::date;
 return jsonb_build_object('firstMetAt',p.first_met_at,'notificationCompletedAt',p.notification_completed_at,'recordCount',n);
end $$;
create function public.complete_notification_mission() returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null then raise exception 'Authentication required'; end if;
 if not exists(select 1 from public.notification_settings where user_id=u and enabled=true) then raise exception 'Save enabled notification settings first'; end if;
 perform public.award_star_milestones(u);
 update public.star_mission_progress set notification_completed_at=coalesce(notification_completed_at,now()) where user_id=u;
 insert into public.star_reward_ledger(user_id,reward_key,amount,reason) values(u,'mission:v2:notifications',5,'첫 알림 설정 완료') on conflict do nothing;
end $$;
revoke all on function public.refresh_star_missions(),public.complete_notification_mission() from public,anon;
grant execute on function public.refresh_star_missions(),public.complete_notification_mission() to authenticated;
-- Catch up already-completed lifetime missions once. The daily reward is not backfilled.
do $$ declare u record; begin for u in select id from auth.users loop perform public.award_star_milestones(u.id); end loop; end $$;
commit;
