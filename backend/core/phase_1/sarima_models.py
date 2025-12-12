from src.phase_1.data_processing import get_common_train_test_split

import pandas as pd
import numpy as np
import itertools
from tqdm import tqdm
import warnings
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_squared_error, mean_absolute_error
from statsmodels.tsa.statespace.sarimax import SARIMAX
from sklearn.linear_model import LinearRegression, RidgeCV
import sys
import os

proj_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if proj_root not in sys.path:
    sys.path.insert(0, proj_root)


def create_regression_baseline(df):
    """
    Enhanced seasonal decomposition with more flexible patterns
    """
    print("Converting hourly data to daily aggregation for SARIMA analysis...")
    
    # Aggregate hourly data to daily for faster processing
    daily_production = df['AC_POWER_KW'].resample('D').sum()
    daily_irradiance_mean = df['ALLSKY_SFC_SW_DWN'].resample('D').mean()
    daily_temp_mean = df['T2M'].resample('D').mean()
    
    # Create daily dataframe
    daily_df = pd.DataFrame({
        'production': daily_production,
        'irradiance': daily_irradiance_mean,
        'temperature': daily_temp_mean
    })
    
    # Filter out days with very low production and handle missing values
    daily_df = daily_df[daily_df['production'] > 0.1].copy()
    daily_df = daily_df.fillna(method='ffill').fillna(method='bfill')
    
    # Ensure frequency is set
    daily_df.index.freq = 'D'
    
    print(f"Daily samples: {len(daily_df)} (reduced from {len(df)} hourly samples)")
    
    # Use common split
    split_info = get_common_train_test_split(daily_df, test_start_date='2025-01-01')
    train_mask = split_info['train_mask']
    test_mask = split_info['test_mask']
    
    # Define feature columns
    available_cols = ['irradiance', 'temperature']
    
    # Create features matrix
    X = daily_df[available_cols].fillna(0)
    y = daily_df['production']
    
    # Apply common split
    X_train, X_test = X[train_mask], X[test_mask]
    y_train, y_test = y[train_mask], y[test_mask]
    
    # Fit linear regression
    lr_model = LinearRegression()
    lr_model.fit(X_train, y_train)
    
    # Get predictions and residuals
    y_pred_train = lr_model.predict(X_train)
    y_pred_test = lr_model.predict(X_test)
    
    train_residual = y_train - y_pred_train
    test_residual = y_test - y_pred_test
    
    # Ensure residuals have proper frequency
    train_residual.index.freq = 'D'
    test_residual.index.freq = 'D'
    
    # Create train and test dataframes
    train_data = daily_df[train_mask].copy()
    test_data = daily_df[test_mask].copy()
    
    train_data['baseline_pred'] = y_pred_train
    train_data['residual'] = train_residual
    
    test_data['baseline_pred'] = y_pred_test
    test_data['residual'] = test_residual
    
    # Calculate baseline metrics
    baseline_mae = mean_absolute_error(y_test, y_pred_test)
    baseline_rmse = np.sqrt(mean_squared_error(y_test, y_pred_test))
    
    print(f"Baseline Linear Regression - MAE: {baseline_mae:.4f}, RMSE: {baseline_rmse:.4f}")
    
    # IMPROVED seasonal modeling - more adaptive
    print("Adding ADAPTIVE seasonal components...")
    
    train_data['doy'] = train_data.index.dayofyear
    test_data['doy'] = test_data.index.dayofyear
    
    # Primary annual cycle + quarterly variations
    train_data['sin1'] = np.sin(2 * np.pi * train_data['doy'] / 365.25)
    train_data['cos1'] = np.cos(2 * np.pi * train_data['doy'] / 365.25)
    train_data['sin2'] = np.sin(4 * np.pi * train_data['doy'] / 365.25)  # Semi-annual
    train_data['cos2'] = np.cos(4 * np.pi * train_data['doy'] / 365.25)
    
    test_data['sin1'] = np.sin(2 * np.pi * test_data['doy'] / 365.25)
    test_data['cos1'] = np.cos(2 * np.pi * test_data['doy'] / 365.25)
    test_data['sin2'] = np.sin(4 * np.pi * test_data['doy'] / 365.25)
    test_data['cos2'] = np.cos(4 * np.pi * test_data['doy'] / 365.25)
    
    # Simple linear trend
    train_trend = np.arange(len(train_data)) / len(train_data)
    test_trend = np.arange(len(train_data), len(train_data) + len(test_data)) / len(train_data)
    
    train_data['trend'] = train_trend
    test_data['trend'] = test_trend
    
    # CRITICAL: Use moderate regularization, not extreme
    seasonal_features = ['sin1', 'cos1', 'sin2', 'cos2', 'trend']
    X_seasonal_train = train_data[seasonal_features].values
    
    # Moderate regularization - was too strong before
    seasonal_model = RidgeCV(alphas=[0.1, 1.0, 10.0, 50.0])
    seasonal_model.fit(X_seasonal_train, train_data['production'])
    
    # Get seasonal predictions
    train_data['seasonal'] = seasonal_model.predict(X_seasonal_train)
    X_seasonal_test = test_data[seasonal_features].values
    test_data['seasonal'] = seasonal_model.predict(X_seasonal_test)
    
    # Update residuals to remove seasonal component
    train_data['residual'] = train_data['production'] - train_data['seasonal']
    test_data['residual'] = test_data['production'] - test_data['seasonal']
    
    print(f"Seasonal model R²: {seasonal_model.score(X_seasonal_train, train_data['production']):.4f}")
    print(f"Regularization alpha used: {seasonal_model.alpha_}")
    print(f"Residual std: {train_data['residual'].std():.4f}")
    
    return train_data, test_data, lr_model, available_cols

