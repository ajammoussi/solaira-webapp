"""
Continuous learning - monthly model evaluation and retraining.
Schedule as cron job: 0 8 1 * * python -m backend.continuous_learning
"""

import sys
from datetime import datetime, timedelta
from pathlib import Path
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.config import config
from backend.utils.database import get_connection, fetch_actual_generation

def setup_logging():
    """Setup logging."""
    import logging
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(message)s',
        handlers=[
            logging.FileHandler(config.LOG_FILE),
            logging.StreamHandler()
        ]
    )
    return logging.getLogger(__name__)

def evaluate_model_performance(model_name, source_type, days=30):
    """
    Evaluate model performance by comparing predictions vs actuals.
    
    Args:
        model_name: 'pv', 'wind_tree', or 'consumption'
        source_type: Database source_type value
        days: Number of days to evaluate
    
    Returns:
        Dict with metrics: {mae, rmse, r2, n_samples}
    """
    logger = setup_logging()
    
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    
    start_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
    end_date = datetime.now().strftime('%Y-%m-%d')
    
    # Fetch predictions
    cursor.execute("""
        SELECT prediction_date, SUM(predicted_value_kwh) as predicted_kwh
        FROM predictions
        WHERE source_type = %s AND prediction_date BETWEEN %s AND %s
        GROUP BY prediction_date
        ORDER BY prediction_date
    """, (source_type, start_date, end_date))
    predictions = cursor.fetchall()
    
    # Fetch actuals
    cursor.execute("""
        SELECT date, SUM(total_kwh) as actual_kwh
        FROM generation_actual
        WHERE source_type = %s AND date BETWEEN %s AND %s
        GROUP BY date
        ORDER BY date
    """, (source_type, start_date, end_date))
    actuals = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    # Match predictions with actuals by date
    pred_dict = {p['prediction_date'].strftime('%Y-%m-%d'): p['predicted_kwh'] for p in predictions}
    actual_dict = {a['date'].strftime('%Y-%m-%d'): a['actual_kwh'] for a in actuals}
    
    y_true = []
    y_pred = []
    
    for date in pred_dict.keys():
        if date in actual_dict:
            y_pred.append(pred_dict[date])
            y_true.append(actual_dict[date])
    
    if len(y_true) < 5:
        logger.warning(f"[{model_name}] Insufficient data for evaluation (only {len(y_true)} samples)")
        return None
    
    # Compute metrics
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    r2 = r2_score(y_true, y_pred)
    
    logger.info(f"[{model_name}] Evaluation results (last {days} days, {len(y_true)} samples):")
    logger.info(f"  MAE:  {mae:.3f} kWh")
    logger.info(f"  RMSE: {rmse:.3f} kWh")
    logger.info(f"  R²:   {r2:.3f}")
    
    return {
        'mae': mae,
        'rmse': rmse,
        'r2': r2,
        'n_samples': len(y_true)
    }

def log_model_metrics(model_name, model_version, metrics):
    """Store model evaluation metrics in database."""
    if metrics is None:
        return
    
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO model_logs 
        (model_name, model_version, training_date, mae_kwh, rmse_kwh, r2_score)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (
        model_name,
        model_version,
        datetime.now().strftime('%Y-%m-%d'),
        metrics['mae'],
        metrics['rmse'],
        metrics['r2']
    ))
    
    conn.commit()
    cursor.close()
    conn.close()

def run_monthly_evaluation():
    """Run monthly model evaluation and continuous learning."""
    logger = setup_logging()
    
    logger.info("=" * 60)
    logger.info("Starting monthly model evaluation")
    logger.info("=" * 60)
    
    try:
        # Evaluate PV model
        logger.info("Evaluating PV model...")
        pv_metrics = evaluate_model_performance('pv_lstm', 'pv', days=30)
        if pv_metrics:
            log_model_metrics('pv_lstm', 'v1.0', pv_metrics)
            
            # Check if retraining needed
            if pv_metrics['mae'] > 1.5 or pv_metrics['r2'] < 0.7:
                logger.warning("  ⚠ PV model performance degraded! Consider retraining.")
        
        # Evaluate Wind model
        logger.info("Evaluating Wind model...")
        wind_metrics = evaluate_model_performance('wind_lstm', 'wind_tree', days=30)
        if wind_metrics:
            log_model_metrics('wind_lstm', 'v1.0', wind_metrics)
            
            if wind_metrics['mae'] > 1.0 or wind_metrics['r2'] < 0.6:
                logger.warning("  ⚠ Wind model performance degraded! Consider retraining.")
        
        # TODO: Evaluate Consumption model (requires consumption_actual table)
        
        logger.info("=" * 60)
        logger.info("Monthly evaluation completed successfully!")
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error(f"Evaluation FAILED: {e}", exc_info=True)
        sys.exit(1)

if __name__ == '__main__':
    run_monthly_evaluation()
