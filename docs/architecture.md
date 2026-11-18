# Architecture

## Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│ Browser                                                             │
│                                                                     │
│  Next.js 12 (Pages Router)                                          │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ _app.js: NextIntlProvider > AuthProvider > GlobalProvider    │   │
│  │         + SolarSetupModal + SolarChatbot (global mounts)      │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Supabase JS client ─────────────► Supabase (Postgres + Auth)       │
└──────────────┬───────────────────────────────┬──────────────────────┘
               │                               │
               │ fetch                         │ axios
               ▼                               ▼
┌──────────────────────────────┐  ┌──────────────────────────────────┐
│ Next.js API routes           │  │ FastAPI main service  :8001      │
│  /api/csv/[...path]   → CSV  │  │  main.py                         │
│  /api/profile         → DB   │  │  core/phase_2 realtime_manager   │
│  /api/solar-forecast  → proxy│  │  core/phase_3 pv_monitor         │
└──────────────┬───────────────┘  └──────────────────────────────────┘
               │
               │ axios (server-side)
               ▼
┌──────────────────────────────┐
│ Quartz solar forecast  :8002 │
│ POST /forecast/              │
└──────────────────────────────┘
```

## Data flow per page

| Page | Primary data source |
| --- | --- |
| `/dashboard` | CSVs via `useCSVData` → `useAllEnergyData` |
| `/energy` | same CSVs, plus CO2 calculations |
| `/predictions` | `POST /energy-simulation`, `POST /maintenance`, `POST /api/solar-forecast` |
| `/maintenance` | `POST /api/pv-systems/configure` → `monitoring` → polled `status`, plus `/maintenance` |
| `/settings`, `/account` | Supabase directly + `PUT /api/profile` |
| Any page | `POST /api/chat` (the chatbot is mounted once in `_app.js`) |

## Why CSVs are the main data source

The historical and forecast series come from committed CSV fixtures under
`backend/data/csv_gen/`, one trio per panel count (`2/4/8/10/12/16` panels):

- `historical_energy_data_{n}_panels.csv`
- `hourly_forecast_{n}_panels.csv`
- `realtime_snapshots_{n}_panels.csv`

`pages/api/csv/[...path].js` serves them with a filename whitelist, and
`useCSVData` picks the trio matching `profile.current_system`. This keeps the UI
demonstrable without a live meter feed.

## Boundaries

- **Python never talks to the database.** It reads CSV fixtures and model
  artifacts, and returns JSON. Persistence (profiles, systems, batteries) is
  browser → Supabase, or browser → Next.js API route → Supabase.
- **One way to reach each service.** `lib/config/env.js` holds the base URLs;
  `lib/api/*` are the only HTTP clients.
- **Offline modules are not wired in.** `backend/core/phase_1` training code and
  the Quartz `api/v0` tree are run manually, never imported by the serving path.
  See [backend.md](backend.md#not-imported-at-runtime).
