-- App-managed trial. No store purchase or automatic billing starts here.
begin;

create table public.account_trials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  started_at timestamptz not null default now()
);
alter table public.account_trials enable row level security;
revoke all on public.account_trials from anon, authenticated;
grant select on public.account_trials to authenticated;
create policy account_trials_select_own on public.account_trials
  for select to authenticated using ((select auth.uid()) = user_id);

-- Existing users receive a transition period from rollout, not a retroactive expiry.
insert into public.account_trials (user_id, started_at)
select distinct user_id, now() from public.entries
on conflict (user_id) do nothing;

create function public.resolve_account_trial(p_user_id uuid, p_started_at timestamptz default null)
returns timestamptz
language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_started_at timestamptz;
begin
  if v_user_id is null or p_user_id is distinct from v_user_id then
    raise exception 'Account does not match authenticated session';
  end if;
  if p_started_at is not null then
    insert into public.account_trials (user_id, started_at)
    values (v_user_id, least(p_started_at, now()))
    on conflict (user_id) do update
      set started_at = least(public.account_trials.started_at, excluded.started_at);
  end if;
  select started_at into v_started_at from public.account_trials where user_id = v_user_id;
  return v_started_at;
end;
$$;
revoke all on function public.resolve_account_trial(uuid, timestamptz) from public, anon;
grant execute on function public.resolve_account_trial(uuid, timestamptz) to authenticated;

create function public.start_trial_on_first_entry()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.account_trials (user_id, started_at) values (new.user_id, now())
  on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke all on function public.start_trial_on_first_entry() from public, anon, authenticated;
create trigger entries_start_account_trial after insert on public.entries
for each row execute function public.start_trial_on_first_entry();

commit;
