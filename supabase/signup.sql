-- Username signup: persistent rate limiting, callable only by the app server.
create table if not exists public.signup_limits (
 bucket text primary key,
 attempts integer not null default 0,
 expires_at timestamptz not null
);
alter table public.signup_limits enable row level security;
revoke all on public.signup_limits from public, anon, authenticated;
grant all on public.signup_limits to service_role;
create or replace function public.consume_signup_attempt(bucket text)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare used integer;
begin
 insert into public.signup_limits as limits (bucket,attempts,expires_at)
 values ($1,1,now()+interval '1 hour')
 on conflict on constraint signup_limits_pkey do update
 set attempts=case when limits.expires_at<=now() then 1 else limits.attempts+1 end,
 expires_at=case when limits.expires_at<=now() then now()+interval '1 hour' else limits.expires_at end
 returning attempts into used;
 return used<=5;
end;
$$;
revoke all on function public.consume_signup_attempt(text) from public,anon,authenticated;
grant execute on function public.consume_signup_attempt(text) to service_role;
