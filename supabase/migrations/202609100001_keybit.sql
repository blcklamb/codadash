-- keybit v1. Server is the only writer of verified game results.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default 'developer' check (char_length(nickname) between 2 and 16),
  locale text not null default 'ko' check (locale in ('ko','en')),
  created_at timestamptz not null default now()
);
create table public.sessions (
  id uuid primary key,
  user_ids uuid[] not null default '{}',
  kind text not null check (kind in ('speed','daily','battle')),
  status text not null check (status in ('active','finished','aborted')),
  created_at timestamptz not null default now()
);
create table public.records (
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.sessions(id),
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  ended_at timestamptz not null,
  primary key (user_id,session_id)
);
create index records_user_recent on public.records(user_id,ended_at desc);
create index sessions_active on public.sessions(created_at) where status='active';
alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.records enable row level security;
create policy "Read own profile" on public.profiles for select to authenticated using ((select auth.uid())=id);
create policy "Insert own profile" on public.profiles for insert to authenticated with check ((select auth.uid())=id);
create policy "Update own profile" on public.profiles for update to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);
create policy "Read own results" on public.records for select to authenticated using ((select auth.uid())=user_id);
create policy "Read own session" on public.sessions for select to authenticated using ((select auth.uid())=any(user_ids));
revoke all on public.records,public.sessions from anon,authenticated;
grant select on public.records,public.sessions to authenticated;
grant select,insert,update on public.profiles to authenticated;
-- Code content and daily order are immutable versioned application data. They do
-- not require browser table writes or a daily cron. Seed: date:language:version.
create view public.daily_activity with (security_invoker=true) as
select distinct user_id,result->>'date' as day from public.records
where result->>'dailyComplete'='true';
grant select on public.daily_activity to authenticated;

-- Keep lifetime personal bests independent of the recent-history page limit.
create view public.personal_bests with (security_invoker=true) as
select distinct on (user_id,result->>'mode',result->>'language',result->>'difficulty',result->>'duration',result->>'version')
 user_id,result
from public.records
where result->>'mode'='speed' or (result->>'mode'='daily' and result->>'date'=to_char(now() at time zone 'Asia/Seoul','YYYY-MM-DD'))
order by user_id,result->>'mode',result->>'language',result->>'difficulty',result->>'duration',result->>'version',
 (result->>'cpm')::numeric desc,(result->>'accuracy')::numeric desc nulls last;
grant select on public.personal_bests to authenticated;
