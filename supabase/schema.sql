-- Shared Challenge leaderboard for COLREGs Trainer.
-- Run in Supabase: SQL Editor → New query → paste → Run.
create table if not exists public.scores (
  id         uuid primary key default gen_random_uuid(),
  nick       text not null check (char_length(trim(nick)) between 1 and 20),
  score      int  not null check (score between -100 and 200),
  level      int  not null check (level between 0 and 10),
  time_s     int  not null check (time_s between 0 and 36000),
  version    int  not null default 4,
  created_at timestamptz not null default now()
);

create index if not exists scores_board_idx on public.scores (version, score desc, level desc, time_s);

-- Anyone may read the board and add a score; nobody can edit or delete from the browser.
alter table public.scores enable row level security;
drop policy if exists "scores are public" on public.scores;
create policy "scores are public" on public.scores for select using (true);
drop policy if exists "anyone can add a score" on public.scores;
create policy "anyone can add a score" on public.scores for insert with check (true);
-- Moderate (delete silly entries) from the Supabase dashboard: Table Editor → scores.
