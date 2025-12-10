# Integration Plan: PES Challenge ML Features into Web App

## 1. Analysis of Current Web App Structure

### Architecture
- **Framework:** Next.js v12 (React 17)
- **Language:** JavaScript (with some TypeScript definitions)
- **State Management:** React Context (`GlobalProvider`, `AuthProvider`)
- **Database:** Hybrid approach using `@supabase/supabase-js` (PostgreSQL) and `mysql2`.
- **Authentication:** Custom hook-based auth (`useAuth`) likely integrating with Supabase Auth or a custom backend.
- **Styling:** CSS Modules (`*.module.css`) and global CSS.
- **UI Components:** Custom components in `components/` folder.
- **Data Fetching:** Service layer pattern in `lib/services/` (e.g., `forecasts.js`, `energy.js`).

### Key Directories
- `pages/`: Next.js routing (Dashboard, Energy, Predictions, Settings).
- `components/`: Reusable UI components (Charts, Layouts).
- `lib/`: Utilities, hooks, and API services.
- `src_final/`: (Currently unintegrated) Python ML and simulation logic.

---

## 2. Analysis of `/src_final` (The "Feature")

The `src_final` folder contains a comprehensive Python-based Energy Management System (EMS) backend.

### Structure
- **Phase 1 (Prediction):** `ml_models.py`, `lstm_models.py`, `sarima_models.py`.
    - **Function:** Trains and runs models (XGBoost, LSTM, SARIMA) to predict PV production.
    - **Entry Point:** `train_and_save_production_model.py`.
- **Phase 2 (Simulation):** `realtime_simulator.py`, `_03_battery_manager.py`.
    - **Function:** Simulates battery usage, grid interaction, and energy flow based on configuration.
    - **Config:** `system_config.yaml` (Defines battery specs, limits, and strategies).
- **Phase 3 (Maintenance):** `predictive_maintenance.py`.
    - **Function:** Analyzes performance ratios and detects anomalies.

### Dependencies
- `pandas`, `numpy`, `xgboost`, `sklearn`, `matplotlib`, `joblib`, `pyyaml`.

---

## 3. Integration Strategy

### Architecture Proposal
Since Next.js runs on Node.js and the ML logic is in Python, we cannot import the files directly. We will adopt a **Service-Oriented Architecture**:

1.  **Frontend (Next.js):** Remains the user interface.
2.  **Backend API (Python/FastAPI):** A new service that wraps the `src_final` logic.
3.  **Database (Supabase):** Shared data store.

### Data Flow
1.  **Training/Batch Jobs:** Python scripts run periodically (e.g., nightly) to generate forecasts and save them to Supabase (`production_forecasts` table).
2.  **Real-time Simulation:** Frontend calls Python API (`/api/simulate`) with current parameters -> Python runs `realtime_simulator.py` logic -> Returns JSON.
3.  **Configuration:** Frontend "Settings" page updates `system_config.yaml` (or DB equivalent) -> Python backend reloads config.

### Refactoring Needs
1.  **Rename `src_final`:** Move to a dedicated `backend/` directory.
2.  **Standardize Python Project:** Add `requirements.txt` and `main.py` (API entry point).
3.  **Frontend Services:** Update `lib/services/` to fetch from the new Python API or the Supabase tables populated by it, replacing `mockData.js`.

---

## 4. Implementation Roadmap

### Step 1: Backend Setup
1.  Create a `backend` folder in the root.
2.  Move contents of `src_final` into `backend/core`.
3.  Create `backend/requirements.txt` with necessary libraries (`fastapi`, `uvicorn`, `pandas`, `xgboost`, etc.).
4.  Create `backend/main.py` to serve as the API Gateway.

### Step 2: Database Integration
1.  Ensure Supabase tables exist for:
    - `pv_production_data` (Historical)
    - `production_forecasts` (Future)
    - `battery_config` (To replace/sync with `system_config.yaml`)
2.  Modify `backend/core/phase_1/data_processing.py` to read/write to Supabase instead of local CSVs.

### Step 3: API Development
Create endpoints in `backend/main.py`:
- `GET /predict/pv`: Returns PV production forecast (calls Phase 1).
- `POST /simulate`: Accepts current load/solar data, returns battery decision (calls Phase 2).
- `GET /maintenance/status`: Returns system health score (calls Phase 3).

### Step 4: Frontend Integration
1.  **Update `next.config.js`:** Add a rewrite rule to proxy `/api/python/*` to `http://localhost:8000` (for local dev).
2.  **Update Services:**
    - Modify `lib/services/forecasts.js` to call the new API endpoints.
    - Modify `lib/services/energy.js` to use real-time simulation data.
3.  **Settings Page:** Create a UI in `pages/settings/index.jsx` to edit the Battery Configuration (mapping to `system_config.yaml` fields).

### Step 5: Testing & Deployment
1.  **Unit Tests:** Test Python API endpoints with `pytest`.
2.  **Integration Tests:** Verify Frontend correctly displays data from Backend.
3.  **Deployment:** Deploy Next.js to Vercel/Netlify and Python Backend to a container service (e.g., Railway, Render, or AWS Lambda).

## 5. Potential Conflicts & Considerations
- **Port Conflicts:** Ensure Next.js (3000) and Python (8000) run on different ports.
- **Environment Variables:** Share `.env` variables (Supabase keys) between both projects.
- **Performance:** ML inference can be slow. Cache predictions in Supabase or Redis.
