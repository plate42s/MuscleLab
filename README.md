# MuscleLab

App web (móvil primero) para registrar entrenamientos de calistenia y gym, ver historial y, más adelante, nutrición básica + coach IA.

## Stack (F0–F1)

- React 18 + Vite 5 + TypeScript 5
- Tailwind CSS 3.4
- React Router 6
- Supabase (Auth + PostgreSQL)

## Arranque local

```bash
cp .env.example .env
# Edita VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

## Supabase (obligatorio)

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, ejecuta en orden:
   - `supabase/migrations/001_f0_profiles.sql`
   - `supabase/migrations/002_f1_workouts.sql`
   - `supabase/seed.sql`
   - `supabase/migrations/003_admin_role.sql`
   - `supabase/migrations/004_f2_body_metrics.sql`
   - `supabase/migrations/005_f3_food_logs.sql`
3. Auth: login por usuario (mapeado a `usuario@musclelab.local`).
4. Copia URL + publishable key a `.env`.

## Qué incluye F0–F3

- Login por usuario (sin registro público)
- Perfil + rol admin básico + objetivo kcal
- Layout móvil (bottom nav) + web (sidebar)
- Catálogo mixto + log de sesión
- Historial, PRs, rachas, volumen semanal
- Medidas corporales
- Comida: kcal + macros + totales del día

## Deploy en Netlify

1. Sube el repo a GitHub (si aún no tiene remote).
2. En [Netlify](https://app.netlify.com): **Add new site → Import an existing project**.
3. Build settings (ya vienen en `netlify.toml`):
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. **Environment variables** (Site settings → Environment variables):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
5. Deploy. Las rutas SPA ya redirigen a `index.html`.

> Las variables `VITE_*` se incrustan en el build: si las cambias, hay que **Redeploy**.

## Próximo

- F4: coach IA (cuando lo indiques)
- Pulido diseño móvil/desktop
- Alta de usuarios por admin
