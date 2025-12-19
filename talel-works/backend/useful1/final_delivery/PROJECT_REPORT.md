# 🌬️ Wind Energy Prediction Project - Final Report

## 1. Project Overview
This project aims to predict energy output for a **Wind Tree** system using historical weather data (ERA5) and synthetic energy production formulas. The goal was to build a robust, deployment-ready model for the **PES Challenge TSYP 25/26**.

## 2. The Data & The Physics
We started with raw weather data (Wind Speed, Temperature, Pressure). Since real energy production data was unavailable, we generated synthetic ground truth using the physics of wind turbines.

### The Formula
The energy output $P$ is calculated as:
$$ P = \frac{1}{2} \rho A v^3 C_p \eta $$

Where:
*   $\rho$: Air density (derived from Temp & Pressure)
*   $A$: Total swept area of 36 leaves ($36 \times \pi \times 0.5^2$)
*   $v$: Wind speed (clamped at rated speed 11 m/s)
*   $C_p$: Power coefficient (0.35)
*   $\eta$: Generator efficiency (0.9)

*See `physics_formula.py` for the exact implementation.*

### Physics Constraints (The "Zero" Values)
You will notice many `0.0` values in the dataset. This is **physically correct** and intentional:
*   **Cut-in Speed (2.5 m/s)**: If wind speed is below 2.5 m/s, the turbine blades do not turn, generating **0 kWh**.
*   **Cut-out Speed (25 m/s)**: If wind is too strong, the turbine brakes for safety, generating **0 kWh**.
*   **Training Impact**: We kept these zeros in the training data so the models (especially XGBoost) learn this threshold behavior. Removing them would cause the model to hallucinate energy production during calm winds.

## 3. Model Development Journey

### Phase 1: Initial Model Comparison
We benchmarked three distinct architectures to find the best baseline:
1.  **LSTM (Long Short-Term Memory)**: Good at capturing time dependencies.
2.  **Transformer**: Powerful but required more data than available to converge (High Error).
3.  **XGBoost**: Gradient boosting trees.

| Initial Benchmark | MAE | RMSE | R² | Status |
| :--- | :--- | :--- | :--- | :--- |
| **LSTM** | 0.157 | 0.274 | 0.946 | **Selected** (for stability) |
| **Transformer** | 0.582 | 0.926 | 0.389 | Discarded (Overkill/Underfit) |
| **XGBoost** | 0.006 | 0.021 | 0.999 | **Selected** (for accuracy) |

### Phase 2: Hyperparameter Tuning
We performed a Grid Search to optimize the LSTM model structure.
*   **Search Space**:
    *   Units: [32, 64, 128]
    *   Dropout: [0.1, 0.2, 0.3]
    *   Lookback Window: [24h, 48h]
*   **Best Configuration Found**:
    *   **Units**: 64
    *   **Dropout**: 0.1
    *   **Lookback**: 24 hours
    *   **Resulting MAE**: ~0.082 kWh

### Phase 3: Regularization & Robustness
To prevent overfitting (especially given the synthetic nature of the target), we applied:
*   **Dropout (0.1)**: Randomly dropping neurons during training to force redundant feature learning.
*   **L2 Regularization**: Applied to LSTM weights to penalize overly complex decision boundaries.
*   **Early Stopping**: Monitoring validation loss and stopping training when it ceased to improve (patience=10 epochs).

## 4. The "Cheating" Model Discovery
Our initial **XGBoost** model achieved a suspicious **0.07% Error**.
Upon investigation, we realized it had "learned" the physics formula directly because we provided the **current hour's wind speed** as a feature.
*   **Problem**: In a real forecast scenario, you don't know the wind speed at time $t$ when predicting energy at time $t$.
*   **Solution**: We removed current weather features and forced the model to rely solely on **past data (lags)**.

## 5. Model Strategy: The Hybrid Ensemble
To balance accuracy with robustness, we developed a two-part ensemble:

### Model A: "Pure Forecast" XGBoost (70% Weight)
*   **Features**: Lags of Energy and Wind Speed (t-1, t-2, t-3, t-6, t-12, t-24, t-48).
*   **Strengths**: Extremely accurate at capturing the non-linear power curve.
*   **Weakness**: Can be brittle if data distribution shifts.

### Model B: LSTM (Long Short-Term Memory) (30% Weight)
*   **Architecture**: Recurrent Neural Network optimized for time-series sequences.
*   **Features**: 24-hour sequence of weather + time encoding (Sine/Cosine).
*   **Strengths**: Captures temporal dynamics and trends better; more stable.
*   **Optimization**: Converted to **ONNX** format for sub-millisecond inference.

## 6. Final Results
We tested the models on a hold-out validation set (last 20% of data).

| Model | MAE (kWh) | RMSE (kWh) | R² Score |
| :--- | :--- | :--- | :--- |
| **XGBoost (Cheating)** | 0.005 | 0.012 | 0.9999 |
| **XGBoost (Pure Forecast)** | 0.042 | 0.085 | 0.9945 |
| **LSTM (Optimized)** | 0.156 | 0.210 | 0.9650 |
| **Ensemble (Final)** | **0.038** | **0.079** | **0.9952** |

## 7. Key Visualizations
*(See `graphs/` folder)*
*   **`comparison_timeseries_zoom.png`**: Shows how closely the Ensemble follows the actual energy curve.
*   **`xgboost_comparison_scatter.png`**: Demonstrates the tight correlation between Predicted vs Actual.
*   **`error_source_analysis.png`**: Reveals that most errors occur during sudden wind gusts (high volatility).

## 8. Production Pipeline
The final submission is a self-contained package in `production/`:
1.  **`inference_ensemble.py`**: Loads models and runs the weighted prediction.
2.  **`models/`**: Contains the trained `.json` (XGBoost), `.onnx` (LSTM), and `.pkl` (Scaler) files.
3.  **`test_submission.py`**: A verification script to prove the pipeline works.

## 9. Delivery Structure
This package contains:
*   `final_delivery/`: This report, sample data, and key graphs.
*   `production/`: The deployment-ready code and models.
*   `wind_analysis/`: Legacy code used for training and experimentation.
*   `results/`: Raw outputs from the training process.

---
