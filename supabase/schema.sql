-- Run once in the Supabase SQL Editor.
create table if not exists public.rooms (
 code text primary key,
 state jsonb not null,
 version integer not null default 0,
 updated bigint not null
);
alter table public.rooms enable row level security;
-- No browser policies: only the server service_role can read the full deck.
revoke all on public.rooms from anon, authenticated;
grant all on public.rooms to service_role;
