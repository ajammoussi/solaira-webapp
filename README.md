# Solaira

Solar energy management platform: a **Next.js frontend** for monitoring and
configuring a home PV + battery installation, and a **Python FastAPI backend**
for forecasting, simulation and predictive maintenance.

Two Python services run side by side:

| Service | Port | Entry point | Responsibility |
| --- | --- | --- | --- |
| Main API | `8001` | `backend/main.py` | Forecasting, energy simulation, PV monitoring, chatbot |
| Solar forecast | `8002` | `backend/models/quartz-solar-forecast` | 48-hour PV generation forecast (vendor: Quartz) |

The database and authentication are **Supabase** (Postgres + Auth), used directly
by the browser. The Python services never touch the database.

---

## Quick start

```bash
# 1. Configure the environment
cp .env.example .env.local        # Windows: copy .env.example .env.local
# then fill in your Supabase URL / anon key

# 2. Frontend (http://localhost:3000)
npm ci
npm run dev

# 3. Backend (http://localhost:8001 and :8002)
py -3.10 -m venv backend/.venv
backend/.venv/Scripts/activate     # Windows
pip install -r backend/requirements.txt
python backend/start.py
```

Requirements: **Node 18+** (see `.nvmrc`), **Python 3.10+**.

---

## Repository map

```
pages/            Next.js routes (Pages Router) — app + marketing
components/       Reusable React components + CSS modules
lib/
  config/         Env access, constants, solar-system catalogue
  api/            HTTP clients for the Python services
  auth/           API-route auth middleware
  hooks/          React hooks (data layer)
  utils/          Pure helpers (CSV parsing, CO2 math)
backend/
  main.py         FastAPI app — the endpoints the frontend consumes
  core/           phase_1 (training) · phase_2 (simulation) · phase_3 (monitoring)
  chatbot/        Support agent (langchain + Cerebras)
  models/         Trained artifacts + vendored Quartz forecast service
  tests/          pytest suite
tests/            Jest suite (unit, hooks, components, api)
database/         Supabase schema + seed SQL
docs/             Detailed documentation (see below)
```

---

## Documentation

| Document | What it covers |
| --- | --- |
| [docs/architecture.md](docs/architecture.md) | How the pieces fit; the full request/data flow |
| [docs/frontend.md](docs/frontend.md) | Pages, providers, hooks, components, styling |
| [docs/backend.md](docs/backend.md) | Services, modules, data sources, known gaps |
| [docs/api.md](docs/api.md) | Endpoint contracts with examples |
| [docs/environment.md](docs/environment.md) | Every env variable and its default |
| [docs/authentication.md](docs/authentication.md) | Supabase auth, RLS, guest mode |
| [docs/testing.md](docs/testing.md) | How to run both test suites |

Contributing: [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Endpoints the frontend actually uses

```
POST :8001/energy-simulation    24h PV+wind+battery simulation
POST :8001/maintenance          performance-ratio / fault analysis
POST :8001/api/chat             chatbot
POST :8001/api/pv-systems/configure      configure monitored systems
POST :8001/api/pv-systems/monitoring     start / stop monitoring
GET  :8001/api/pv-systems/status         current status (polled)
GET  :8001/api/pv-systems/{id}/history   historical series
POST :8002/forecast/            via the Next.js proxy /api/solar-forecast
GET  /api/csv/{file}            CSV fixtures served by the Next.js route
```

Anything else in `backend/` is offline training tooling or unused, and is
documented as such in [docs/backend.md](docs/backend.md).

---

## License

MIT — see [LICENSE](LICENSE).
