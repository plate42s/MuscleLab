-- MuscleLab F3: registro de comida (kcal + macros básicos)

create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  eaten_at timestamptz not null default now(),
  name text not null,
  calories integer,
  protein_g numeric(6, 1),
  carbs_g numeric(6, 1),
  fat_g numeric(6, 1),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists food_logs_user_eaten_idx
  on public.food_logs (user_id, eaten_at desc);

alter table public.food_logs enable row level security;

create policy "food_logs_select_own"
  on public.food_logs for select
  using (auth.uid() = user_id);

create policy "food_logs_insert_own"
  on public.food_logs for insert
  with check (auth.uid() = user_id);

create policy "food_logs_update_own"
  on public.food_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "food_logs_delete_own"
  on public.food_logs for delete
  using (auth.uid() = user_id);
