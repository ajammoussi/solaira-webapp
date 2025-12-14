"""Database utilities for SQLite operations."""
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

DB_PATH = str(Path(__file__).parent.parent.parent / 'database' / 'energy.db')

def get_connection():
    """Create and return a SQLite connection."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def execute_query(query, params=None, fetch_one=False):
    """Execute a SELECT query and return results."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(query, params or [])
    result = cur.fetchone() if fetch_one else cur.fetchall()
    cur.close()
    conn.close()
    if fetch_one:
        return dict(result) if result else None
    return [dict(r) for r in result]

def execute_insert(query, params=None):
    """Execute an INSERT/UPDATE/DELETE query."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(query, params or [])
    conn.commit()
    last_id = cur.lastrowid
    cur.close()
    conn.close()
    return last_id

def fetch_consumption_historic(days=7):
    """Fetch historic consumption data for the last N days."""
    query = """
        SELECT * FROM consumption_historic
        WHERE timestamp >= datetime('now', ?)
        ORDER BY timestamp DESC
    """
    return execute_query(query, [f'-{days} days'])

def fetch_weather_historic(days=7):
    """Fetch historic weather data for the last N days."""
    query = """
        SELECT * FROM weather_historic
        WHERE timestamp >= datetime('now', ?)
        ORDER BY timestamp DESC
    """
    return execute_query(query, [f'-{days} days'])

def fetch_weather_forecast(days_ahead=7):
    """Fetch weather forecast for the next N days."""
    query = """
        SELECT * FROM weather_forecast
        WHERE forecast_date BETWEEN date('now') AND date('now', ?)
        ORDER BY forecast_date ASC
    """
    return execute_query(query, [f'+{days_ahead} days'])

def fetch_generation_actual(days=7):
    """Fetch actual generation data for the last N days."""
    query = """
        SELECT * FROM generation_actual
        WHERE date >= date('now', ?)
        ORDER BY date DESC, source_type
    """
    return execute_query(query, [f'-{days} days'])

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
        WHERE c.timestamp >= datetime('now', ?)
        ORDER BY c.timestamp ASC
    """
    return execute_query(query, [f'-{days} days'])

def fetch_forecast_data(forecast_date):
    """Fetch weather forecast for a specific date."""
    query = "SELECT * FROM weather_forecast WHERE forecast_date = ?"
    return execute_query(query, [forecast_date], fetch_one=True) or {}

def fetch_user_appliances():
    """Fetch all user appliances."""
    query = "SELECT * FROM user_appliances ORDER BY name"
    return execute_query(query)

def fetch_weekly_actions(reference_date=None):
    """Fetch this week's scheduled actions for the given date (defaults to today)."""
    if reference_date:
        target_date = datetime.fromisoformat(str(reference_date)).date()
    else:
        target_date = datetime.now().date()

    query = """
        SELECT * FROM weekly_actions
        WHERE week_start <= ? AND week_end >= ?
        ORDER BY preferred_time
    """
    return execute_query(query, [target_date, target_date]) or []

def is_tomorrow_vacation():
    """Check if tomorrow is a vacation day."""
    tomorrow = datetime.now().date() + timedelta(days=1)
    query = """
        SELECT COUNT(*) as count FROM vacation_dates
           WHERE start_date <= ? AND end_date >= ?
    """
    result = execute_query(query, [tomorrow, tomorrow], fetch_one=True)
    return result and result.get('count', 0) > 0 if result else False

def store_prediction(prediction_date, source_type, predicted_value_kwh, 
                    panel_or_source_id=None, error_margin_kwh=0, model_version=None):
    """Store a prediction in the database."""
    query = """
        INSERT INTO predictions 
        (prediction_date, source_type, panel_or_source_id, predicted_value_kwh, error_margin_kwh, model_version)
        VALUES (?, ?, ?, ?, ?, ?)
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
                VALUES (?, ?, ?, ?, ?)
            """, (forecast_date, source_type, values['value'], values.get('error_margin', 0), model_version))
        
        elif isinstance(values, list):
            # Multiple panels (PV, wind)
            for panel_data in values:
                panel_id = panel_data.get('panel_id', 1)
                cursor.execute("""
                    INSERT INTO predictions 
                    (prediction_date, source_type, panel_or_source_id, predicted_value_kwh, error_margin_kwh, model_version)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    forecast_date, 
                    source_type, 
                    panel_id, 
                    panel_data['value'], 
                    panel_data.get('error_margin', 0), 
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(decision_date) DO UPDATE SET
            pv_activate=excluded.pv_activate,
            wind_activate=excluded.wind_activate,
            total_generation_kwh=excluded.total_generation_kwh,
            total_consumption_kwh=excluded.total_consumption_kwh,
            battery_bilan_kwh=excluded.battery_bilan_kwh,
            appliance_schedule=excluded.appliance_schedule,
            microgrid_action=excluded.microgrid_action,
            microgrid_power_kw=excluded.microgrid_power_kw,
            alerts=excluded.alerts
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
    return store_decision(
        decision_date,
        decisions['sources']['pv']['activate'],
        decisions['sources']['wind_tree']['activate'],
        decisions['totals']['generation_kwh'],
        decisions['totals']['consumption_kwh'],
        decisions['battery']['bilan_kwh'],
        decisions.get('appliances'),
        decisions['microgrid']['action'],
        decisions['microgrid']['power_kw'],
        decisions.get('alerts')
    )

def store_anomaly(detection_date, panel_id, anomaly_type, confidence_score=None, description=None):
    """Store an anomaly detection."""
    query = """
        INSERT INTO anomalies 
        (detection_date, panel_id, anomaly_type, confidence_score, description)
        VALUES (?, ?, ?, ?, ?)
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
            VALUES (?, ?, ?, ?, ?)
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
    query = "SELECT * FROM decisions WHERE decision_date = ?"
    return execute_query(query, [decision_date], fetch_one=True)

def fetch_recent_decisions(days=7):
    """Fetch recent decisions."""
    query = """
        SELECT * FROM decisions
        WHERE decision_date >= date('now', ?)
        ORDER BY decision_date DESC
    """
    return execute_query(query, [f'-{days} days'])

def fetch_actual_generation(from_date, to_date):
    """Fetch actual generation for model evaluation."""
    query = """
        SELECT date, source_type, panel_id, total_kwh
        FROM generation_actual
        WHERE date BETWEEN ? AND ?
        ORDER BY date, source_type, panel_id
    """
    return execute_query(query, [from_date, to_date])