def prepare_exogenous_features(train_data, test_data, feature_cols):
    """
    Enhanced exogenous features with weather momentum
    """
    # Robust normalization for irradiance
    irrad_median = train_data['irradiance'].median()
    irrad_mad = (train_data['irradiance'] - irrad_median).abs().median()
    
    if irrad_mad > 0:
        train_data['irrad_norm'] = (train_data['irradiance'] - irrad_median) / irrad_mad
        test_data['irrad_norm'] = (test_data['irradiance'] - irrad_median) / irrad_mad
    else:
        train_data['irrad_norm'] = 0
        test_data['irrad_norm'] = 0
    
    # Clip extreme outliers
    train_data['irrad_norm'] = np.clip(train_data['irrad_norm'], -3, 3)
    test_data['irrad_norm'] = np.clip(test_data['irrad_norm'], -3, 3)
    
    # Day-to-day change
    train_data['irrad_change'] = train_data['irradiance'].diff().fillna(0)
    test_data['irrad_change'] = test_data['irradiance'].diff().fillna(0)
    
    change_std = train_data['irrad_change'].std()
    if change_std > 0:
        train_data['irrad_change_norm'] = train_data['irrad_change'] / change_std
        test_data['irrad_change_norm'] = test_data['irrad_change'] / change_std
    else:
        train_data['irrad_change_norm'] = 0
        test_data['irrad_change_norm'] = 0
    
    train_data['irrad_change_norm'] = np.clip(train_data['irrad_change_norm'], -3, 3)
    test_data['irrad_change_norm'] = np.clip(test_data['irrad_change_norm'], -3, 3)
    
    # CRITICAL: Add 1-day lag to capture weather persistence
    train_data['irrad_lag1'] = train_data['irrad_norm'].shift(1).fillna(train_data['irrad_norm'].iloc[0])
    test_data['irrad_lag1'] = test_data['irrad_norm'].shift(1)
    test_data['irrad_lag1'].iloc[0] = train_data['irrad_norm'].iloc[-1]  # Use last train value
    
    # Add moving average (3-day weather smoothing)
    train_data['irrad_ma3'] = train_data['irrad_norm'].rolling(window=3, min_periods=1).mean()
    test_data['irrad_ma3'] = test_data['irrad_norm'].rolling(window=3, min_periods=1).mean()
    # Fill first values from train
    if test_data['irrad_ma3'].isna().any():
        test_data['irrad_ma3'].fillna(method='bfill', inplace=True)
    
    # Prepare exogenous arrays with multiple weather perspectives
    exog_train = train_data[['irrad_norm', 'irrad_change_norm', 'irrad_lag1', 'irrad_ma3']].values
    exog_test = test_data[['irrad_norm', 'irrad_change_norm', 'irrad_lag1', 'irrad_ma3']].values
    
    print(f"Exogenous variables: level, change, lag, moving average (4 features)")
    print(f"Train stats - Level: {exog_train[:,0].std():.3f}, Change: {exog_train[:,1].std():.3f}")
    
    return exog_train, exog_test, None

