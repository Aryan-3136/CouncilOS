alter table public.tasks add column goal_id uuid references public.goals(id) on delete set null;
create index tasks_goal_idx on public.tasks (goal_id) where goal_id is not null;
