"""
Database connection and query helpers.
"""

import mysql.connector
from mysql.connector import pooling
from backend.config import config
from datetime import datetime
import json

# Connection pool
db_pool = None

def get_pool():
    """Get or create connection pool."""
    global db_pool
    if db_pool is None:
        db_pool = pooling.MySQLConnectionPool(
            pool_name="energy_pool",
            pool_size=5,
            host=config.DB_HOST,
            port=config.DB_PORT,
            user=config.DB_USER,
            password=config.DB_PASSWORD,
            database=config.DB_NAME
        )
    return db_pool

def get_connection():
    """Get connection from pool."""
    return get_pool().get_connection()

def fetch_historic_data(days=40):
    """Fetch last N days of consumption & weather data."""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    
    query = """
        SELECT 
            c.timestamp, 
            c.consumption_kwh, 
            w.temperature_c, 
            w.irradiance_w_m2, 
            w.wind_speed_m_s,
            w.cloud_cover_percent
        FROM consumption_historic c
        LEFT JOIN weather_historic w ON DATE(c.timestamp) = DATE(w.timestamp)
        ORDER BY c.timestamp DESC 
        LIMIT %s
    """
    
    cursor.execute(query, (days,))
    results = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    # Reverse to chronological order
    return results[::-1]

def fetch_forecast_data(forecast_date):
    """Fetch tomorrow's weather forecast."""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    
    query = "SELECT * FROM weather_forecast WHERE forecast_date = %s"
    cursor.execute(query, (forecast_date,))
    result = cursor.fetchone()
    
    cursor.close()
    conn.close()
    
    return result or {}

def store_predictions(predictions, forecast_date, model_version='v1.0'):
    """Store predictions in database."""
    conn = get_connection()
    cursor = conn.cursor()
    
    for source_type, values in predictions.items():
        if isinstance(values, dict):
            # Single value (consumption)
            cursor.execute("""
                INSERT INTO predictions 
                (prediction_date, source_type, predicted_value_kwh, error_margin_kwh, model_version)
                VALUES (%s, %s, %s, %s, %s)
            """, (forecast_date, source_type, values['value'], values['error_margin'], model_version))
        
        elif isinstance(values, list):
            # Multiple panels (PV, wind)
            for panel_data in values:
                panel_id = panel_data.get('panel_id', 1)
                cursor.execute("""
                    INSERT INTO predictions 
                    (prediction_date, source_type, panel_or_source_id, predicted_value_kwh, error_margin_kwh, model_version)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    forecast_date, 
                    source_type, 
                    panel_id, 
                    panel_data['value'], 
                    panel_data['error_margin'], 
                    model_version
                ))
    
    conn.commit()
    cursor.close()
    conn.close()
    print(f"[DB] Stored predictions for {forecast_date}")

def store_decisions(decisions, decision_date):
    """Store Phase 2 decisions in database."""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO decisions 
        (decision_date, pv_activate, wind_activate, pv_activation_reason, wind_activation_reason,
         total_generation_kwh, total_consumption_kwh, battery_bilan_kwh, 
         appliance_schedule, microgrid_action, microgrid_power_kw)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            pv_activate = VALUES(pv_activate),
            wind_activate = VALUES(wind_activate),
            pv_activation_reason = VALUES(pv_activation_reason),
            wind_activation_reason = VALUES(wind_activation_reason),
            total_generation_kwh = VALUES(total_generation_kwh),
            total_consumption_kwh = VALUES(total_consumption_kwh),
            battery_bilan_kwh = VALUES(battery_bilan_kwh),
            appliance_schedule = VALUES(appliance_schedule),
            microgrid_action = VALUES(microgrid_action),
            microgrid_power_kw = VALUES(microgrid_power_kw)
    """, (
        decision_date,
        decisions['sources']['pv']['activate'],
        decisions['sources']['wind_tree']['activate'],
        decisions['sources']['pv']['reason'],
        decisions['sources']['wind_tree']['reason'],
        decisions['totals']['generation_kwh'],
        decisions['totals']['consumption_kwh'],
        decisions['battery']['bilan_kwh'],
        json.dumps(decisions['appliances']),
        decisions['microgrid']['action'],
        decisions['microgrid']['power_kw']
    ))
    
    conn.commit()
    cursor.close()
    conn.close()
    print(f"[DB] Stored decisions for {decision_date}")

def store_anomalies(anomalies, detection_date):
    """Store detected anomalies."""
    if not anomalies:
        return
    
    conn = get_connection()
    cursor = conn.cursor()
    
    for anomaly in anomalies:
        cursor.execute("""
            INSERT INTO anomalies 
            (detection_date, panel_id, anomaly_type, confidence_score, description)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            detection_date,
            anomaly['panel_id'],
            anomaly['type'],
            anomaly['confidence'],
            anomaly['description']
        ))
    
    conn.commit()
    cursor.close()
    conn.close()
    print(f"[DB] Stored {len(anomalies)} anomalies for {detection_date}")

def fetch_actual_generation(from_date, to_date):
    """Fetch actual generation for model evaluation."""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    
    query = """
        SELECT date, source_type, panel_id, total_kwh
        FROM generation_actual
        WHERE date BETWEEN %s AND %s
        ORDER BY date, source_type, panel_id
    """
    
    cursor.execute(query, (from_date, to_date))
    results = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return results
