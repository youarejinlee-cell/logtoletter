alter table public.entries
  add column if not exists mood_tag text;

create index if not exists entries_user_mood_tag_idx
  on public.entries (user_id, mood_tag);
