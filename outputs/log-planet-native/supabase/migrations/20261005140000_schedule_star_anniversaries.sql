begin;
create extension if not exists pg_cron with schema pg_catalog;
create function public.award_due_star_anniversaries() returns void language plpgsql security definer set search_path='' as $$
declare u record;
begin
 for u in select a.id from auth.users a left join public.star_mission_progress p on p.user_id=a.id where
 (coalesce(p.first_met_at,a.created_at)<=now()-interval '30 days' and not exists(select 1 from public.star_reward_ledger l where l.user_id=a.id and l.reward_key='mission:v2:days:30')) or
 (coalesce(p.first_met_at,a.created_at)<=now()-interval '109 days' and not exists(select 1 from public.star_reward_ledger l where l.user_id=a.id and l.reward_key='mission:v2:days:109'))
 limit 1000 loop perform public.award_star_milestones(u.id); end loop;
end $$;
revoke all on function public.award_due_star_anniversaries() from public,anon,authenticated;
select cron.schedule('logplanet-star-anniversaries-v2','*/15 * * * *','select public.award_due_star_anniversaries()');
commit;
