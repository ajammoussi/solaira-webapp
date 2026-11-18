"""
PV Energy Ensemble Weight Optimization Test

This script helps you find the optimal weights for the XGBoost + LSTM ensemble.
It tests different weight combinations and evaluates their performance.

Usage:
    python ensemble_weight_optimizer.py --data <path_to_test_data.csv>
"""

import os
import sys
import numpy as np
import pandas as pd
import argparse
import json
from datetime import datetime
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import MinMaxScaler

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from inference_ensemble import (
    PVEnergyPredictor,
    WEIGHT_XGB,
    WEIGHT_LSTM,
    prepare_nasa_power_data,
    calculate_pv_system_features,
    prepare_ml_features,
)

# ============================================================================
# FEATURES & CONFIG
# ============================================================================
XGB_FEATURE_COLUMNS = [
    "hour",
    "month",
    "day_of_week",
    "is_weekend",
    "hour_sin",
    "hour_cos",
    "doy_sin",
    "doy_cos",
    "POA_IRRADIANCE",
    "CELL_TEMP_C",
    "TEMP_DERATE",
    "irradiance_wm2",
    "clearness_ratio",
    "T2M",
    "WS10M",
    "RH2M",
    "ac_power_lag_1",
    "ac_power_lag_2",
    "ac_power_lag_3",
    "ac_power_lag_24",
    "poa_irradiance_lag_1",
    "temp_lag_1",
    "ac_power_rolling_3h_mean",
    "ac_power_rolling_6h_std",
    "irradiance_rolling_3h_mean",
]

LSTM_FEATURE_COLUMNS = [
    "ALLSKY_SFC_SW_DWN",
    "POA_IRRADIANCE",
    "T2M",
    "CELL_TEMP_C",
    "TEMP_DERATE",
    "WS10M",
    "RH2M",
    "hour",
    "month",
    "clearness_ratio",
]


def calculate_metrics(y_true, y_pred):
    """Calculate comprehensive evaluation metrics"""
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    r2 = r2_score(y_true, y_pred)

    with np.errstate(divide="ignore", invalid="ignore"):
        mape = np.mean(np.abs((y_true - y_pred) / np.maximum(y_true, 0.001))) * 100
        total_energy_error = (
            np.abs(y_true.sum() - y_pred.sum()) / max(y_true.sum(), 0.001) * 100
        )

    return {
        "MAE": mae,
        "RMSE": rmse,
        "R²": r2,
        "MAPE": mape,
        "Total_Energy_Error_%": total_energy_error,
    }


