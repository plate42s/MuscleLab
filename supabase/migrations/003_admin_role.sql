-- Rol y username en perfiles (admin de prueba)

alter table public.profiles
  add column if not exists username text,
  add column if not exists role text not null default 'user';

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'user'));

create unique index if not exists profiles_username_unique
  on public.profiles (username)
  where username is not null;

-- Tras crear el usuario admin en Auth, ejecuta (ajusta si cambias el email):
-- update public.profiles
-- set username = 'admin',
--     role = 'admin',
--     display_name = 'Admin'
-- where id = (select id from auth.users where email = 'admin@musclelab.local');
