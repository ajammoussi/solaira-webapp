# Energy Management Pipeline - Complete File Structure

## Directory Overview

```
pes-challenge-solaira-webapp/
│
├── backend/                                    # Python inference & orchestration
│   ├── __init__.py
│   ├── requirements.txt                       # Python dependencies
│   ├── config.py                              # Database & environment config
│   │
│   ├── orchestrator.py                        # Main daily job orchestrator
│   ├── continuous_learning.py                 # Monthly model retraining
│   │
│   ├── inference/                             # Prediction models
│   │   ├── __init__.py
│   │   ├── pv_model.py                        # PV generation predictions
│   │   ├── wind_model.py                      # Wind-tree predictions
│   │   ├── consumption_model.py               # Consumption predictions
│   │   └── anomaly_detector.py                # PV anomaly detection
│   │
│   ├── utils/                                 # Helper modules
│   │   ├── __init__.py
│   │   ├── physics_formula.py                 # Energy cost calculations
│   │   ├── decision_engine.py                 # Phase 2 logic (activation, battery, appliances)
│   │   ├── database.py                        # DB connection & queries
│   │   └── weather_api.py                     # Fetch NASA/external weather forecasts
│   │
│   ├── models/                                # Trained model files (binary/JSON)
│   │   ├── best_energy_lstm_model.onnx
│   │   ├── energy_lstm_model.onnx
│   │   └── energy_xgboost_pure_forecast.json
│   │
│   └── logs/                                  # Log files (created at runtime)
│       └── orchestrator.log
│
├── pages/api/                                 # Next.js API routes (Node.js)
│   ├── energy/
│   │   ├── predictions.js                     # GET /api/energy/predictions?date=YYYY-MM-DD
│   │   ├── decisions.js                       # GET /api/energy/decisions?date=YYYY-MM-DD
│   │   ├── status.js                          # GET /api/energy/status
│   │   ├── history.js                         # GET /api/energy/history?from=&to=&granularity=
│   │   └── appliances.js                      # GET /api/energy/appliances, POST (add user appliance)
│   │
│   └── admin/
│       ├── simulate.js                        # POST /api/admin/simulate (test predictions)
│       └── health.js                          # GET /api/admin/health (check orchestrator status)
│
├── database/
│   ├── schema.sql                             # Database table definitions
│   └── seed.sql                               # Sample test data
│
├── lib/
│   ├── db.js                                  # MySQL connection pool (Node.js)
│   └── supabase.js                            # Supabase client (existing)
│
├── scripts/
│   ├── db-import.js                           # Existing import script
│   └── run_orchestrator.sh                    # Cron-friendly shell script to run orchestrator
│
├── config/
│   └── .env.example                           # Environment variables template
│
├── public/
│   └── test-data/
│       └── sample_input.json                  # Example inputs for /api/admin/simulate
│
├── package.json                               # Node.js dependencies (add Python runner)
├── next.config.js
├── tsconfig.json
│
└── docs/
    └── PIPELINE_API_REFERENCE.md              # Complete API documentation
    └── DEPLOYMENT_GUIDE.md                    # How to run orchestrator as scheduled job

```

---

## File Descriptions & Responsibilities

### Backend Python (Inference & Orchestration)

#### `backend/requirements.txt`
Python package dependencies for inference, ML models, database connectivity.

#### `backend/config.py`
Central configuration: database credentials, model paths, feature specs, thresholds.

#### `backend/orchestrator.py` ⭐
**Main orchestration script** - runs daily at 06:00 AM:
1. Fetch last 40 days of consumption & weather from DB
2. Fetch tomorrow's weather forecast (NASA/external API)
3. Run PV, wind, consumption inference models
4. Compute Phase 2 decisions (activation, battery rules, appliance scheduling)
5. Detect anomalies in PV panels
6. Store all results in database

#### `backend/continuous_learning.py`
Runs monthly (e.g., 1st of month at 08:00 AM):
1. Fetch last 30 days of predictions vs actual generation
2. Compute model performance metrics (MAE, RMSE, R²)
3. Log metrics to database
4. Optionally retrain models if performance degraded