def test_ensemble_weights(
    predictor, test_data, weight_xgb, weight_lstm, scaler_y_max, time_steps=24
):
    """Test a specific weight combination."""
    predictions = []
    actuals = []

    start_idx = max(time_steps, 48)

    for i in range(start_idx, len(test_data)):
        actual = test_data.iloc[i]["AC_POWER_KW"]

        try:
            # --- XGBoost ---
            xgb_input = test_data.iloc[[i]][XGB_FEATURE_COLUMNS]
            xgb_pred = predictor.xgb_model.predict(xgb_input)[0]

            # --- LSTM  ---
            history = test_data.iloc[:i]
            lstm_data = history[LSTM_FEATURE_COLUMNS].iloc[-time_steps:].values
            lstm_scaled = predictor.scaler.transform(lstm_data)
            lstm_input = lstm_scaled.reshape(
                1, time_steps, len(LSTM_FEATURE_COLUMNS)
            ).astype(np.float32)

            lstm_raw = predictor.lstm_session.run(
                [predictor.lstm_output_name], {predictor.lstm_input_name: lstm_input}
            )[0][0][0]
            lstm_pred = lstm_raw * scaler_y_max

            # --- Ensemble ---
            ensemble_pred = (weight_xgb * xgb_pred) + (weight_lstm * lstm_pred)

            predictions.append(max(0.0, ensemble_pred))
            actuals.append(actual)

        except Exception:
            continue

    return calculate_metrics(np.array(actuals), np.array(predictions))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=str, required=True, help="Path to test data CSV")
    parser.add_argument("--step", type=float, default=0.05, help="Step size")
    parser.add_argument("--output", type=str, default="weight_test_results.csv")
    args = parser.parse_args()

    print("=" * 60)
    print("PV Energy Ensemble Weight Optimization")
    print("=" * 60)

    # 1. Load Data
    print(f"\n📂 Loading test data from: {args.data}")
    test_data = pd.read_csv(args.data)

    # 2. Preprocessing
    print("\n🔧 Preprocessing data...")
    test_data = prepare_nasa_power_data(test_data)

    # Use capacity=1 to match training normalization logic usually
    # But if training used 6.56, the LSTM outputs 0-1 for 0-6.56 range.
    # The normalization handles this via scaler_y_max.
    system_params = {
        "capacity_kw": 1,
        "dc_ac_ratio": 1.2,
        "inverter_eff": 0.96,
        "temp_coeff": -0.0045,
        "system_losses": 0.14,
        "tilt": 30,
        "soiling_loss": 0.02,
        "ref_temp": 25,
        "noct": 45,
    }
    test_data = calculate_pv_system_features(test_data, system_params)
    test_data = prepare_ml_features(test_data)

    # --- Handle NaNs to preserve Night Hours ---
    print("   🚑 Fixing NaNs in clearness_ratio (Filling 0 for night)...")
    if "clearness_ratio" in test_data.columns:
        test_data["clearness_ratio"] = test_data["clearness_ratio"].fillna(0)

    # Now only drop the initial rows caused by Lags (first 24 hrs)
    initial_len = len(test_data)
    test_data = test_data.dropna()
    dropped = initial_len - len(test_data)
    print(
        f"   ✅ Dropped {dropped} rows (Initial lags only). Kept {len(test_data)} rows."
    )
    print(f"   ℹ️  Note: Night hours are now PRESERVED.")

    # 3. Initialize Models
    print("\n🔧 Initializing Models...")
    predictor = PVEnergyPredictor()

    # 4. Setup Scalers (Crucial for LSTM)
    # Fit scaler on the FULL test dataset (Day + Night) to get correct Min/Max
    print("   ⚖️  Fitting Input Scaler on full test set...")
    predictor.scaler.fit(test_data[LSTM_FEATURE_COLUMNS].values)

    # Determine Output Scaler Max (Proxy for training scaler)
    # The LSTM output is 0-1. We need to map 1.0 back to Max kW.
    # We use the max power in the test set as the reference capacity.
    scaler_y_max = test_data["AC_POWER_KW"].max()
    print(f"   ⚖️  Output Inverse Scaling Factor: {scaler_y_max:.4f} kW")

    # 5. Run Tests
    # We pass scaler_y_max to the test function
    print("\n" + "=" * 60)
    print("Testing Individual Models")
    print("=" * 60)

    # Run a quick check with weights 1.0/0.0 and 0.0/1.0
    xgb_metrics = test_ensemble_weights(predictor, test_data, 1.0, 0.0, scaler_y_max)
    lstm_metrics = test_ensemble_weights(predictor, test_data, 0.0, 1.0, scaler_y_max)

    print("\n📊 XGBoost-Only Performance:")
    for k, v in xgb_metrics.items():
        print(f"   {k}: {v:.4f}")

    print("\n📊 LSTM-Only Performance:")
    for k, v in lstm_metrics.items():
        print(f"   {k}: {v:.4f}")

    # 6. Grid Search
    print("\n" + "=" * 60)
    print("Grid Search for Optimal Weights")
    print("=" * 60)

    results = []
    for weight_xgb in np.arange(0.0, 1.001, args.step):
        weight_lstm = 1.0 - weight_xgb
        print(f"🔍 Testing: XGB={weight_xgb:.2f}, LSTM={weight_lstm:.2f}", end="\r")
        m = test_ensemble_weights(
            predictor, test_data, weight_xgb, weight_lstm, scaler_y_max
        )
        m["Weight_XGB"] = weight_xgb
        m["Weight_LSTM"] = weight_lstm
        results.append(m)

    results_df = pd.DataFrame(results)
    results_df.to_csv(args.output, index=False)

    print(f"\n✅ Results saved to {args.output}")

    best_r2 = results_df.loc[results_df["R²"].idxmax()]
    print("\n✅ RECOMMENDATION (Best R²):")
    print(f"   XGB Weight:  {best_r2['Weight_XGB']:.2f}")
    print(f"   LSTM Weight: {best_r2['Weight_LSTM']:.2f}")
    print(f"   Result R²:   {best_r2['R²']:.4f}")


if __name__ == "__main__":
    main()