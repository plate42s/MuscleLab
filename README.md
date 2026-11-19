# MuscleLab

Aplicación web (móvil primero + desktop) para medir progreso en **calistenia y gym**, registrar **comida** (kcal/macros) y **medidas corporales**, con panel **admin** para gestionar usuarios.

- **Repo:** https://github.com/plate42s/MuscleLab  
- **Prod:** https://musclelab-lab.netlify.app  
- **Idioma UI:** español  

---

## Índice

1. [Qué es](#qué-es)  
2. [Stack](#stack)  
3. [Funcionalidades](#funcionalidades)  
4. [Módulos (manual rápido)](#módulos-manual-rápido)  
5. [Autenticación](#autenticación)  
6. [Base de datos](#base-de-datos)  
7. [Estructura del proyecto](#estructura-del-proyecto)  
8. [Variables de entorno](#variables-de-entorno)  
9. [Arranque local](#arranque-local)  
10. [Supabase (SQL)](#supabase-sql)  
11. [Deploy Netlify](#deploy-netlify)  
12. [Admin · CRUD usuarios](#admin--crud-usuarios)  
13. [Roadmap](#roadmap)  

---

## Qué es

MuscleLab nace como tracker personal y grupo de prueba:

- Registrar entrenos de forma rápida  
- Ver si hay progreso real (historial, PRs, rachas, volumen)  
- Llevar nutrición básica (calorías y macros)  
- Medidas corporales simples  
- Solo el **admin** da de alta usuarios (sin registro público)  

La **IA (Coach)** está prevista como F4 y **no está implementada** hasta que se indique.

---

## Stack

| Capa | Tecnología | Versión / nota |
|---|---|---|
| Front | React + TypeScript + Vite | React 18 · TS 5.6 · Vite 5.4 |
| Estilos | Tailwind CSS | 3.4 |
| Rutas | React Router | 6 |
| Backend / Auth / DB | Supabase | Auth + PostgreSQL + RLS |
| Deploy | Netlify | SPA + Functions |
| Admin API | Netlify Function | `admin-users` |

---

## Funcionalidades

### Hecho (F0–F3 + Admin)

| Área | Detalle |
|---|---|
| Auth | Login por **usuario** (sin registro público) |
| Perfil | Objetivo, nivel, modalidad, peso, objetivo kcal/día |
| Entrenar | Sesiones, series, reps/peso/tiempo, RPE |
| Catálogo | Ejercicios calistenia + gym + core (seed) |
| Progreso | Historial, detalle, PRs, rachas, volumen semanal |
| Medidas | Peso, cintura, pecho, brazo |
| Comida | Log diario + kcal + macros + vs objetivo |
| Admin | CRUD usuarios (solo `role = admin`) |
| UI | Layout móvil (bottom nav) + desktop (sidebar) |
| Tema | Paleta burdeos / crema / dorado |

### Pendiente

- F4 Coach IA (rutina base / ajuste de sesión / resumen)  
- Pulido fino de diseño móvil/desktop  
- PWA offline avanzada  

---

## Módulos (manual rápido)

### Hoy
Resumen del día, acceso rápido a entrenar, enlaces a Comida y placeholder de Coach.

### Entrenar
1. **Empezar sesión**  
2. Título / notas (opcionales)  
3. **+ Añadir ejercicio** (buscar / filtrar catálogo)  
4. Capturar series según tipo:
   - `reps` → repeticiones  
   - `reps_weight` → reps + kg  
   - `time` → segundos  
5. **RPE** (1–10, opcional): esfuerzo percibido  
6. **+ Serie** / **Duplicar última** / **Quitar**  
7. **Terminar sesión** → guarda en DB y abre el detalle  

> Hasta “Terminar sesión” los datos solo viven en pantalla.

### Progreso
- Racha de días  
- Sesiones y series de la semana  
- Gráfico de volumen semanal  
- Tabla de PRs  
- Medidas corporales  
- Historial de sesiones  

### Comida
- Registrar comida (nombre, hora, kcal, proteína/carbs/grasa)  
- Totales del día vs objetivo kcal (definido en Perfil)  
- Eliminar registros del día  

### Perfil
Datos del atleta + objetivo kcal/día + cerrar sesión.

### Usuarios (solo admin)
Crear / editar / eliminar cuentas del grupo de prueba.

### Coach
Placeholder (“Próximamente” / F4).

---

## Autenticación

- No hay registro público en la UI.  
- Login por **usuario** (no por correo en la interfaz).  
- Por debajo Supabase Auth mapea a un email interno del dominio del proyecto.  
- Roles en `profiles.role`: `admin` | `user`  

> **Seguridad:** no documentes ni subas a Git contraseñas, API keys reales ni service role. Las cuentas se crean solo desde el panel admin o de forma privada.

---

## Base de datos

Migraciones en `supabase/migrations/` (ejecutar en orden):

| Archivo | Contenido |
|---|---|
| `001_f0_profiles.sql` | `profiles` + trigger al registrarse + RLS |
| `002_f1_workouts.sql` | `exercises`, `workouts`, `workout_sets` + RLS |
| `seed.sql` | Catálogo inicial de ejercicios |
| `003_admin_role.sql` | columnas `username`, `role` |
| `004_f2_body_metrics.sql` | `body_metrics` + RLS |
| `005_f3_food_logs.sql` | `food_logs` + RLS |
| `006_admin_profiles_rls.sql` | `is_admin()` + políticas admin |

Tablas principales:

- `profiles`  
- `exercises`  
- `workouts` / `workout_sets`  
- `body_metrics`  
- `food_logs`  

---

## Estructura del proyecto

```text
MuscleLab/
├── netlify/
│   └── functions/
│       └── admin-users.mjs      # CRUD usuarios (service role)
├── public/
├── src/
│   ├── components/              # Layout, pickers, rutas protegidas
│   ├── context/AuthContext.tsx
│   ├── lib/                     # supabase, stats, adminApi, auth
│   ├── pages/                   # Hoy, Entrenar, Progreso, Comida, etc.
│   ├── types/database.ts
│   ├── App.tsx
│   └── index.css                # tema / utilidades UI
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── netlify.toml
├── .env.example
└── package.json
```

---

## Variables de entorno

### Local (`.env`)

Usa `.env.example` como plantilla (solo placeholders):

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

### Netlify (Environment variables)

| Variable | Uso |
|---|---|
| `VITE_SUPABASE_URL` | Front (build) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Front (build) |
| `SUPABASE_URL` | Function admin |
| `SUPABASE_PUBLISHABLE_KEY` | Function admin |
| `SUPABASE_SERVICE_ROLE_KEY` | Function admin (**secret**; nunca en el navegador) |

Reglas:

- Nunca subas `.env` a Git (ya está en `.gitignore`).  
- Nunca uses prefijo `VITE_` con la secret / service role.  
- No pegues keys reales en el README ni en issues.  
- Si cambias `VITE_*`, haz **Redeploy** (se incrustan en el build).  

---

## Arranque local

```bash
cd ~/Projects/MuscleLab
cp .env.example .env
# Completa VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY

npm install
npm run dev
```

Abre: http://localhost:5173/

Otros scripts:

```bash
npm run build    # build producción
npm run preview  # previsualizar dist
npm run lint     # ESLint
```

> Crear/eliminar usuarios desde el panel admin en local requiere `netlify dev` (la Function). Con `npm run dev` sí puedes listar usuarios vía RLS.

---

## Supabase (SQL)

1. Crea un proyecto en [supabase.com](https://supabase.com).  
2. En **SQL Editor**, ejecuta en este orden los archivos de `supabase/migrations/` + `seed.sql` (ver tabla arriba).  
3. Auth Email activo; para pruebas conviene desactivar confirmación de email.  
4. Copia URL + publishable key.  

---

## Deploy Netlify

Configuración en `netlify.toml`:

- Build: `npm run build`  
- Publish: `dist`  
- Functions: `netlify/functions`  
- Node: `22`  
- Redirect SPA: `/* → /index.html`  

Pasos:

1. Push a GitHub (`plate42s/MuscleLab`).  
2. Importar el repo en Netlify.  
3. Cargar variables de entorno (tabla de arriba).  
4. Deploy / Redeploy.  

---

## Admin · CRUD usuarios

- Menú **Usuarios** visible solo si `profiles.role = admin`.  
- Operaciones Create / Update / Delete vía Function:  
  `/.netlify/functions/admin-users`  
- Requiere `SUPABASE_SERVICE_ROLE_KEY` en Netlify.  
- No puedes eliminarte ni quitarte el rol admin a ti mismo.  

---

## Roadmap

| Fase | Estado |
|---|---|
| F0 Cimientos (auth, layout) | Hecho |
| F1 Entrenar + historial | Hecho |
| F2 PRs, rachas, gráficas, medidas | Hecho |
| F3 Comida + kcal/macros | Hecho |
| Admin CRUD usuarios | Hecho |
| Deploy Netlify | Hecho |
| F4 Coach IA | Pendiente (bajo demanda) |
| Pulido UX móvil/desktop | Pendiente |

---

## Notas

- Disclaimer: la app no sustituye consejo médico ni nutricional profesional.  
- Pensada primero para uso personal / grupo pequeño de prueba.  
- Paleta v1 (dark): bg `#111315`, surface `#191C20`, elevated `#22272D`, border `#30363D`, primary `#F07835`, text `#F3F4F0`, muted `#A3ABB4`, estados success/warning/danger/info.  

## Seguridad (checklist)

- [ ] `.env` no está en el repo  
- [ ] No hay passwords ni keys reales en README / código  
- [ ] Secret key solo en Netlify (marcada como secret)  
- [ ] RLS activo en tablas de usuario  
- [ ] Registro público deshabilitado en la UI  
