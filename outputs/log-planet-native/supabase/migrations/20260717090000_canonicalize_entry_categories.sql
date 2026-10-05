update public.entries
set category = 'relationship'
where category in ('relationships', 'love', 'family');

update public.entries
set category = 'selfDiscipline'
where category in ('dream', 'habit', 'attitude');

alter table public.entries
  drop constraint if exists entries_category_check;

alter table public.entries
  add constraint entries_category_check check (
    category is null or category in (
      'work',
      'selfDiscipline',
      'wealth',
      'taste',
      'relationship',
      'health',
      'other'
    )
  );
