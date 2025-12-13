"""Database utilities for MySQL operations."""
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv
import os
from datetime import datetime, timedelta

# Load environment variables
try:
    load_dotenv()
except Exception:
    pass

# MySQL connection config
MYSQL_CONFIG = {
    'host': os.getenv('MYSQL_HOST', 'localhost'),
    'user': os.getenv('MYSQL_USER', 'root'),
    'password': os.getenv('MYSQL_PASSWORD', ''),
    'database': os.getenv('MYSQL_DATABASE', 'solaira_energy'),
}

def get_connection():
    """Create and return a MySQL connection."""
    try:
        conn = mysql.connector.connect(**MYSQL_CONFIG)
        return conn
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        raise


def execute_query(query, params=None, fetch_one=False):
    """Execute a SELECT query and return results."""
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, params or [])
        
        if fetch_one:
            result = cursor.fetchone()
        else:
            result = cursor.fetchall()
        
        cursor.close()
        conn.close()
        return result
    except Error as e:
        print(f"Error executing query: {e}")
        raise

def execute_insert(query, params=None):
    """Execute an INSERT/UPDATE/DELETE query."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(query, params or [])
        conn.commit()
        last_id = cursor.lastrowid
        cursor.close()
        conn.close()
        return last_id
    except Error as e:
        print(f"Error executing insert: {e}")
        raise

def fetch_consumption_historic(days=7):
    """Fetch historic consumption data for the last N days."""
    query = """
        SELECT * FROM consumption_historic
        WHERE timestamp >= DATE_SUB(NOW(), INTERVAL %s DAY)
        ORDER BY timestamp DESC
    """
    return execute_query(query, [days])

def fetch_weather_historic(days=7):
    """Fetch historic weather data for the last N days."""
    query = """
        SELECT * FROM weather_historic
        WHERE timestamp >= DATE_SUB(NOW(), INTERVAL %s DAY)
        ORDER BY timestamp DESC
    """
    return execute_query(query, [days])

def fetch_weather_forecast(days_ahead=7):
    """Fetch weather forecast for the next N days."""
    query = """
        SELECT * FROM weather_forecast
        WHERE forecast_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL %s DAY)
        ORDER BY forecast_date ASC
    """
    return execute_query(query, [days_ahead])

def fetch_generation_actual(days=7):
    """Fetch actual generation data for the last N days."""
    query = """
        SELECT * FROM generation_actual
        WHERE date >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
        ORDER BY date DESC, source_type
    """
    return execute_query(query, [days])

def fetch_historic_data(days=40):
    """Fetch last N days of consumption & weather data."""
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
        WHERE c.timestamp >= DATE_SUB(NOW(), INTERVAL %s DAY)
        ORDER BY c.timestamp ASC
    """
    return execute_query(query, [days])

def fetch_forecast_data(forecast_date):
    """Fetch weather forecast for a specific date."""
    query = "SELECT * FROM weather_forecast WHERE forecast_date = %s"
    return execute_query(query, [forecast_date], fetch_one=True) or {}

def fetch_user_appliances():
    """Fetch all user appliances."""
    query = "SELECT * FROM user_appliances ORDER BY name"
    return execute_query(query)

def fetch_weekly_actions():
    """Fetch this week's scheduled actions."""
    today = datetime.now().date()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)
    
    query = """
        SELECT * FROM weekly_actions
        WHERE week_start <= %s AND week_end >= %s
        ORDER BY preferred_time
    """
    return execute_query(query, [week_end, week_start]) or []

def is_tomorrow_vacation():
    """Check if tomorrow is a vacation day."""
    tomorrow = datetime.now().date() + timedelta(days=1)
    query = """
        SELECT COUNT(*) as count FROM vacation_dates
        WHERE start_date <= %s AND end_date >= %s
    """
    result = execute_query(query, [tomorrow, tomorrow], fetch_one=True)
    return result and result.get('count', 0) > 0 if result else False

def store_prediction(prediction_date, source_type, predicted_value_kwh, 
                    panel_or_source_id=None, error_margin_kwh=0, model_version=None):
    """Store a prediction in the database."""
    query = """
        INSERT INTO predictions 
        (prediction_date, source_type, panel_or_source_id, predicted_value_kwh, error_margin_kwh, model_version)
        VALUES (%s, %s, %s, %s, %s, %s)
    """
    params = [prediction_date, source_type, panel_or_source_id, predicted_value_kwh, error_margin_kwh, model_version]
    return execute_insert(query, params)

def store_predictions(predictions, forecast_date, model_version='v1.0'):
    """Store predictions in database."""
    import json
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

def store_decision(decision_date, pv_activate, wind_activate, total_generation_kwh,
                  total_consumption_kwh, battery_bilan_kwh, appliance_schedule=None,
                  microgrid_action=None, microgrid_power_kw=None, alerts=None):
    """Store a decision in the database."""
    import json
    
    query = """
        INSERT INTO decisions 
        (decision_date, pv_activate, wind_activate, total_generation_kwh, total_consumption_kwh, 
         battery_bilan_kwh, appliance_schedule, microgrid_action, microgrid_power_kw, alerts)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            pv_activate = VALUES(pv_activate),
            wind_activate = VALUES(wind_activate),
            total_generation_kwh = VALUES(total_generation_kwh),
            total_consumption_kwh = VALUES(total_consumption_kwh),
            battery_bilan_kwh = VALUES(battery_bilan_kwh),
            appliance_schedule = VALUES(appliance_schedule),
            microgrid_action = VALUES(microgrid_action),
            microgrid_power_kw = VALUES(microgrid_power_kw),
            alerts = VALUES(alerts)
    """
    params = [
        decision_date, 
        pv_activate, 
        wind_activate, 
        total_generation_kwh, 
        total_consumption_kwh, 
        battery_bilan_kwh,
        json.dumps(appliance_schedule) if appliance_schedule else None,
        microgrid_action,
        microgrid_power_kw,
        json.dumps(alerts) if alerts else None
    ]
    return execute_insert(query, params)

def store_decisions(decisions, decision_date):
    """Store Phase 2 decisions in database."""
    import json
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO decisions 
        (decision_date, pv_activate, wind_activate,
         total_generation_kwh, total_consumption_kwh, battery_bilan_kwh, 
         appliance_schedule, microgrid_action, microgrid_power_kw)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            pv_activate = VALUES(pv_activate),
            wind_activate = VALUES(wind_activate),
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

def store_anomaly(detection_date, panel_id, anomaly_type, confidence_score=None, description=None):
    """Store an anomaly detection."""
    query = """
        INSERT INTO anomalies 
        (detection_date, panel_id, anomaly_type, confidence_score, description)
        VALUES (%s, %s, %s, %s, %s)
    """
    params = [detection_date, panel_id, anomaly_type, confidence_score, description]
    return execute_insert(query, params)

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

def fetch_decision_by_date(decision_date):
    """Fetch a decision for a specific date."""
    query = "SELECT * FROM decisions WHERE decision_date = %s"
    return execute_query(query, [decision_date], fetch_one=True)

def fetch_recent_decisions(days=7):
    """Fetch recent decisions."""
    query = """
        SELECT * FROM decisions
        WHERE decision_date >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
        ORDER BY decision_date DESC
    """
    return execute_query(query, [days])

def fetch_actual_generation(from_date, to_date):
    """Fetch actual generation for model evaluation."""
    query = """
        SELECT date, source_type, panel_id, total_kwh
        FROM generation_actual
        WHERE date BETWEEN %s AND %s
        ORDER BY date, source_type, panel_id
    """
    return execute_query(query, [from_date, to_date])