def find_best_sarima_model(train_residual, exog_train_scaled):
    """
    Two-stage search with expanded quick scan
    """
    print("\n=== Finding Best SARIMA Model (Smart Search) ===")
    
    # STAGE 1: Expanded quick scan with proven configurations
    print("Stage 1: Quick parameter scan...")
    quick_params = [
        # Simple non-seasonal
        ((1, 0, 1), (0, 0, 0, 0)),
        ((2, 0, 1), (0, 0, 0, 0)),
        ((2, 0, 2), (0, 0, 0, 0)),
        ((3, 0, 2), (0, 0, 0, 0)),
        ((3, 0, 3), (0, 0, 0, 0)),
        # With weekly seasonality
        ((1, 0, 1), (1, 0, 0, 7)),
        ((2, 0, 1), (1, 0, 0, 7)),
        ((2, 0, 2), (1, 0, 0, 7)),
        # With differencing (capture trends better)
        ((1, 1, 1), (0, 0, 0, 0)),
        ((2, 1, 1), (0, 0, 0, 0)),
    ]
    
    tscv = TimeSeriesSplit(n_splits=3)
    stage1_results = []
    
    for order, seasonal_order in tqdm(quick_params, desc="Quick scan"):
        try:
            cv_scores = []
            
            for train_idx, val_idx in tscv.split(train_residual):
                try:
                    y_cv_train = train_residual.iloc[train_idx]
                    y_cv_val = train_residual.iloc[val_idx]
                    exog_cv_train = exog_train_scaled[train_idx]
                    exog_cv_val = exog_train_scaled[val_idx]
                    
                    model = SARIMAX(
                        y_cv_train,
                        exog=exog_cv_train,
                        order=order,
                        seasonal_order=seasonal_order,
                        enforce_stationarity=True,
                        enforce_invertibility=True
                    )
                    
                    with warnings.catch_warnings():
                        warnings.simplefilter("ignore")
                        result = model.fit(disp=False, maxiter=100, method='lbfgs')
                    
                    pred = result.forecast(steps=len(val_idx), exog=exog_cv_val)
                    
                    if not np.isnan(pred).any():
                        rmse = np.sqrt(mean_squared_error(y_cv_val, pred))
                        cv_scores.append(rmse)
                            
                except Exception:
                    continue
            
            if len(cv_scores) > 0:
                avg_score = np.mean(cv_scores)
                n_params = sum(order[:2]) + order[2] + sum(seasonal_order[:3])
                penalty = n_params * 0.025  # Slightly lighter penalty
                stage1_results.append((order, seasonal_order, avg_score, avg_score + penalty, n_params))
                
        except Exception:
            continue
    
    # Sort and show top 3
    stage1_results.sort(key=lambda x: x[3])
    
    print(f"\nStage 1 Top 3:")
    for i, res in enumerate(stage1_results[:3]):
        seasonal_str = f"x{res[1]}" if res[1] != (0,0,0,0) else ""
        print(f"{i+1}. ARIMA{res[0]}{seasonal_str} - RMSE: {res[2]:.4f}, Score: {res[3]:.4f}")
    
    best_base = stage1_results[0]
    
    # STAGE 2: Focused refinement around best
    print("\nStage 2: Refining around best...")
    p_best, d_best, q_best = best_base[0]
    s_best = best_base[1]
    
    # Carefully expand around best
    refined_params = set()
    
    # Variations around best non-seasonal params
    for p in [max(1, p_best-1), p_best, min(4, p_best+1)]:
        for q in [max(1, q_best-1), q_best, min(3, q_best+1)]:
            refined_params.add(((p, d_best, q), (0, 0, 0, 0)))
            # Add seasonal version if params are reasonable
            if p <= 2 and q <= 2:
                refined_params.add(((p, d_best, q), (1, 0, 0, 7)))
    
    # If best had seasonality, explore variations
    if s_best != (0, 0, 0, 0):
        refined_params.add(((p_best, d_best, q_best), (1, 0, 1, 7)))  # Add seasonal MA
        refined_params.add(((p_best, d_best, q_best), (0, 0, 1, 7)))  # Seasonal MA only
    
    refined_params = list(refined_params)
    
    refined_results = []
    for order, seasonal_order in tqdm(refined_params, desc="Refinement"):
        try:
            cv_scores = []
            
            for train_idx, val_idx in tscv.split(train_residual):
                try:
                    y_cv_train = train_residual.iloc[train_idx]
                    y_cv_val = train_residual.iloc[val_idx]
                    exog_cv_train = exog_train_scaled[train_idx]
                    exog_cv_val = exog_train_scaled[val_idx]
                    
                    model = SARIMAX(
                        y_cv_train,
                        exog=exog_cv_train,
                        order=order,
                        seasonal_order=seasonal_order,
                        enforce_stationarity=True,
                        enforce_invertibility=True
                    )
                    
                    with warnings.catch_warnings():
                        warnings.simplefilter("ignore")
                        result = model.fit(disp=False, maxiter=150, method='lbfgs')
                    
                    pred = result.forecast(steps=len(val_idx), exog=exog_cv_val)
                    
                    if not np.isnan(pred).any():
                        rmse = np.sqrt(mean_squared_error(y_cv_val, pred))
                        cv_scores.append(rmse)
                            
                except Exception:
                    continue
            
            if len(cv_scores) > 0:
                avg_score = np.mean(cv_scores)
                n_params = sum(order[:2]) + order[2] + sum(seasonal_order[:3])
                penalty = n_params * 0.025
                refined_results.append((order, seasonal_order, avg_score, avg_score + penalty, n_params))
                
        except Exception:
            continue
    
    # Combine stage 1 and stage 2, find overall best
    all_results = stage1_results + refined_results
    all_results.sort(key=lambda x: x[3])
    
    print(f"\nFINAL TOP 5 MODELS:")
    for i, res in enumerate(all_results[:5]):
        seasonal_str = f"x{res[1]}" if res[1] != (0,0,0,0) else ""
        print(f"{i+1}. ARIMA{res[0]}{seasonal_str} - RMSE: {res[2]:.4f}, Score: {res[3]:.4f}, Params: {res[4]}")
    
    best_order = all_results[0][0]
    best_seasonal = all_results[0][1]
    
    seasonal_str = f"x{best_seasonal}" if best_seasonal != (0,0,0,0) else ""
    print(f"\n✓ SELECTED: ARIMA{best_order}{seasonal_str}")
    
    return best_order, best_seasonal