#### `backend/inference/pv_model.py`
Predict PV generation for each panel (tomorrow):
- Input: historic consumption/weather (last 40 days), forecast weather
- Output: predicted_kwh per panel, error_margin_kwh
- Uses: LSTM/XGBoost model (ONNX format)

#### `backend/inference/wind_model.py`
Predict wind-tree generation (tomorrow):
- Input: wind speed forecast, historic wind speed
- Output: predicted_kwh, error_margin_kwh
- Uses: LSTM model (ONNX format)

#### `backend/inference/consumption_model.py`
Predict total consumption (tomorrow):
- Input: historic consumption (last 40 days), date features (day-of-week, seasonality)
- Output: predicted_kwh, error_margin_kwh
- Uses: LSTM model (ONNX format)

#### `backend/inference/anomaly_detector.py`
Detect underperformance/faults in PV panels (daily):
- Algorithm: pair comparison + neighbor comparison on historic generation
- Output: anomalies list with panel_id, confidence_score, description
- Triggered after actual generation is recorded (end-of-day)

#### `backend/utils/physics_formula.py`
Calculate energy cost to activate/maintain each source:
- PV: fixed startup cost (if cold-start) + maintenance
- Wind-tree: startup cost + maintenance (wind-speed dependent)
- Used to decide activation ROI in Phase 2 decision engine

#### `backend/utils/decision_engine.py`
Phase 2 logic - compute daily actions:
- Decide: activate PV? activate wind-tree? (ROI check vs cost)
- Compute battery bilan (generation - consumption)
- Battery management:
  - If SOC > 80%: export to microgrid, schedule heavy appliances
  - If SOC < 20%: import from microgrid, defer heavy appliances
- Output: decisions JSON (stored in DB)

#### `backend/utils/database.py`
MySQL connection pool & query helper functions:
- `fetch_historic_data(days=40)` - get consumption & weather
- `store_predictions()` - insert predictions into DB
- `store_decisions()` - insert Phase 2 decisions into DB
- `store_anomalies()` - insert anomalies into DB
- `fetch_actual_generation()` - get end-of-day generation (for learning)

#### `backend/utils/weather_api.py`
Fetch tomorrow's weather forecast from NASA/external API:
- Calls external service (NASA POWER, OpenWeatherMap, etc.)
- Returns: temperature, irradiance, wind_speed, cloud_cover
- Stores in `weather_forecast` table

---

### Next.js API Routes (Node.js)

#### `pages/api/energy/predictions.js`
**GET** `/api/energy/predictions?date=YYYY-MM-DD`
- Fetch predictions for a given date
- Response: PV/wind/consumption predictions per panel + totals + error margins

#### `pages/api/energy/decisions.js`
**GET** `/api/energy/decisions?date=YYYY-MM-DD`
- Fetch Phase 2 decisions (activation, battery, appliances, microgrid)

#### `pages/api/energy/status.js`
**GET** `/api/energy/status`
- Real-time status: today's battery SOC, anomalies, last update timestamp

#### `pages/api/energy/history.js`
**GET** `/api/energy/history?from=YYYY-MM-DD&to=YYYY-MM-DD&granularity=day`
- Historic data: consumption, generation (per source), battery SOC

#### `pages/api/energy/appliances.js`
**GET** - list user appliances
**POST** - add new user appliance (name, power_kw, is_schedulable)

#### `pages/api/admin/simulate.js`
**POST** `/api/admin/simulate`
- Test predictions without modifying DB
- Input: historic consumption/weather + forecast
- Output: predictions + decisions (for testing)

#### `pages/api/admin/health.js`
**GET** `/api/admin/health`
- Check orchestrator status: last run timestamp, errors, model versions

---

### Database

