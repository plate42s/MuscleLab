-- MuscleLab F1: exercises, workouts, workout_sets + RLS

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  modality text not null check (modality in ('calistenia', 'gym', 'core', 'cardio')),
  muscle_group text not null,
  load_type text not null check (load_type in ('reps', 'reps_weight', 'time')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists exercises_modality_idx on public.exercises (modality);
create index if not exists exercises_muscle_group_idx on public.exercises (muscle_group);

alter table public.exercises enable row level security;

create policy "exercises_select_authenticated"
  on public.exercises for select
  to authenticated
  using (is_active = true);

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  performed_at timestamptz not null default now(),
  title text,
  notes text,
  duration_min integer,
  created_at timestamptz not null default now()
);

create index if not exists workouts_user_performed_idx
  on public.workouts (user_id, performed_at desc);

alter table public.workouts enable row level security;

create policy "workouts_select_own"
  on public.workouts for select
  using (auth.uid() = user_id);

create policy "workouts_insert_own"
  on public.workouts for insert
  with check (auth.uid() = user_id);

create policy "workouts_update_own"
  on public.workouts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "workouts_delete_own"
  on public.workouts for delete
  using (auth.uid() = user_id);

create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  set_index integer not null check (set_index > 0),
  reps integer,
  weight_kg numeric(6, 2),
  duration_sec integer,
  rpe numeric(3, 1),
  notes text
);

create index if not exists workout_sets_workout_idx on public.workout_sets (workout_id);

alter table public.workout_sets enable row level security;

create policy "workout_sets_select_own"
  on public.workout_sets for select
  using (
    exists (
      select 1 from public.workouts w
      where w.id = workout_id and w.user_id = auth.uid()
    )
  );

create policy "workout_sets_insert_own"
  on public.workout_sets for insert
  with check (
    exists (
      select 1 from public.workouts w
      where w.id = workout_id and w.user_id = auth.uid()
    )
  );

create policy "workout_sets_update_own"
  on public.workout_sets for update
  using (
    exists (
      select 1 from public.workouts w
      where w.id = workout_id and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workouts w
      where w.id = workout_id and w.user_id = auth.uid()
    )
  );

create policy "workout_sets_delete_own"
  on public.workout_sets for delete
  using (
    exists (
      select 1 from public.workouts w
      where w.id = workout_id and w.user_id = auth.uid()
    )
  );
