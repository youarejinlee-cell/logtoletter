alter table public.entries
drop constraint if exists entries_energy_check;

update public.entries
set energy = greatest(10, least(100, round((energy::numeric / 7) * 10) * 10))::integer
where energy between 1 and 7;

alter table public.entries
add constraint entries_energy_check
check (energy between 0 and 100 and energy % 10 = 0);
