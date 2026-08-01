create type public.event_status as enum ('draft', 'planned', 'completed', 'cancelled');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) > 0),
  description text not null default '',
  start_at timestamptz not null,
  end_at timestamptz,
  venue text not null default '',
  budget numeric(12,2),
  status public.event_status not null default 'planned',
  preparation_checklist text not null default '',
  notes text not null default '',
  team_id uuid references public.teams(id) on delete set null,
  archived boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (end_at is null or end_at >= start_at)
);

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) > 0),
  scheduled_at timestamptz not null,
  duration_minutes smallint not null default 60 check (duration_minutes between 1 and 1440),
  location_or_link text not null default '',
  agenda text not null default '',
  discussion text not null default '',
  decisions text not null default '',
  action_items text not null default '',
  follow_ups text not null default '',
  notes text not null default '',
  team_id uuid references public.teams(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  archived boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) > 0),
  content text not null default '',
  category text not null default 'general',
  tags text not null default '',
  pinned boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index events_active_start_at_idx on public.events (start_at asc) where not archived;
create index events_team_idx on public.events (team_id) where not archived;
create index meetings_active_scheduled_at_idx on public.meetings (scheduled_at desc) where not archived;
create index meetings_team_idx on public.meetings (team_id) where not archived;
create index meetings_project_idx on public.meetings (project_id) where not archived;
create index notes_active_updated_at_idx on public.notes (updated_at desc) where not archived;
create index notes_category_idx on public.notes (category) where not archived;

create trigger events_set_updated_at before update on public.events for each row execute function public.set_updated_at();
create trigger meetings_set_updated_at before update on public.meetings for each row execute function public.set_updated_at();
create trigger notes_set_updated_at before update on public.notes for each row execute function public.set_updated_at();

alter table public.events enable row level security;
alter table public.meetings enable row level security;
alter table public.notes enable row level security;
