-- Calendario semanal: día → rutina del usuario (0=domingo … 6=sábado, como Date#getDay)

create table if not exists public.routine_schedule (
  user_id uuid not null references auth.users (id) on delete cascade,
  weekday smallint not null check (weekday >= 0 and weekday <= 6),
  routine_id uuid references public.workout_routines (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (user_id, weekday)
);

create index if not exists routine_schedule_routine_idx
  on public.routine_schedule (routine_id);

alter table public.routine_schedule enable row level security;

create policy "routine_schedule_select_own"
  on public.routine_schedule for select
  using (auth.uid() = user_id);

create policy "routine_schedule_insert_own"
  on public.routine_schedule for insert
  with check (auth.uid() = user_id);

create policy "routine_schedule_update_own"
  on public.routine_schedule for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "routine_schedule_delete_own"
  on public.routine_schedule for delete
  using (auth.uid() = user_id);
