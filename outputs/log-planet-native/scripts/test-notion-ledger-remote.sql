begin;
do $$
declare p uuid:=gen_random_uuid(); gift uuid:=gen_random_uuid(); debit uuid:=gen_random_uuid(); member uuid; before_balance bigint; after_balance bigint; payload jsonb; result jsonb;
begin
 select id into member from auth.users where email='you.are.jinlee@gmail.com';
 if member is null then raise exception 'Test account missing'; end if;
 select coalesce(sum(amount),0) into before_balance from public.star_reward_ledger where user_id=member;
 payload:=jsonb_build_object('email','you.are.jinlee@gmail.com','kind','stars','amount',7,'reason','ROLLBACK ONLY Notion integration verification','reference',null);
 result:=public.notion_apply_request(p,payload);
 if result<>public.notion_apply_request(p,payload) then raise exception 'Idempotency failed'; end if;
 select coalesce(sum(amount),0) into after_balance from public.star_reward_ledger where user_id=member;
 if after_balance<>before_balance+7 then raise exception 'Balance failed'; end if;
 begin
  perform public.notion_apply_request(p,payload||'{"amount":8}'::jsonb);
  raise exception 'Changed request accepted';
 exception when others then if sqlerrm='Changed request accepted' then raise; end if; end;
 begin
  perform public.notion_apply_request(debit,payload||jsonb_build_object('amount',-(after_balance+1)));
  raise exception 'Overdraft accepted';
 exception when others then if sqlerrm='Overdraft accepted' then raise; end if; end;
 if public.notion_get_receipt(debit) is not null then raise exception 'Failed request persisted'; end if;
 result:=public.notion_apply_request(gift,payload||'{"kind":"gift_days","amount":365}'::jsonb);
 if (result->>'effective_until')::timestamptz<now()+interval '364 days' then raise exception 'Gift failed'; end if;
 perform public.notion_apply_request(gen_random_uuid(),payload||jsonb_build_object('kind','gift_revoke','amount',0,'reference',gift));
 if has_function_privilege('authenticated','public.notion_apply_request(uuid,jsonb)','execute') or has_function_privilege('anon','public.notion_apply_request(uuid,jsonb)','execute') then raise exception 'Unsafe grants'; end if;
end $$;
rollback;
select 'PASS: remote credit, retry, changed request rejection, overdraft rejection, gift grant/revoke, RPC permissions; all test changes rolled back' as result;