def train_final_sarima_model(train_residual, test_residual, exog_train_scaled, exog_test_scaled, 
                           best_order, best_seasonal):
    """
    Train final model with optimal settings
    """
    print("\n=== Training Final SARIMA Model ===")
    seasonal_str = f"x{best_seasonal}" if best_seasonal != (0,0,0,0) else ""
    print(f"Model: ARIMA{best_order}{seasonal_str}")
    
    # Train with extended iterations for convergence
    final_model = SARIMAX(
        train_residual,
        exog=exog_train_scaled,
        order=best_order,
        seasonal_order=best_seasonal,
        enforce_stationarity=True,
        enforce_invertibility=True,
        # Add slight trend if differencing is used
        trend='c' if best_order[1] > 0 else None
    )
    
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        final_result = final_model.fit(
            disp=False,
            maxiter=250,  # More iterations for final fit
            warn_convergence=False,
            method='lbfgs',
            low_memory=True
        )
    
    # Make predictions
    sarima_pred_residual = final_result.forecast(steps=len(test_residual), exog=exog_test_scaled)
    train_pred_residual = final_result.fittedvalues
    
    # Calculate metrics
    residual_mae = mean_absolute_error(test_residual, sarima_pred_residual)
    residual_rmse = np.sqrt(mean_squared_error(test_residual, sarima_pred_residual))
    
    print(f"SARIMA Residual Prediction - MAE: {residual_mae:.4f}, RMSE: {residual_rmse:.4f}")
    print(f"Model AIC: {final_result.aic:.2f}, BIC: {final_result.bic:.2f}")
    print(f"Converged: {final_result.mle_retvals['converged']}")
    
    return final_result, sarima_pred_residual, train_pred_residual

