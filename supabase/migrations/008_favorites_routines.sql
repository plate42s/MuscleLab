-- Favoritos de ejercicio + rutinas guardadas (plantillas de sesión)

create table if not exists public.exercise_favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

create index if not exists exercise_favorites_user_idx
  on public.exercise_favorites (user_id);

alter table public.exercise_favorites enable row level security;

create policy "exercise_favorites_select_own"
  on public.exercise_favorites for select
  using (auth.uid() = user_id);

create policy "exercise_favorites_insert_own"
  on public.exercise_favorites for insert
  with check (auth.uid() = user_id);

create policy "exercise_favorites_delete_own"
  on public.exercise_favorites for delete
  using (auth.uid() = user_id);

-- Rutinas (plantillas) del usuario
create table if not exists public.workout_routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  notes text,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workout_routines_user_idx
  on public.workout_routines (user_id, updated_at desc);

alter table public.workout_routines enable row level security;

create policy "workout_routines_select_own"
  on public.workout_routines for select
  using (auth.uid() = user_id);

create policy "workout_routines_insert_own"
  on public.workout_routines for insert
  with check (auth.uid() = user_id);

create policy "workout_routines_update_own"
  on public.workout_routines for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "workout_routines_delete_own"
  on public.workout_routines for delete
  using (auth.uid() = user_id);

-- Ítems de rutina: ejercicio + series plantilla (jsonb)
create table if not exists public.workout_routine_items (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.workout_routines (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  sort_index integer not null check (sort_index > 0),
  -- [{reps, weight_kg, duration_sec, rpe}] valores como texto/número opcionales
  sets jsonb not null default '[]'::jsonb
);

create index if not exists workout_routine_items_routine_idx
  on public.workout_routine_items (routine_id, sort_index);

alter table public.workout_routine_items enable row level security;

create policy "workout_routine_items_select_own"
  on public.workout_routine_items for select
  using (
    exists (
      select 1 from public.workout_routines r
      where r.id = routine_id and r.user_id = auth.uid()
    )
  );

create policy "workout_routine_items_insert_own"
  on public.workout_routine_items for insert
  with check (
    exists (
      select 1 from public.workout_routines r
      where r.id = routine_id and r.user_id = auth.uid()
    )
  );

create policy "workout_routine_items_update_own"
  on public.workout_routine_items for update
  using (
    exists (
      select 1 from public.workout_routines r
      where r.id = routine_id and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workout_routines r
      where r.id = routine_id and r.user_id = auth.uid()
    )
  );

create policy "workout_routine_items_delete_own"
  on public.workout_routine_items for delete
  using (
    exists (
      select 1 from public.workout_routines r
      where r.id = routine_id and r.user_id = auth.uid()
    )
  );
