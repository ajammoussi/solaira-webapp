# Backend

Two FastAPI services, started together by `backend/start.py`:

| Service | Port | Command |
| --- | --- | --- |
| Main API | 8001 | `python backend/main.py` |
| Quartz forecast | 8002 | `uvicorn api.v1.api:app` in `backend/models/quartz-solar-forecast` |

Config comes from `.env.local` at the repository root (loaded explicitly by
`main.py`). See [environment.md](environment.md).

## Main API (`backend/main.py`)

| Method | Path | Called by frontend | Purpose |
| --- | --- | --- | --- |
| GET | `/` | — | Service summary |
| GET | `/health` | — | `{status: "ok"}` |
| GET | `/api/health` | chatbot health check (currently unused) | Model status |
| POST | `/predict` | no | Weather → PV production (XGBoost) |
| POST | `/simulate` | no | 24 h scenario simulation |
| POST | `/energy-simulation` | **yes** — predictions | 24 h PV + wind + battery series |
| POST | `/maintenance` | **yes** — predictions, maintenance | Performance-ratio analysis |
| POST | `/api/chat` | **yes** — chatbot | Support agent |
| POST | `/api/pv-systems/configure` | **yes** — maintenance | Set monitored system count/capacity |
| POST | `/api/pv-systems/monitoring` | **yes** — maintenance | `{action: "start" \| "stop"}` |
| GET | `/api/pv-systems/status` | **yes** — polled 60 s | All system statuses |
| GET | `/api/pv-systems/{id}/status` | no | Single system detail |
| GET | `/api/pv-systems/{id}/history` | **yes** — grid drill-down | Historical series |
| GET | `/api/pv-systems/config` | no | Monitoring configuration |

The two services are optional-safe: if a model or dependency is absent the app
still boots and the affected endpoints degrade instead of crashing the process.

## Modules

```
core/phase_1/     Data preparation + training (offline)
core/phase_2/     Energy simulation, battery model, realtime manager
core/phase_3/     PV monitoring, performance ratio, predictive maintenance
core/pv_energy/   PV inference (XGBoost + LSTM ensemble)
core/wind_energy/ Wind inference
chatbot/          LangGraph agent over Cerebras models
models/           Trained artifacts (pkl / onnx / json)
data/             Historical CSVs consumed by the simulator
```

- `phase_2/realtime_manager.py` is the only consumer of `pv_energy` and
  `wind_energy`. It reads `processed_pv_data_2022_2025.csv`,
  `consumption/processed_power_usage_2022_2025.csv` and
  `era5_data_with_energy.csv`, and falls back to simulated patterns when a file
  is missing.
- `phase_3/pv_monitor.py` generates realistic synthetic status data for the
  monitored systems; `phase_3/predictive_maintenance.py` computes performance
  ratios from the CSVs declared in `phase_3/maintenance_config.yaml`.

### Not imported at runtime

These are run manually and are deliberately not part of the serving path. They
are kept because they contain the training/evaluation logic:

- `core/phase_1/{ml_models,lstm_models,sarima_models,visualization}.py`
- `core/phase_1/{retrain_models,Consumption}.py`
- `core/pv_energy/ensemble_weight_optimizer.py` (weight search script)
- `models/quartz-solar-forecast/api/v0/` (superseded by `api/v1`)

## Known gaps

- **No database access from Python.** Persistence lives in Supabase and is
  written by the browser or by Next.js API routes.
- **Monitoring data is synthetic.** `pv_monitor.py` fabricates plausible series
  rather than reading a meter.
- **`/predict` and `/simulate` are unused by the UI** but kept as the documented
  forecasting surface.
- **Chatbot is optional.** Without `CEREBRAS_API_KEY` (or without the
  langchain/cerebras packages) the API boots and `/api/chat` reports that the
  agent is not initialised.

## Tests

`backend/tests/` — see [testing.md](testing.md). CI installs
`requirements-ci.txt`, which excludes TensorFlow/ONNX.