def evaluate_sarima_performance(test_data, train_data, sarima_pred_residual, train_pred_residual):
    """
    Evaluate the complete SARIMA model performance (seasonal + residual predictions)
    """
    # Combined prediction = seasonal + SARIMA residual prediction
    sarima_combined_pred = test_data['seasonal'] + sarima_pred_residual
    # Clip to avoid negative values
    sarima_combined_pred = np.clip(sarima_combined_pred, 0, None)
    
    # Training predictions for overfitting analysis
    train_combined_pred = train_data['seasonal'] + train_pred_residual
    train_combined_pred = np.clip(train_combined_pred, 0, None)
    
    # Calculate final metrics
    actual = test_data['production']
    train_actual = train_data['production']
    
    sarima_mae = mean_absolute_error(actual, sarima_combined_pred)
    sarima_rmse = np.sqrt(mean_squared_error(actual, sarima_combined_pred))
    
    # Training metrics for overfitting analysis
    train_mae = mean_absolute_error(train_actual, train_combined_pred)
    train_rmse = np.sqrt(mean_squared_error(train_actual, train_combined_pred))
    
    # R² scores
    from sklearn.metrics import r2_score
    test_r2 = r2_score(actual, sarima_combined_pred)
    train_r2 = r2_score(train_actual, train_combined_pred)
    
    # Also calculate seasonal-only metrics for comparison
    seasonal_mae = mean_absolute_error(actual, test_data['seasonal'])
    seasonal_rmse = np.sqrt(mean_squared_error(actual, test_data['seasonal']))
    
    # Overfitting ratios
    overfitting_mae = sarima_mae / train_mae if train_mae > 0 else float('inf')
    overfitting_rmse = sarima_rmse / train_rmse if train_rmse > 0 else float('inf')
    
    print("\n" + "="*80)
    print("FINAL SARIMA RESULTS")
    print("="*80)
    print("Overall Performance:")
    print(f"  Test RMSE:        {sarima_rmse:.4f} kWh")
    print(f"  Test MAE:         {sarima_mae:.4f} kWh")
    print(f"  Test R²:          {test_r2:.4f}")
    print("\nTraining Performance:")
    print(f"  Train RMSE:       {train_rmse:.4f} kWh")
    print(f"  Train MAE:        {train_mae:.4f} kWh") 
    print(f"  Train R²:         {train_r2:.4f}")
    print("\nGeneralization:")
    print(f"  Overfitting:      {overfitting_rmse:.2f}x {'✓' if overfitting_rmse < 2 else '⚠️'}")
    print(f"  MAE Overfitting:  {overfitting_mae:.2f}x")
    print("\nComparison to Seasonal Baseline:")
    print(f"  Seasonal Only    - MAE: {seasonal_mae:.4f}, RMSE: {seasonal_rmse:.4f}")
    print(f"  SARIMA Combined  - MAE: {sarima_mae:.4f}, RMSE: {sarima_rmse:.4f}")
    print(f"  Improvement      - MAE: {((seasonal_mae - sarima_mae) / seasonal_mae * 100):+.1f}%, "
          f"RMSE: {((seasonal_rmse - sarima_rmse) / seasonal_rmse * 100):+.1f}%")
    print("\n  Target: < 1.5x for good generalization")
    print("="*80)
    
    sarima_metrics = {
        'MAE': sarima_mae,
        'RMSE': sarima_rmse,
        'R²': test_r2,
        'Train_MAE': train_mae,
        'Train_RMSE': train_rmse,
        'Train_R²': train_r2,
        'Overfitting_RMSE': overfitting_rmse,
        'Overfitting_MAE': overfitting_mae,
        'Baseline_MAE': seasonal_mae,
        'Baseline_RMSE': seasonal_rmse,
        'MAE_Improvement_%': (seasonal_mae - sarima_mae) / seasonal_mae * 100,
        'RMSE_Improvement_%': (seasonal_rmse - sarima_rmse) / seasonal_rmse * 100,
        'predictions': sarima_combined_pred,
        'train_predictions': train_combined_pred,
        'baseline_predictions': test_data['seasonal'],
        'residual_predictions': sarima_pred_residual
    }
    
    return sarima_metrics


