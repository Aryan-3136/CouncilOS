create extension if not exists pgcrypto;

create type public.team_status as enum ('active', 'planning', 'on_hold');
create type public.project_priority as enum ('high', 'medium', 'low');
create type public.project_status as enum ('planning', 'active', 'completed', 'on_hold');
create type public.task_priority as enum ('urgent', 'high', 'medium', 'low');
create type public.task_status as enum ('todo', 'in_progress', 'done');

create table public.teams (
  id uuid primary key default gen_random_uuid(), name text not null unique check (char_length(trim(name)) > 0), description text not null default '', members text not null default '', responsibilities text not null default '', current_projects text not null default '', status public.team_status not null default 'active', notes text not null default '', color text not null default 'cyan' check (color in ('cyan', 'blue', 'purple', 'amber', 'rose', 'emerald')), icon text not null default 'layers' check (icon in ('layers', 'sparkles', 'users', 'flag', 'heart', 'book')), archived boolean not null default false, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);
create table public.projects (
  id uuid primary key default gen_random_uuid(), name text not null unique check (char_length(trim(name)) > 0), description text not null default '', team_id uuid references public.teams(id) on delete set null, priority public.project_priority not null default 'medium', status public.project_status not null default 'planning', progress smallint not null default 0 check (progress between 0 and 100), start_date date, deadline date, milestones text not null default '', risks text not null default '', notes text not null default '', archived boolean not null default false, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(), title text not null check (char_length(trim(title)) > 0), description text not null default '', project_id uuid references public.projects(id) on delete set null, team_id uuid references public.teams(id) on delete set null, priority public.task_priority not null default 'medium', status public.task_status not null default 'todo', due_date date, reminder timestamptz, recurring text not null default '', estimated_time text not null default '', notes text not null default '', tags text not null default '', archived boolean not null default false, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);

create index teams_active_updated_idx on public.teams (updated_at desc) where not archived;
create index projects_active_updated_idx on public.projects (updated_at desc) where not archived;
create index projects_team_idx on public.projects (team_id) where not archived;
create index tasks_active_updated_idx on public.tasks (updated_at desc) where not archived;
create index tasks_team_idx on public.tasks (team_id) where not archived;
create index tasks_project_idx on public.tasks (project_id) where not archived;
create index tasks_due_date_idx on public.tasks (due_date) where not archived and status <> 'done';

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;
create trigger teams_set_updated_at before update on public.teams for each row execute function public.set_updated_at();
create trigger projects_set_updated_at before update on public.projects for each row execute function public.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks for each row execute function public.set_updated_at();
alter table public.teams enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
