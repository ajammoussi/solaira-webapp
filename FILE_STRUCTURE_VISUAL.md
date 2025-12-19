# Complete Project Structure - Visual Overview

## 📁 Directory Tree

```
pes-challenge-solaira-webapp/
│
├── 📄 QUICKSTART.md                          ⭐ Start here!
├── 📄 ORCHESTRATION_STRUCTURE.md             📚 Complete architecture docs
├── 📄 package.json                           Node.js dependencies
├── 📄 .env                                   🔒 Environment variables (create this!)
│
├── 📁 backend/                               🐍 Python inference pipeline
│   ├── 📄 __init__.py
│   ├── 📄 config.py                          ⚙️ Central configuration
│   ├── 📄 requirements.txt                   📦 Python dependencies
│   ├── 📄 orchestrator.py                    ⭐⭐⭐ MAIN DAILY JOB
│   ├── 📄 continuous_learning.py             📊 Monthly model evaluation
│   │
│   ├── 📁 inference/                         🤖 Prediction models
│   │   ├── 📄 pv_model.py                    ☀️ Solar panel predictions
│   │   ├── 📄 wind_model.py                  💨 Wind turbine predictions
│   │   ├── 📄 consumption_model.py           ⚡ Consumption predictions
│   │   └── 📄 anomaly_detector.py            🚨 PV fault detection
│   │
│   ├── 📁 utils/                             🛠️ Helper modules
│   │   ├── 📄 database.py                    💾 DB connection & queries
│   │   ├── 📄 decision_engine.py             🎯 Phase 2 logic (CORE!)
│   │   ├── 📄 physics_formula.py             ⚛️ Energy cost calculations
│   │   └── 📄 weather_api.py                 🌤️ Weather forecast API
│   │
│   ├── 📁 models/                            🧠 Trained ML models
│   │   ├── 📄 best_energy_lstm_model.onnx    (Copy from final_delivery/)
│   │   ├── 📄 energy_lstm_model.onnx
│   │   └── 📄 energy_xgboost_pure_forecast.json
│   │
│   └── 📁 logs/                              📝 Runtime logs
│       └── 📄 orchestrator.log               (Auto-generated)
│
├── 📁 pages/api/                             🌐 Next.js API routes
│   └── 📁 energy/                            (Need to create these)
│       ├── 📄 predictions.js                 GET /api/energy/predictions
│       ├── 📄 decisions.js                   GET /api/energy/decisions
│       ├── 📄 status.js                      GET /api/energy/status
│       └── 📄 history.js                     GET /api/energy/history
│
├── 📁 database/                              🗄️ Database setup
│   ├── 📄 schema.sql                         (Needs completion)
│   └── 📄 seed.sql                           (Optional: test data)
│
├── 📁 lib/                                   📚 Node.js helpers
│   ├── 📄 db.js                              (MySQL connection for API)
│   └── 📄 supabase.js                        (Existing)
│
├── 📁 scripts/                               🔧 Utility scripts
│   ├── 📄 run_orchestrator.sh                🐧 Run orchestrator (Linux/Mac)
│   ├── 📄 run_orchestrator.ps1               🪟 Run orchestrator (Windows)
│   └── 📄 db-import.js                       (Existing)
│
├── 📁 final_delivery/                        📦 Your existing models & code
│   ├── 📄 inference_ensemble.py              (Reference implementation)
│   ├── 📄 inference_service.py
│   ├── 📄 physics_formula.py
│   └── 📁 models/
│       ├── 📄 best_energy_lstm_model.onnx    👉 Copy these to backend/models/
│       ├── 📄 energy_lstm_model.onnx
│       └── 📄 energy_xgboost_pure_forecast.json
│
└── 📁 components/                            ⚛️ React UI components (existing)
    ├── EnergyFlowDiagram/
    ├── PowerSourcesChart/
    ├── ElectricityUsage/
    └── ...

```

---

## 🔄 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     DAILY ORCHESTRATION FLOW                    │
└─────────────────────────────────────────────────────────────────┘

        06:00 AM - Cron Job Triggers
               ↓
    ┌──────────────────────────┐
    │  orchestrator.py (MAIN)  │
    └──────────────────────────┘
               ↓
    ╔══════════════════════════╗
    ║   STEP 1: Weather API    ║
    ╚══════════════════════════╝
    weather_api.py → NASA/External API
    Fetch tomorrow's forecast
               ↓
    ╔══════════════════════════╗
    ║ STEP 2: Historic Data    ║
    ╚══════════════════════════╝
    database.py → MySQL
    Fetch last 40 days (consumption + weather)
               ↓
    ╔══════════════════════════╗
    ║  STEP 3: Run Predictions ║
    ╚══════════════════════════╝
    ┌───────────────────────────────────────┐
    │  pv_model.py                          │
    │    Input: historic + forecast         │
    │    Output: [panel1, panel2, panel3]   │
    │            predictions (kWh)          │
    └───────────────────────────────────────┘
    ┌───────────────────────────────────────┐
    │  wind_model.py                        │
    │    Input: historic wind + forecast    │
    │    Output: wind_tree prediction (kWh) │
    └───────────────────────────────────────┘
    ┌───────────────────────────────────────┐
    │  consumption_model.py                 │
    │    Input: historic consumption        │
    │    Output: tomorrow's consumption     │
    └───────────────────────────────────────┘
               ↓
    ╔══════════════════════════╗
    ║ STEP 4: Store Predictions║
    ╚══════════════════════════╝
    database.py → MySQL (predictions table)
               ↓
    ╔══════════════════════════╗
    ║  STEP 5: Phase 2 Logic   ║
    ╚══════════════════════════╝
    ┌───────────────────────────────────────┐
    │  decision_engine.py                   │
    │                                       │
    │  1. Activation decisions:             │
    │     - PV activate? (ROI check)        │
    │     - Wind activate? (ROI check)      │
    │                                       │
    │  2. Battery management:               │
    │     - Compute bilan (gen - cons)      │
    │     - If SOC > 80%: export to grid    │
    │     - If SOC < 20%: import from grid  │
    │                                       │
    │  3. Appliance scheduling:             │
    │     - Surplus: schedule heavy loads   │
    │     - Deficit: defer heavy loads      │
    │                                       │
    │  Output: decisions JSON               │
    └───────────────────────────────────────┘
               ↓
    ╔══════════════════════════╗
    ║  STEP 6: Store Decisions ║
    ╚══════════════════════════╝
    database.py → MySQL (decisions table)
               ↓
    ╔══════════════════════════╗
    ║ STEP 7: Anomaly Detection║
    ╚══════════════════════════╝
    ┌───────────────────────────────────────┐
    │  anomaly_detector.py                  │
    │    - Pair comparison (panel vs avg)   │
    │    - Neighbor comparison (sudden drop)│
    │    Output: anomalies list             │
    └───────────────────────────────────────┘
               ↓
    database.py → MySQL (anomalies table)
               ↓
         ✅ COMPLETE
    Logs written to backend/logs/orchestrator.log


┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND API CALLS                         │
└─────────────────────────────────────────────────────────────────┘

    Frontend (React/Next.js)
               ↓
    GET /api/energy/predictions?date=2025-12-12
               ↓
    pages/api/energy/predictions.js
               ↓
    lib/db.js → MySQL (predictions table)
               ↓
    Response: {
      date: "2025-12-12",
      consumption: {predicted_kwh: 9.45, error_margin_kwh: 1.0},
      sources: {
        pv: [{panel_id: 1, predicted_kwh: 2.7, ...}, ...],
        wind_tree: {predicted_kwh: 2.98, ...}
      },
      total_generation_kwh: 11.1
    }

    ---

    GET /api/energy/decisions?date=2025-12-12
               ↓
    pages/api/energy/decisions.js
               ↓
    lib/db.js → MySQL (decisions table)
               ↓
    Response: {
      date: "2025-12-12",
      actions: {
        sources: [
          {type: "pv", activate: true, reason: "..."},
          {type: "wind_tree", activate: true, reason: "..."}
        ],
        battery: {bilan_kwh: 1.65, soc_estimate_percent: 56.5},
        microgrid: {action: "none", power_kw: 0},
        appliances: [{id: "washing_machine", scheduled_time: "10:00", ...}]
      }
    }

    ---

    GET /api/energy/status
               ↓
    pages/api/energy/status.js
               ↓
    lib/db.js → MySQL (decisions + anomalies tables)
               ↓
    Response: {
      battery: {soc_percent: 56, health: "ok"},
      anomalies: [
        {panel_id: 2, type: "underperformance", confidence: 0.83, ...}
      ],
      last_update: "2025-12-11T06:15:23Z"
    }

```

---

## 🎯 Core Files You Must Understand

### 1. `backend/orchestrator.py` ⭐⭐⭐
**THE BRAIN** - Runs everything daily. Coordinates all steps.

### 2. `backend/utils/decision_engine.py` 🎯
**THE DECISION MAKER** - Phase 2 logic. Decides activation, battery management, appliance scheduling.

### 3. `backend/utils/database.py` 💾
**THE DATA LAYER** - All database operations. Fetch, store, query.

### 4. `backend/inference/*.py` 🤖
**THE PREDICTORS** - ML models for PV, wind, consumption, anomalies.

---

## 🚦 Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | File created and ready |
| ⚠️ | Needs your action (copy models, configure, etc.) |
| 📦 | Existing file from your project |
| ⭐ | Critical file - must understand |
| 🔒 | Sensitive (credentials, API keys) |

---

## 📊 Database Tables (Summary)

```sql
consumption_historic      -- Last 40 days of consumption
weather_historic          -- Last 40 days of weather
weather_forecast          -- Tomorrow's forecast
generation_actual         -- End-of-day actual generation (per panel)
predictions               -- Daily predictions (PV/wind/consumption)
decisions                 -- Phase 2 decisions (activation, battery, appliances)
anomalies                 -- Detected PV anomalies
user_appliances           -- User's controllable appliances
model_logs                -- Model performance metrics (continuous learning)
```

---

## 🔧 Quick Commands

```powershell
# Install Python dependencies
pip install -r backend/requirements.txt

# Test orchestrator (dry run)
python -m backend.orchestrator

# Run monthly evaluation
python -m backend.continuous_learning

# Copy models to backend
Copy-Item "final_delivery\models\*" "backend\models\"

# Check logs
Get-Content backend\logs\orchestrator.log -Tail 50

# Schedule daily job (Windows Task Scheduler)
# Run: scripts\run_orchestrator.ps1
# Trigger: Daily at 06:00 AM
```

---

## 📚 Documentation Files

1. **QUICKSTART.md** ⭐ - Start here! Quick setup guide
2. **ORCHESTRATION_STRUCTURE.md** 📚 - Complete architecture documentation
3. **FILE_STRUCTURE_VISUAL.md** (this file) 🗺️ - Visual overview
4. **backend/README.md** (optional) - Backend-specific docs