def plot_sarima_results(train_data, test_data, sarima_metrics, best_order, best_seasonal):
    """
    Create comprehensive SARIMA visualization like the original notebook
    """
    import matplotlib.pyplot as plt
    import pandas as pd
    
    # Extract data for plotting
    train_actual = train_data['production'].values
    test_actual = test_data['production'].values
    
    forecast_series = pd.Series(sarima_metrics['predictions'], index=test_data.index)
    train_pred_series = pd.Series(sarima_metrics['train_predictions'], index=train_data.index)
    
    # Create the comprehensive visualization
    fig = plt.figure(figsize=(16, 14))
    gs = fig.add_gridspec(4, 2, hspace=0.3, wspace=0.3)
    
    # Plot 1: Full time series (top, full width)
    ax1 = fig.add_subplot(gs[0, :])
    ax1.plot(train_data.index, train_actual, 
             label='Train Actual', alpha=0.5, linewidth=1, color='steelblue')
    ax1.plot(train_data.index, train_pred_series,
             label='Train Fit', alpha=0.6, linewidth=1, color='navy')
    ax1.plot(test_data.index, test_actual, 
             label='Test Actual', color='darkorange', linewidth=2, alpha=0.8)
    ax1.plot(forecast_series.index, forecast_series, 
             label='Forecast', color='darkgreen', linewidth=2.5)
    
    seasonal_label = f"x{best_seasonal}" if best_seasonal != (0,0,0,0) else ""
    ax1.set_title(f'Daily PV Production | Model: ARIMA{best_order}{seasonal_label}', fontsize=14, fontweight='bold')
    ax1.set_ylabel('Production (kWh)', fontsize=11)
    ax1.legend(loc='upper left', fontsize=10, ncol=2)
    ax1.grid(True, alpha=0.3)
    
    # Plot 2: Test period zoom
    ax2 = fig.add_subplot(gs[1, :])
    ax2.plot(test_data.index, test_actual, 
             label='Actual', color='darkorange', linewidth=2.5, marker='o', markersize=4)
    ax2.plot(forecast_series.index, forecast_series, 
             label='Forecast', color='darkgreen', linewidth=2.5, marker='s', markersize=3)
    ax2.plot(test_data.index, test_data['seasonal'],
             label='Seasonal Component', color='purple', linewidth=2, linestyle='--', alpha=0.7)
    ax2.set_title('Test Period: Forecast Tracking (Seasonal + Residual)', 
                  fontsize=13, fontweight='bold')
    ax2.set_ylabel('Production (kWh)', fontsize=11)
    ax2.legend(loc='best', fontsize=10)
    ax2.grid(True, alpha=0.3)
    
    # Plot 3: Residuals over time
    ax3 = fig.add_subplot(gs[2, 0])
    errors = test_actual - forecast_series.values
    colors = np.where(np.abs(errors) > 1, 'red', np.where(np.abs(errors) > 0.5, 'orange', 'green'))
    ax3.scatter(test_data.index, errors, c=colors, alpha=0.6, s=50, edgecolors='black', linewidth=0.5)
    ax3.axhline(0, color='black', linestyle='--', linewidth=2)
    ax3.axhline(errors.mean(), color='blue', linestyle='--', linewidth=1.5, 
                label=f'Mean: {errors.mean():.3f}')
    ax3.fill_between(test_data.index, -0.5, 0.5, alpha=0.15, color='green', label='±0.5 kWh')
    ax3.set_title('Forecast Errors Over Time', fontsize=12, fontweight='bold')
    ax3.set_xlabel('Date', fontsize=10)
    ax3.set_ylabel('Error (kWh)', fontsize=10)
    ax3.legend(fontsize=9)
    ax3.grid(True, alpha=0.3)
    
    # Plot 4: Error distribution
    ax4 = fig.add_subplot(gs[2, 1])
    ax4.hist(errors, bins=30, edgecolor='black', alpha=0.7, color='steelblue')
    ax4.axvline(0, color='red', linestyle='--', linewidth=2, label='Zero')
    ax4.axvline(errors.mean(), color='green', linestyle='--', linewidth=2,
                label=f'Mean: {errors.mean():.3f}')
    ax4.set_xlabel('Error (kWh)', fontsize=10)
    ax4.set_ylabel('Frequency', fontsize=10)
    ax4.set_title('Error Distribution', fontsize=12, fontweight='bold')
    ax4.legend(fontsize=9)
    ax4.grid(True, alpha=0.3)
    
    # Plot 5: Actual vs Predicted
    ax5 = fig.add_subplot(gs[3, 0])
    ax5.scatter(test_actual, forecast_series, alpha=0.6, s=80, 
               edgecolors='black', linewidth=0.5, color='steelblue')
    min_val = min(test_actual.min(), forecast_series.min())
    max_val = max(test_actual.max(), forecast_series.max())
    ax5.plot([min_val, max_val], [min_val, max_val], 'r--', linewidth=2, label='Perfect')
    ax5.set_xlabel('Actual (kWh)', fontsize=10)
    ax5.set_ylabel('Predicted (kWh)', fontsize=10)
    ax5.set_title('Actual vs Predicted', fontsize=12, fontweight='bold')
    ax5.legend(fontsize=9)
    ax5.grid(True, alpha=0.3)
    
    # Plot 6: Residual component analysis
    ax6 = fig.add_subplot(gs[3, 1])
    ax6.plot(test_data.index, test_data['residual'], 
             label='Actual Residual', color='orange', linewidth=1.5, alpha=0.7)
    ax6.plot(test_data.index, sarima_metrics['residual_predictions'], 
             label='Predicted Residual', color='green', linewidth=1.5)
    ax6.axhline(0, color='black', linestyle='--', linewidth=1, alpha=0.5)
    ax6.fill_between(test_data.index, 0, test_data['residual'], alpha=0.2, color='orange')
    ax6.set_title('Residual Component (After Seasonal Removal)', fontsize=12, fontweight='bold')
    ax6.set_xlabel('Date', fontsize=10)
    ax6.set_ylabel('Residual (kWh)', fontsize=10)
    ax6.legend(fontsize=9)
    ax6.grid(True, alpha=0.3)
    
    plt.suptitle(f'SARIMA Model Analysis | Test RMSE: {sarima_metrics["RMSE"]:.3f} | Overfitting: {sarima_metrics["Overfitting_RMSE"]:.2f}x', 
                 fontsize=15, fontweight='bold', y=0.995)
    plt.tight_layout()
    
    # Save the figure
    import os
    os.makedirs('results/sarima', exist_ok=True)
    plt.savefig('results/sarima/sarima_analysis.png', dpi=150, bbox_inches='tight')
    print("   ✅ SARIMA analysis plot saved to: results/sarima/sarima_analysis.png")
    
    plt.show()


