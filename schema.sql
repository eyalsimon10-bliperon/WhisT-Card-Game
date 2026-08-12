-- WhisT — Supabase schema
-- Run this entire file in: Supabase Dashboard → SQL Editor → New query → Run
--
-- After running:
-- 1. Enable Realtime for `rooms`, `room_players`, and `game_states` (see section at bottom).
-- 2. Add env vars to .env.local and Vercel (see .env.example).

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.rooms (
  code text primary key check (char_length(code) = 6),
  host_id text not null,
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  max_players integer not null default 4 check (max_players = 4),
  is_bot_room boolean not null default false,
  total_rounds integer not null default 13 check (total_rounds between 5 and 13),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references public.rooms(code) on delete cascade,
  player_id text not null,
  name text not null check (char_length(trim(name)) >= 2),
  is_host boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (room_code, player_id),
  unique (room_code, name)
);

create table if not exists public.game_states (
  room_code text primary key references public.rooms(code) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists idx_rooms_status on public.rooms(status);
create index if not exists idx_rooms_created_at on public.rooms(created_at desc);
create index if not exists idx_room_players_room_code on public.room_players(room_code);
create index if not exists idx_game_states_updated_at on public.game_states(updated_at desc);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_rooms_updated_at on public.rooms;
create trigger trg_rooms_updated_at
  before update on public.rooms
  for each row execute function public.set_updated_at();

drop trigger if exists trg_game_states_updated_at on public.game_states;
create trigger trg_game_states_updated_at
  before update on public.game_states
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security (MVP — permissive; tighten before public launch)
-- ---------------------------------------------------------------------------

alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.game_states enable row level security;

-- rooms
drop policy if exists "rooms_select_all" on public.rooms;
create policy "rooms_select_all"
  on public.rooms for select
  using (true);

drop policy if exists "rooms_insert_all" on public.rooms;
create policy "rooms_insert_all"
  on public.rooms for insert
  with check (true);

drop policy if exists "rooms_update_all" on public.rooms;
create policy "rooms_update_all"
  on public.rooms for update
  using (true)
  with check (true);

drop policy if exists "rooms_delete_all" on public.rooms;
create policy "rooms_delete_all"
  on public.rooms for delete
  using (true);

-- room_players
drop policy if exists "room_players_select_all" on public.room_players;
create policy "room_players_select_all"
  on public.room_players for select
  using (true);

drop policy if exists "room_players_insert_all" on public.room_players;
create policy "room_players_insert_all"
  on public.room_players for insert
  with check (true);

drop policy if exists "room_players_update_all" on public.room_players;
create policy "room_players_update_all"
  on public.room_players for update
  using (true)
  with check (true);

drop policy if exists "room_players_delete_all" on public.room_players;
create policy "room_players_delete_all"
  on public.room_players for delete
  using (true);

-- game_states
drop policy if exists "game_states_select_all" on public.game_states;
create policy "game_states_select_all"
  on public.game_states for select
  using (true);

drop policy if exists "game_states_insert_all" on public.game_states;
create policy "game_states_insert_all"
  on public.game_states for insert
  with check (true);

drop policy if exists "game_states_update_all" on public.game_states;
create policy "game_states_update_all"
  on public.game_states for update
  using (true)
  with check (true);

drop policy if exists "game_states_delete_all" on public.game_states;
create policy "game_states_delete_all"
  on public.game_states for delete
  using (true);

-- ---------------------------------------------------------------------------
-- Realtime (Supabase Database → Publications)
-- Run if tables are not already in supabase_realtime publication.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'room_players'
  ) then
    alter publication supabase_realtime add table public.room_players;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'game_states'
  ) then
    alter publication supabase_realtime add table public.game_states;
  end if;
end $$;

-- Helps Realtime filters on room_players (non-PK columns) deliver full row payloads
alter table public.room_players replica identity full;

-- Optional: verify
-- select * from pg_publication_tables where pubname = 'supabase_realtime';
