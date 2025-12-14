"""
Continuous Learning Pipeline for Solaira Energy Management System

Architecture Overview:
  Real Usage/Production Data → Data Ingestion → Feature Engineering → Model Retraining → Validation → Deployment

This document outlines the system for continuous model improvement.
"""

CONTINUOUS_LEARNING_PIPELINE = """

## 1. DATA INGESTION LAYER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Source: Real-time generation and consumption data from the user's installation

Modules:
  - backend/utils/database.py (logs to SQLite)
  - backend/utils/weather_api_v2.py (stores weather with geo context)

Tables Updated:
  - predictions (daily forecasts)
  - decisions (daily optimization decisions)
  - generation_actual (actual measured generation, per panel)
  - consumption_historic (actual measured consumption)
  - weather_historic (actual measured weather + forecasted vs actual)
  - anomalies (detected faults)

Continuous Input:
  - Smart meter data: hourly consumption_kwh
  - Inverter data: hourly generation per panel (PV1, PV2, PV3, Wind)
  - Weather station or API: temperature, wind speed, irradiance, pressure
  - Battery state: SOC, charge/discharge rate


## 2. FEATURE ENGINEERING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Goal: Transform raw data into model-ready features

For Wind Model (LSTM + XGBoost Ensemble):
  Input Features (must match training):
    - WS_Hub: Hub-height wind speed (m/s)
    - Temperature_2m: Air temperature at 2m (°C)
    - Surface_Pressure: Atmospheric pressure (Pa)
    - hour_sin, hour_cos: Time of day encoding
    - Energy_kWh: Previous hour's generation (lag-based)
    - Lagged features: Energy_lag_1, Energy_lag_2, ..., Energy_lag_48 (48 hours)
                       WS_lag_1, WS_lag_2, ..., WS_lag_48

  Preprocessing (scripted in backend/scripts/prepare_training_data.py):
    1. Resample to hourly frequency (handle missing data)
    2. Fill NaN values (forward-fill or interpolation)
    3. Calculate lags (1, 2, 3, 6, 12, 24, 48 hours)
    4. Add time features (hour, month, dayofweek)
    5. Apply scaler (MinMaxScaler fitted on training data)
    6. Create sequences for LSTM (24-hour windows)

For PV Model (if integrated later):
  Input Features:
    - Irradiance_W/m²: Solar irradiance
    - Temperature_2m: Air temperature
    - Cloud_cover_%: Cloud cover percentage
    - hour_sin, hour_cos: Time of day
    - Lagged irradiance and generation

For Consumption Model (if integrated later):
  Input Features:
    - Consumption_kWh: Previous consumption
    - Day_of_week: Day-of-week encoding
    - Hour_of_day: Hour encoding
    - Temperature: Space heating/cooling influence
    - Lagged consumption (1, 7, 14 days)


## 3. MODEL RETRAINING PIPELINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Trigger: Weekly or monthly batch retraining

Script: backend/scripts/retrain_wind_model.py (to be created)

Steps:
  1. Extract new training data from database
     - Query: generation_actual + weather_historic for last N days
     - Filter: Remove anomalies or flag low-confidence records
     - Split: 80% train, 20% validation, time-ordered (no shuffle)

  2. Prepare features
     - Run feature engineering pipeline
     - Apply existing scaler (or retrain if data range changes significantly)

  3. Retrain XGBoost
     - Load existing model
     - Fine-tune on new data (warm-start)
     - Evaluate: MAPE, RMSE on validation set

  4. Retrain LSTM
     - Load existing model
     - Continue training on new sequences
     - Evaluate: MAPE, RMSE, MAE on validation set

  5. Ensemble evaluation
     - Compare WEIGHT_XGB and WEIGHT_LSTM (currently 0.53 and 0.47)
     - Optimize weights based on new data performance
     - Log results to database

  6. Validation
     - If new model performance >= baseline:
       - Save new model and scaler
       - Update backend/models/wind/ files
     - Else:
       - Keep existing model, log warning
       - Schedule manual review


## 4. DATA QUALITY & ANOMALY HANDLING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Detection:
  - backend/inference/anomaly_detector.py flags underperformance, degradation, faults
  - Stores in backend/anomalies table

Handling in Retraining:
  - Option A: Exclude anomalous records (conservative)
  - Option B: Include with anomaly_flag (robust)
  - Option C: Weight anomalies lower (weighted training)

Recommendation: Use Option B with anomaly flagging for root cause analysis


## 5. MONITORING & LOGGING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Track per retraining cycle:
  - Baseline metrics (MAPE, RMSE, MAE)
  - New model metrics
  - Ensemble weight adjustments
  - Training data size
  - Anomalies detected
  - Retraining duration

Storage: backend/logs/retraining_log.csv (JSON)

API Endpoint (to be created):
  - GET /api/ml/model-performance - latest metrics
  - GET /api/ml/retraining-history - historical logs
  - POST /api/ml/retrain-now - trigger immediate retraining (admin)


## 6. DEPLOYMENT STRATEGY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Blue-Green Deployment:
  - Blue (current): backend/models/wind/ (production)
  - Green (candidate): backend/models/wind_new/ (staging)

Workflow:
  1. Retrain green model
  2. A/B test green vs blue on recent data
  3. If green wins: swap (mv wind_new/ wind/)
  4. If blue wins: keep blue, log comparison

Fallback:
  - Keep previous two model versions
  - Automatic rollback if RMSE increases > 10%


## 7. INTEGRATION WITH ORCHESTRATOR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Daily Orchestrator (backend/orchestrator.py):
  - Runs at 06:00 UTC each day
  - Fetches historic data
  - Loads current models (wind, PV, consumption)
  - Generates predictions
  - Stores predictions + decisions
  - Anomaly detection
  - **Logs actual outcomes** (generation_actual, consumption_actual)

Weekly Retraining (backend/scripts/retrain_wind_model.py):
  - Runs every Sunday at 02:00 UTC (low-load time)
  - Queries database for last 7-30 days
  - Retrains ensemble
  - Validates and optionally deploys


## 8. NEXT STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Priority:
  1. Create backend/scripts/retrain_wind_model.py
  2. Add retraining schedule (cron or Task Scheduler)
  3. Set up A/B testing and metrics logging
  4. Create frontend dashboard for model performance tracking
  5. Integrate real smart meter / inverter data ingestion
  6. Implement continuous data validation

Timeline:
  - Week 1: Prepare retraining script
  - Week 2-3: Deploy and validate on test data
  - Week 4: Schedule and monitor automated retraining
  - Month 2: Integrate real hardware data
  - Month 3+: Observe model drift and adapt


## 9. DATA RETENTION POLICY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Recommended:
  - Keep all generation_actual, consumption_historic, weather_historic indefinitely
  - Archive old predictions/decisions after 1 year
  - Keep anomaly logs for 2 years (root cause analysis)
  - Models versioned with timestamp

Database maintenance script: backend/scripts/archive_old_data.py


## 10. CONTINUOUS LEARNING FEEDBACK LOOP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Real Usage Loop:
  Day N:   Predictions published
  Day N+1: Actual outcomes measured
  Day N+7: Retraining triggered
  Day N+8: New model deployed (if better)
  Day N+9: Forecasts improve iteratively

This creates a virtuous cycle:
  Better forecasts → Better decisions → Better usage patterns
  Better patterns → More training data → Even better forecasts

---
Last Updated: 2025-12-14
Status: Framework defined, awaiting implementation
"""

# Quick reference for file structure
FILES_TO_CREATE = {
    "backend/scripts/prepare_training_data.py": "Feature engineering and data preparation",
    "backend/scripts/retrain_wind_model.py": "Weekly retraining orchestration",
    "backend/scripts/archive_old_data.py": "Data retention and cleanup",
    "backend/scripts/model_performance_tracker.py": "Metrics logging and A/B testing",
    "pages/api/ml/model-performance.js": "API endpoint for model metrics",
    "pages/api/ml/retraining-history.js": "API endpoint for retraining logs",
}

if __name__ == "__main__":
    print(CONTINUOUS_LEARNING_PIPELINE)
    print("\n\nFiles to Create:\n")
    for file, purpose in FILES_TO_CREATE.items():
        print(f"  {file}")
        print(f"    Purpose: {purpose}\n")
