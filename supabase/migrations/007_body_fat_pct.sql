-- Grasa corporal (%) — valor actual en perfil + historial en body_metrics

alter table public.profiles
  add column if not exists body_fat_pct numeric(4, 1);

alter table public.body_metrics
  add column if not exists body_fat_pct numeric(4, 1);

comment on column public.profiles.body_fat_pct is 'Grasa corporal actual del usuario (%)';
comment on column public.body_metrics.body_fat_pct is 'Grasa corporal registrada en la medición (%)';
