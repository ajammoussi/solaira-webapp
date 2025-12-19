# Frontend API Guide (ready for calls)

Use these JSON endpoints to show predictions, decisions, history, anomalies, and to trigger runs. Serve via FastAPI (`backend/api.py`) or mirror in Next.js API routes.
## Quick start (fresh clone)
- Create venv & install deps: `python -m venv backend/.venv && .\backend\.venv\Scripts\Activate.ps1 && pip install -r backend/requirements.txt`
- Init SQLite DB (one time): `python backend/scripts/init_sqlite.py` (creates `database/energy.db` and tables)
- Run API: `python -m uvicorn backend.api:app --port 8000`
- Call endpoints below. For SOC/location overrides, use `POST /run-orchestrator` with JSON payload.

## Base URLs
- FastAPI local: `http://localhost:8000`
- Next.js proxy (if you wrap): `http://localhost:3000/api/energy/*`

## Data Endpoints
- `GET /predictions` → latest predictions
  - Shape:
    ```json
    {
      "date": "2025-12-17",
      "pv": [{"panel_id":1,"value":1.74,"error_margin":0.15}],
      "wind_tree": {"value":4.26,"error_margin":0.08},
      "consumption": {"value":6.44,"error_margin":0.50}
    }
    ```

- `GET /decisions` → latest Phase 2 decisions
  ```json
  {
    "decision_date": "2025-12-17",
    "sources": {"pv":{"activate":false}, "wind_tree":{"activate":true}},
    "battery": {"bilan_kwh": -3.45, "estimated_soc_percent": 15.5, "action": "import"},
    "microgrid": {"action": "import", "power_kw": 0},
    "appliances": [ ... ],
    "alerts": ["Battery below 20% ..."]
  }
  ```

- `GET /status` → health + latest timestamps
  ```json
  {"status":"ok","last_prediction":"2025-12-17","last_decision":"2025-12-17"}
  ```

- `GET /history?days=7` → historic actuals for charts (pv, wind, consumption)
  - Use to plot kWh per day. Default 7 days.

- `GET /anomalies?days=7` → detected PV anomalies for recent days.

## Setup/Config
- Battery SOC override per run: set `CURRENT_BATTERY_SOC` via `POST /run-orchestrator` payload.
- Vacation consumption coefficient: env `VACATION_COEFFICIENT` (default 0.6). When tomorrow is inside a vacation window, consumption prediction is multiplied by this value.
- Location defaults can be overridden per run with `latitude`/`longitude`/`location_name` in `POST /run-orchestrator`.

## Mutating Endpoints (manage user context)
- `POST /appliances`
  ```json
  { "name": "Washer", "power_kwh": 2.5, "is_schedulable": true }
  ```
- `POST /weekly-actions`
  ```json
  { "name": "Laundry", "power_kwh": 2.0, "preferred_time": "10:00", "week_start": "2025-12-15", "week_end": "2025-12-21" }
  ```
- `POST /vacations`
  ```json
  { "start_date": "2025-12-20", "end_date": "2025-12-27" }
  ```
- `POST /actions` → capture user intent; stores raw payload.

## Control Endpoints (on-demand runs)
- `POST /run-orchestrator` → triggers a non-blocking daily pipeline run. Returns `{status, pid, env}`.
  - Optional payload:
    ```json
    {
      "battery_soc": 42.5,
      "latitude": 36.80,
      "longitude": 10.18,
      "location_name": "Tunis"
    }
    ```
  - These values are passed as env vars for that run only (CURRENT_BATTERY_SOC, LATITUDE, LONGITUDE, LOCATION_NAME).
- `POST /run-continuous-learning` → triggers monthly evaluation. Returns `{status, pid}`.

## How to call (examples)
```bash
# Predictions
curl http://localhost:8000/predictions

# Decisions
curl http://localhost:8000/decisions

# History last 14 days
curl "http://localhost:8000/history?days=14"

# Trigger a run with overrides
curl -X POST http://localhost:8000/run-orchestrator \
  -H "Content-Type: application/json" \
  -d '{"battery_soc":42.5, "latitude":36.8, "longitude":10.2, "location_name":"Tunis"}'

# Add an appliance
curl -X POST http://localhost:8000/appliances \
  -H "Content-Type: application/json" \
  -d '{"name":"Washer","power_kwh":2.5,"is_schedulable":true}'

# Add a weekly action
curl -X POST http://localhost:8000/weekly-actions \
  -H "Content-Type: application/json" \
  -d '{"name":"Laundry","power_kwh":2.0,"preferred_time":"10:00","week_start":"2025-12-15","week_end":"2025-12-21"}'

# Add a vacation window (activates VACATION_COEFFICIENT)
curl -X POST http://localhost:8000/vacations \
  -H "Content-Type: application/json" \
  -d '{"start_date":"2025-12-20","end_date":"2025-12-27"}'
```

## Frontend usage ideas
- Charts: use `/history` for trend lines; overlay decisions/alerts from `/decisions`.
- Cards: pull `/status` for freshness stamps; `/predictions` for headline kWh.
- Alerts panel: surface `alerts` array from `/decisions`.
- Actions: POST `/actions` (already in `backend/api.py`) with user intents; render confirmation.
- User machines/schedules: POST `/appliances` then `/weekly-actions` to reflect schedulable loads that the decision engine can consider.
- Vacation mode: POST `/vacations` (tomorrow in range) to scale consumption by `VACATION_COEFFICIENT` (default 0.6) for that run.

## Configuration knobs
- Location (lat/lon) for weather/forecast: set env vars `LATITUDE`, `LONGITUDE`, `LOCATION_NAME` or edit `backend/config.py` defaults.
- Scheduling: use OS scheduler (Task Scheduler/cron/k8s CronJob) to call
  - Daily: `python -m backend.orchestrator`
  - Monthly: `python -m backend.continuous_learning`
  You can also hit `/run-orchestrator` and `/run-continuous-learning` for manual triggers.

## Error handling
- Responses are JSON. Suggested error shape: `{ "error": "message" }` with proper HTTP codes.
- Missing data may yield `404` on predictions/decisions.
