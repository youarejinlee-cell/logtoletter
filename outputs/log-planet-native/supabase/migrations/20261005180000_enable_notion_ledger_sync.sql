begin;
do $$begin
 if not exists(select 1 from vault.secrets where name='logplanet_notion_sync_secret') then raise exception 'Configure Notion caller secret in Vault before enabling sync'; end if;
end $$;
select cron.schedule('logplanet-notion-ledger-sync','* * * * *','select public.invoke_notion_ledger_sync()');
commit;