#### `database/schema.sql`
Table definitions:
- `consumption_historic` - last 40 days of consumption readings
- `weather_historic` - last 40 days of weather readings
- `weather_forecast` - tomorrow's forecast
- `generation_actual` - end-of-day actual generation (PV & wind per panel)
- `predictions` - predictions (PV/wind/consumption per date)
- `decisions` - Phase 2 decisions (activation, battery, appliances)
- `anomalies` - detected PV anomalies
- `user_appliances` - user's controllable/schedulable machines
- `model_logs` - model performance metrics (continuous learning)

#### `database/seed.sql`
Sample test data to populate tables for development/testing.

---

### Configuration & Scripts

#### `lib/db.js`
Node.js MySQL connection pool (used by API routes).

#### `scripts/run_orchestrator.sh`
Shell script to invoke Python orchestrator (for cron jobs).
```bash
#!/bin/bash
cd /path/to/pes-challenge-solaira-webapp
python -m backend.orchestrator >> backend/logs/orchestrator.log 2>&1
```

#### `.env.example`
Template for environment variables:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=energy_db
WEATHER_API_KEY=your_nasa_key
WEATHER_API_URL=https://api.nasa.gov/...
```

#### `public/test-data/sample_input.json`
Example input for testing `/api/admin/simulate`.

---

### Documentation

#### `docs/PIPELINE_API_REFERENCE.md`
Complete API documentation for frontend developers:
- Endpoint descriptions
- Request/response schemas
- Error codes
- Example calls

#### `docs/DEPLOYMENT_GUIDE.md`
How to deploy and schedule:
- Install Python dependencies
- Set up MySQL database (run schema.sql)
- Configure .env
- Schedule orchestrator as cron job
- Monitor logs

---

## Execution Flow

### Daily (06:00 AM)
```
orchestrator.py (Python)
  ├─ Fetch historic data (DB)
  ├─ Fetch weather forecast (NASA API)
  ├─ Run PV, wind, consumption inference
  ├─ Compute Phase 2 decisions
  ├─ Store predictions + decisions (DB)
  └─ Frontend calls GET /api/energy/predictions & /api/energy/decisions
```

### Monthly (1st, 08:00 AM)
```
continuous_learning.py (Python)
  ├─ Fetch predictions vs actuals (last 30 days)
  ├─ Compute MAE, RMSE, R²
  ├─ Log metrics (DB)
  └─ Optional: retrain models
```

### Real-time (On-demand)
```
Frontend
  ├─ GET /api/energy/predictions?date=... (display forecast)
  ├─ GET /api/energy/decisions?date=... (display actions)
  ├─ GET /api/energy/status (show battery + anomalies)
  └─ GET /api/energy/history?from=...&to=... (display charts)
```

### Testing
```
POST /api/admin/simulate (test predictions without DB writes)
GET /api/admin/health (check orchestrator status)
```

---

## Summary: What Each File Does

| File | Type | Purpose |
|------|------|---------|
| `orchestrator.py` | Python | Daily job: predict → decide → store |
| `continuous_learning.py` | Python | Monthly: evaluate models, log metrics |
| `pv_model.py`, `wind_model.py`, `consumption_model.py` | Python | Inference: generate predictions |
| `anomaly_detector.py` | Python | Detect PV faults via pair + neighbor comparison |
| `decision_engine.py` | Python | Phase 2: activation, battery, appliances |
| `database.py` | Python | DB helpers: fetch, insert, query |
| `physics_formula.py` | Python | Energy cost calculations |
| `predictions.js`, `decisions.js`, `status.js`, `history.js` | Node.js/API | Expose predictions/decisions to frontend |
| `simulate.js`, `health.js` | Node.js/API | Testing & monitoring endpoints |
| `schema.sql` | SQL | Database table definitions |
| `db.js` | Node.js | MySQL connection pool for API routes |

---

## Next Steps

1. **Create database schema** (`database/schema.sql`) and seed test data
2. **Implement inference modules** (PV, wind, consumption, anomaly detection)
3. **Implement decision engine** (Phase 2 logic)
4. **Set up API routes** (Node.js endpoints)
5. **Test orchestrator** with sample data (`/api/admin/simulate`)
6. **Schedule cron job** to run orchestrator daily
7. **Monitor logs** and iterate

