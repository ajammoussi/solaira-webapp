# Project Status & Conversation Summary

## 1. Work Completed
We have successfully integrated the Python FastAPI backend with the Next.js frontend, focusing on the **Predictions** and **Maintenance** modules.

### Backend (FastAPI)
- **Setup:** Created `backend/main.py` with endpoints for `/simulate` (Energy Simulation) and `/maintenance` (Anomaly Detection).
- **Logic:** Implemented core logic in `backend/core/` for running simulations and calculating performance ratios.
- **Models:** Defined Pydantic models for data validation.

### Frontend (Next.js)
- **Service Layer:** Created `lib/services/pythonApi.js` to communicate with the Python backend.
- **Predictions Page (`/predictions`):**
  - Integrated with `/simulate` endpoint.
  - **Visuals:** Switched to `PowerSourcesChart` (ApexCharts) for better visualization of Solar vs. Grid usage.
  - **Fixes:** Resolved `ReferenceError` (missing imports) and fixed data mapping for the chart.
  - **UX:** Disabled auto-refresh to prevent flickering/reloading on tab switch.
- **Maintenance Page (`/maintenance`):**
  - Integrated with `/maintenance` endpoint.
  - **Fixes:** Resolved `TypeError` (property mismatch `alerts` vs `issues`) and `422 Validation Error` (float precision).
  - **UX:** Disabled auto-refresh.
- **Components:**
  - **PowerSourcesChart:** Fixed hardcoded Y-axis scale to allow auto-scaling for small data values.

## 2. Next Steps

### Database Integration (Supabase)
- **Current State:** Supabase is set up for Authentication (`lib/supabase.js`, `lib/auth/`).
- **To Do:**
  - Create tables for storing user energy data (`pv_readings`, `consumption_logs`).
  - Update `pythonApi.js` or create a new service to fetch historical data from Supabase instead of generating mock data in the frontend.

### Data Fetching
- **Current State:** The frontend currently generates mock data (random arrays) and sends it to the Python backend for analysis.
- **To Do:**
  - Implement a file upload feature or API connector to get real data.
  - Pass real historical data to the `/simulate` and `/maintenance` endpoints.

## 3. Data Import Requirements
For the system to function correctly with user data, the user should import CSV files with the following structure:

**1. PV Generation & Consumption Data (`energy_data.csv`)**
| Column Name | Type | Description |
|-------------|------|-------------|
| `timestamp` | ISO 8601 String | e.g., `2023-10-27T14:00:00` |
| `production_kwh` | Float | Solar energy generated in that hour |
| `consumption_kwh` | Float | Energy consumed by the household |
| `grid_import_kwh` | Float | (Optional) Energy bought from grid |
| `grid_export_kwh` | Float | (Optional) Energy sold to grid |

**2. Weather Data (Optional but recommended for better predictions)**
| Column Name | Type | Description |
|-------------|------|-------------|
| `timestamp` | ISO 8601 String | Time of observation |
| `irradiance` | Float | Solar irradiance (W/m²) |
| `temperature` | Float | Ambient temperature (°C) |

## 4. Model Training & New Data
**How it works currently:**
1.  **Initial Training:** The script `backend/train_and_save_production_model.py` trains an XGBoost model on historical data (`backend/data/processed_pv_data_2023_2024.csv`) and saves it as a `.json` file.
2.  **Inference:** The FastAPI app loads this model on startup.
3.  **New Data:**
    - When a user uploads new data, it should be saved to the database/dataset.
    - **Retraining:** You can trigger the `/retrain` endpoint. This will:
        - Load the combined dataset (old + new).
        - Retrain the XGBoost model.
        - Save the new model artifact.
        - Reload the model in memory for immediate use.

## 5. Suggestions & Future Improvements

### Gemini API vs. XGBoost
**Current Approach (XGBoost):**
- **Pros:** Extremely fast, lightweight, excellent for structured time-series data, runs locally/cheaply.
- **Cons:** Requires manual feature engineering (lag features, rolling averages), strictly numerical.

**Gemini API Approach:**
- **Idea:** Feed historical data + weather context to Gemini and ask for predictions or advice.
- **Pros:**
  - Can handle unstructured context (e.g., "It's a holiday today, expect higher usage").
  - Can generate natural language advice directly (e.g., "Based on the forecast, charge your battery at 2 PM").
  - No need to manage model files locally.
- **Cons:**
  - Latency (API calls are slower than local inference).
  - Cost (Token usage).
  - Context Window limits (sending 1 year of hourly data might be too much).

**Recommendation:**
Use a **Hybrid Approach**.
1.  Keep **XGBoost** for the raw numerical forecasting (Production/Consumption numbers) because it's fast and accurate for patterns.
2.  Use **Gemini API** to interpret those numbers and generate the "Smart Advice" or "Recommendations" text. Instead of hardcoded `if soc < 20: print("Low Battery")`, feed the daily summary to Gemini and ask: *"Given this forecast, what should the homeowner do?"*

## 6. Recent Updates (December 2025)

### Backend Fixes
- **500 Internal Server Error Resolved:** Fixed a frequency mismatch issue in ackend/core/phase_1/data_processing.py and ackend/main.py where Pandas deprecated 'H' frequency was causing crashes. Updated resampling logic to robustly handle hourly data.

### Predictions Page Overhaul
- **UI Redesign:** Completely restyled pages/predictions/index.jsx to match the Dashboard's aesthetic.
  - Implemented pages/predictions/styles.module.css with Solaira design tokens.
  - Replaced basic summary text with styled **Metric Cards**.
  - Added **Section Headers** with icons.
  - Styled **AI Recommendations** into a clean list with icons.
- **Chart Improvements:**
  - Fixed X-axis labels to display clean hourly formats (e.g., '14:00') instead of relative timestamps.
  - Rounded Y-axis values to 3 decimal places for better readability.
- **Visual Tweaks:** Removed background boxes from metric icons for a cleaner look.

