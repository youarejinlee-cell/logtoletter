begin;
create table public.logplanet_admins(user_id uuid primary key references auth.users(id) on delete cascade, created_at timestamptz not null default now());
alter table public.logplanet_admins enable row level security;
revoke all on public.logplanet_admins from public,anon,authenticated;
create function public.is_logplanet_admin() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.logplanet_admins where user_id=auth.uid()) $$;
revoke all on function public.is_logplanet_admin() from public,anon;
grant execute on function public.is_logplanet_admin() to authenticated;
create table public.admin_operations(
 id uuid primary key, actor_id uuid references auth.users(id) on delete set null,
 user_id uuid references auth.users(id) on delete set null,
 kind text not null check(kind in ('stars','gift_days','gift_revoke')),
 amount integer not null, reason text not null, reference_id uuid references public.admin_operations(id),
 effective_until timestamptz, created_at timestamptz not null default now()
);
alter table public.admin_operations enable row level security;
revoke all on public.admin_operations from public,anon,authenticated;
create function public.gift_access_until(p_user uuid) returns timestamptz language sql stable security definer set search_path='' as $$
 select max(o.effective_until) from public.admin_operations o where o.user_id=p_user and o.kind='gift_days'
 and not exists(select 1 from public.admin_operations r where r.kind='gift_revoke' and r.reference_id=o.id)
$$;
revoke all on function public.gift_access_until(uuid) from public,anon,authenticated;
create function public.my_gift_access() returns timestamptz language sql stable security definer set search_path='' as $$ select public.gift_access_until(auth.uid()) $$;
revoke all on function public.my_gift_access() from public,anon;
grant execute on function public.my_gift_access() to authenticated;
alter table public.star_reward_ledger drop constraint star_reward_ledger_amount_check;
alter table public.star_reward_ledger add constraint star_reward_ledger_amount_check check(amount<>0 and (
 amount>0 or reward_key ~ '^admin:' or (reward_key in ('purchase:logfriend:rogi','purchase:logfriend:roa','purchase:logfriend:rona') and amount=-50)));
create function public.admin_find_users(p_query text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.is_logplanet_admin() then raise exception 'Admin access required'; end if;
 if length(trim(p_query))<3 then raise exception 'Enter at least 3 characters'; end if;
 return coalesce((select jsonb_agg(row_to_json(t)) from (select u.id,u.email,u.created_at,
 (select coalesce(sum(amount),0) from public.star_reward_ledger where user_id=u.id) balance,
 public.gift_access_until(u.id) gift_until from auth.users u where position(lower(trim(p_query)) in lower(coalesce(u.email,'')))>0 or u.id::text=p_query order by u.created_at desc limit 50)t),'[]');
end $$;
create function public.admin_user_history(p_user uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.is_logplanet_admin() then raise exception 'Admin access required'; end if;
 return jsonb_build_object('operations',coalesce((select jsonb_agg(row_to_json(t)) from (select * from public.admin_operations where user_id=p_user order by created_at desc limit 100)t),'[]'),
 'stars',coalesce((select jsonb_agg(row_to_json(t)) from (select * from public.star_reward_ledger where user_id=p_user order by created_at desc limit 200)t),'[]'));
end $$;
create function public.admin_apply_operation(p_id uuid,p_user uuid,p_kind text,p_amount integer,p_reason text,p_reference uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare old public.admin_operations; v_end timestamptz; v_balance bigint; target public.admin_operations;
begin
 if not public.is_logplanet_admin() then raise exception 'Admin access required'; end if;
 if p_id is null or p_user is null or p_kind is null or p_amount is null or p_reason is null or length(trim(p_reason))<3 or length(p_reason)>500 then raise exception 'Invalid operation'; end if;
 perform pg_advisory_xact_lock(hashtextextended('admin-request:'||p_id::text,0));
 select * into old from public.admin_operations where id=p_id;
 if found then
  if old.actor_id<>auth.uid() or old.user_id<>p_user or old.kind<>p_kind or old.amount<>p_amount or old.reason<>trim(p_reason) or old.reference_id is distinct from p_reference then raise exception 'Request ID already used'; end if;
  return to_jsonb(old);
 end if;
 if not exists(select 1 from auth.users where id=p_user) then raise exception 'User not found'; end if;
 perform pg_advisory_xact_lock(hashtextextended('star:'||p_user::text,0));
 if p_kind='stars' then
  if p_reference is not null or p_amount=0 or abs(p_amount::bigint)>100000 then raise exception 'Invalid star adjustment'; end if;
  select coalesce(sum(amount),0) into v_balance from public.star_reward_ledger where user_id=p_user;
  if v_balance+p_amount<0 then raise exception 'Not enough stars'; end if;
 elsif p_kind='gift_days' then
  if p_reference is not null or p_amount<1 or p_amount>1095 then raise exception 'Invalid gift duration'; end if;
  v_end:=greatest(now(),coalesce(public.gift_access_until(p_user),now()))+make_interval(days=>p_amount);
 elsif p_kind='gift_revoke' then
  select * into target from public.admin_operations where id=p_reference and user_id=p_user and kind='gift_days';
  if not found or p_amount<>0 then raise exception 'Invalid gift reference'; end if;
  if exists(select 1 from public.admin_operations where reference_id=p_reference and kind='gift_revoke') then raise exception 'Already revoked'; end if;
 else raise exception 'Invalid operation kind'; end if;
 insert into public.admin_operations(id,actor_id,user_id,kind,amount,reason,reference_id,effective_until) values(p_id,auth.uid(),p_user,p_kind,p_amount,trim(p_reason),p_reference,v_end) returning * into old;
 if p_kind='stars' then insert into public.star_reward_ledger(user_id,reward_key,amount,reason) values(p_user,'admin:'||p_id::text,p_amount,'관리자: '||trim(p_reason)); end if;
 return to_jsonb(old);
end $$;
revoke all on function public.admin_find_users(text),public.admin_user_history(uuid),public.admin_apply_operation(uuid,uuid,text,integer,text,uuid) from public,anon;
grant execute on function public.admin_find_users(text),public.admin_user_history(uuid),public.admin_apply_operation(uuid,uuid,text,integer,text,uuid) to authenticated;
commit;
