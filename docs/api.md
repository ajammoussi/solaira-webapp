# API reference

Base URLs come from `lib/config/env.js`:

- `PYTHON_API_URL` — `NEXT_PUBLIC_PYTHON_API_URL`, default `http://localhost:8001`
- `SOLAR_FORECAST_SERVICE_URL` — default `http://localhost:8002`

Interactive docs: `http://localhost:8001/docs` (OpenAPI at `/openapi.json`).

---

## Main service (8001)

### `POST /energy-simulation`

24-hour simulation of PV, wind, consumption and battery state of charge.

```json
{ "start_time": "2025-06-01T00:00:00", "hours": 24, "initial_soc": 50, "consumption_profile": [1.2, 0.8] }
```

All fields optional. Response:

```json
{
  "status": "success",
  "simulation_data": {
    "timestamps": ["..."],
    "pv_energy_kwh": [0.0],
    "wind_energy_kwh": [0.0],
    "consumption_kwh": [0.0],
    "battery_soc_percent": [50.0],
    "deficit_kwh": [0.0],
    "wasted_energy_kwh": [0.0],
    "summary": { "total_pv_energy_kwh": 0, "min_soc_percent": 0 }
  }
}
```

### `POST /maintenance`

```json
{ "dates": ["2025-06-01"], "actual_production": [8.0], "predicted_production": [10.0] }
```

The three arrays must have equal length, otherwise `400`. Response is always
JSON-safe (no `NaN`/`Infinity`):

```json
{
  "analysis": { "status": "warning", "issues": ["Performance below normal range"], "mean_pr": 0.8 },
  "pr_history": [{ "date": "2025-06-01", "pr": 0.8 }]
}
```

`status` is one of `normal`, `warning`, `critical`, `unknown`.

### `POST /api/chat`

```json
{ "message": "How full is my battery?", "user_id": "user@example.com", "energy_data": null }
```

Response `{ "response": "...", "error": null }`. Rate limited to 10 messages per
hour per `user_id`; messages longer than 2000 characters are rejected.

### `POST /api/pv-systems/configure`

```json
{ "num_systems": 4, "capacity_per_system": 1.1 }
```

`num_systems` must be 1–20 and `capacity_per_system` 0.1–50 kW, otherwise `400`.

### `POST /api/pv-systems/monitoring`

```json
{ "action": "start", "interval_seconds": 60 }
```

`action` is `start` or `stop`; anything else is `400`.

### `GET /api/pv-systems/status`

```json
{ "timestamp": "...", "systems": [], "total_systems": 0 }
```

### `GET /api/pv-systems/{system_id}/history?hours=24`

```json
{ "system_id": 1, "hours": 24, "data_points": 24, "history": [] }
```

---

## Quartz forecast service (8002)

### `POST /forecast/`

Reached from the browser only through the Next.js proxy
`POST /api/solar-forecast`.

```json
{
  "site": { "latitude": 36.8, "longitude": 10.18, "capacity_kwp": 4.4, "tilt": 30, "orientation": 180 },
  "days": 2
}
```

```json
{ "timestamp": "2025-06-01T00:00:00", "predictions": { "power_kw": { "<iso>": 0.0 } } }
```

---

## Next.js API routes

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/csv/{file}` | GET | Serves `backend/data/csv_gen/*.csv`. Filename whitelist: `(historical_energy_data\|hourly_forecast\|realtime_snapshots)_\d+_panels\.csv` |
| `/api/profile` | PUT | Updates whitelisted profile columns for the authenticated user. Requires `Authorization: Bearer <supabase access token>` |
| `/api/solar-forecast` | POST | Server-side proxy to the Quartz service |

### `/api/profile`

Allowed fields: `display_name`, `phone_number`, `timezone`, `consumption_profile`,
`current_system`, `battery_size`, `preferences`. Anything else is dropped. The
row `id` is always forced to the authenticated user.

| Status | Meaning |
| --- | --- |
| 401 | Missing/invalid bearer token |
| 405 | Not `PUT` |
| 400 | No whitelisted fields provided, or Supabase rejected the write |
| 200 | `{ "data": { ... } }` |
