-- MuscleLab F2: medidas corporales

create table if not exists public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  recorded_at timestamptz not null default now(),
  weight_kg numeric(5, 2),
  waist_cm numeric(5, 1),
  chest_cm numeric(5, 1),
  arm_cm numeric(5, 1),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists body_metrics_user_recorded_idx
  on public.body_metrics (user_id, recorded_at desc);

alter table public.body_metrics enable row level security;

create policy "body_metrics_select_own"
  on public.body_metrics for select
  using (auth.uid() = user_id);

create policy "body_metrics_insert_own"
  on public.body_metrics for insert
  with check (auth.uid() = user_id);

create policy "body_metrics_update_own"
  on public.body_metrics for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "body_metrics_delete_own"
  on public.body_metrics for delete
  using (auth.uid() = user_id);
