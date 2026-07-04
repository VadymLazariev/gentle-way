# Gentle Way — 52-Week Training App

Gentle Way is a personal, single-user web app for running a 52-week Judo strength & conditioning program. Browse the full annual plan, see exactly what to train today, log your sets, and track progress over time. Program content is derived from the source `.xlsx` workbooks and seeded into a local Supabase database.

## Features

- **Today** — resolves the current week + weekday to the right session (Day A / Day C / Day B, or a judo/recovery day) and lets you log sets inline.
- **Program** — the full 52-week map: weekly rhythm, all 5 blocks with per-week grids (current week and deload weeks highlighted), and global rules. Drill into any week to see day sessions, prescriptions, progression rules, and the exercise library.
- **Logbook** — every logged set, grouped by date, with edit/delete.
- **Progress** — per-exercise charts for load and actual RPE, plus quick stats.
- **Settings** — set the program start date (Week 1 anchor) or manually pin the current week.

## Stack

- Vite + React + TypeScript
- TanStack Query (data fetching/caching) over `@supabase/supabase-js`
- Zod (env + form validation), React Hook Form (forms)
- Tailwind CSS v4, Recharts, lucide-react
- Local Supabase (Postgres) for data
- `axios` is available for any external (non-Supabase) calls

## Prerequisites

- Node.js 20+
- Docker (running) — required by the Supabase local stack
- Supabase CLI (`brew install supabase/tap/supabase`)

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Start the local Supabase stack (Postgres, REST, Studio, ...)
supabase start

# 3. Apply the schema + seed the 52-week program data
npm run db:reset

# 4. Configure environment
cp .env.example .env
# Fill in the values from `supabase status`:
#   VITE_SUPABASE_URL      -> Project URL (e.g. http://127.0.0.1:55521)
#   VITE_SUPABASE_ANON_KEY -> Publishable key (sb_publishable_...)

# 5. Run the app
npm run dev
```

Then open the URL Vite prints (default http://localhost:5173).

> This project uses a non-default Supabase port range (`555xx`) to avoid colliding with other local Supabase projects. Ports live in `supabase/config.toml`. Run `supabase status` to see the actual URLs/keys for your machine.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run oxlint |
| `npm run seed:gen` | Regenerate `supabase/seed.sql` from the workbooks in `data/source` |
| `npm run db:reset` | Recreate the database from migrations + seed |
| `npm run db:types` | Regenerate `src/lib/database.types.ts` from the local DB |

## Data pipeline

Source workbooks live in `data/source/` (`00` overview + `01`–`05` blocks). The dev-only script [`scripts/generate-seed.ts`](scripts/generate-seed.ts) parses them and writes deterministic inserts to `supabase/seed.sql`. To refresh program content after editing a workbook:

```bash
npm run seed:gen
npm run db:reset
npm run db:types   # only if the schema changed
```

## Project structure

```
data/source/            Source .xlsx workbooks
scripts/generate-seed.ts  Workbook -> supabase/seed.sql
supabase/
  config.toml           Local Supabase config (ports)
  migrations/           Schema (0001_init.sql)
  seed.sql              Generated program data
src/
  api/                  TanStack Query hooks (program, logs, settings)
  components/           UI primitives + shared components
  features/             today / program / logbook / progress / settings
  lib/                  supabase client, env, types, program helpers
```

## Data model

| Table | Purpose |
| --- | --- |
| `blocks` | The 5 training blocks (weeks, goal, day focuses) |
| `program_weeks` | Per-week focus, main work, hard sets, main RPE |
| `prescriptions` | Every week/day/exercise prescription |
| `exercise_library` | Per-block exercise reference |
| `progression_rules` | Per-block progression rules |
| `global_rules` | Annual global rules |
| `weekly_calendar` | Weekly training rhythm |
| `session_logs` | Your logged sets (writable) |
| `app_settings` | Singleton: program start date / current week |

## Security note

This app is designed for **local, single-user** use with no authentication. Row Level Security is enabled but policies are intentionally permissive so the anon key can read program data and read/write your logs. Do not expose this database publicly or deploy it as-is to a shared environment.