def plot_sarima_diagnostics(sarima_model):
    """
    Plot SARIMA model diagnostics
    """
    import matplotlib.pyplot as plt
    
    try:
        sarima_model.plot_diagnostics(figsize=(14, 10))
        plt.suptitle('SARIMA Diagnostics (Residual Component)', fontsize=13, fontweight='bold')
        plt.tight_layout()
        
        # Save the figure
        import os
        os.makedirs('results/sarima', exist_ok=True)
        plt.savefig('results/sarima/sarima_diagnostics.png', dpi=150, bbox_inches='tight')
        print("   ✅ SARIMA diagnostics plot saved to: results/sarima/sarima_diagnostics.png")
        
        plt.show()
    except Exception as e:
        print(f"Could not generate diagnostics: {e}")


def run_sarima_experiment(df):
    """
    Main function to run the complete SARIMA experiment
    Uses get_common_train_test_split() for consistent data splitting across all models
    
    Data split: 2022-01-01 to 2024-12-31 (training) | 2025-01-01 to 2025-01-31 (test)
    """
    print("=== STARTING SARIMA EXPERIMENT ===")
    
    # Step 1: Create regression baseline with common split  
    train_data, test_data, lr_model, feature_cols = create_regression_baseline(df)
    
    # Step 2: Prepare simplified exogenous features  
    exog_train_scaled, exog_test_scaled, _ = prepare_exogenous_features(
        train_data, test_data, feature_cols
    )
    
    # Step 3: Find best SARIMA model
    best_order, best_seasonal = find_best_sarima_model(
        train_data['residual'], exog_train_scaled
    )
    
    # Step 4: Train final model
    final_result, sarima_pred_residual, train_pred_residual = train_final_sarima_model(
        train_data['residual'], test_data['residual'], 
        exog_train_scaled, exog_test_scaled, 
        best_order, best_seasonal
    )
    
    # Step 5: Evaluate performance
    sarima_metrics = evaluate_sarima_performance(test_data, train_data, sarima_pred_residual, train_pred_residual)
    
    # Step 6: Create comprehensive visualizations
    print("\n🎨 Creating SARIMA visualization plots...")
    plot_sarima_results(train_data, test_data, sarima_metrics, best_order, best_seasonal)
    
    # Step 7: Plot model diagnostics
    print("📊 Creating SARIMA diagnostic plots...")
    plot_sarima_diagnostics(final_result)
    
    return {
        'sarima_metrics': sarima_metrics,
        'train_data': train_data,
        'test_data': test_data,
        'lr_model': lr_model,
        'sarima_model': final_result,
        'feature_cols': feature_cols,
        'best_order': best_order,
        'best_seasonal': best_seasonal
    }