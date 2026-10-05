alter table public.entries
  add column if not exists category text;

alter table public.entries
  drop constraint if exists entries_category_check;

alter table public.entries
  add constraint entries_category_check check (
    category is null or category in (
      'work',
      'relationship',
      'relationships',
      'love',
      'family',
      'dream',
      'selfDiscipline',
      'wealth',
      'taste',
      'habit',
      'attitude',
      'health',
      'other'
    )
  );
