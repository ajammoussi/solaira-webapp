#!/usr/bin/env python
"""Quick database inspector for energy.db."""

import sqlite3
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.config import config

def inspect_db():
    """Inspect database tables and row counts."""
    db_path = config.DB_PATH
    
    if not os.path.exists(db_path):
        print(f"[DB Check] ERROR: Database not found at {db_path}")
        return
    
    print(f"\n[DB Check] Inspecting {db_path}\n")
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    # Table counts
    tables = [
        'weather_historic', 'weather_forecast', 'consumption_historic',
        'generation_actual', 'predictions', 'decisions', 'anomalies',
        'user_appliances', 'weekly_actions', 'vacation_dates'
    ]
    
    print("=" * 60)
    print("TABLE COUNTS")
    print("=" * 60)
    for table in tables:
        try:
            cur.execute(f"SELECT COUNT(*) as cnt FROM {table}")
            count = cur.fetchone()['cnt']
            print(f"  {table:<30} {count:>5} rows")
        except Exception as e:
            print(f"  {table:<30} ERROR: {e}")
    
    # Latest forecast
    print("\n" + "=" * 60)
    print("LATEST WEATHER FORECAST")
    print("=" * 60)
    try:
        cur.execute("""
            SELECT forecast_date, temperature_c, irradiance_w_m2, wind_speed_m_s, cloud_cover_percent
            FROM weather_forecast ORDER BY forecast_date DESC LIMIT 1
        """)
        row = cur.fetchone()
        if row:
            print(f"  Date: {row['forecast_date']}")
            print(f"  Temp: {row['temperature_c']}°C")
            print(f"  Irradiance: {row['irradiance_w_m2']} W/m²")
            print(f"  Wind Speed: {row['wind_speed_m_s']} m/s")
            print(f"  Cloud Cover: {row['cloud_cover_percent']}%")
        else:
            print("  (no rows)")
    except Exception as e:
        print(f"  ERROR: {e}")
    
    # Latest predictions
    print("\n" + "=" * 60)
    print("LATEST PREDICTIONS")
    print("=" * 60)
    try:
        cur.execute("""
            SELECT prediction_date, source_type, predicted_value_kwh, error_margin_kwh
            FROM predictions
            ORDER BY prediction_date DESC, source_type
            LIMIT 10
        """)
        rows = cur.fetchall()
        if rows:
            for row in rows:
                print(f"  {row['prediction_date']} | {row['source_type']:<12} | "
                      f"{row['predicted_value_kwh']:>7.2f} kWh ± {row['error_margin_kwh']:.2f}")
        else:
            print("  (no rows)")
    except Exception as e:
        print(f"  ERROR: {e}")
    
    # Latest decision
    print("\n" + "=" * 60)
    print("LATEST DECISIONS")
    print("=" * 60)
    try:
        cur.fetchone()
        cur.execute("""
            SELECT decision_date, pv_activate, wind_activate, 
                   total_generation_kwh, total_consumption_kwh, battery_bilan_kwh, microgrid_action
            FROM decisions
            ORDER BY decision_date DESC
            LIMIT 5
        """)
        rows = cur.fetchall()
        if rows:
            for row in rows:
                print(f"  {row['decision_date']}")
                print(f"    PV: {row['pv_activate']} | Wind: {row['wind_activate']}")
                print(f"    Gen: {row['total_generation_kwh']:.2f} kWh | Cons: {row['total_consumption_kwh']:.2f} kWh")
                print(f"    Bilan: {row['battery_bilan_kwh']:+.2f} kWh | Microgrid: {row['microgrid_action']}")
        else:
            print("  (no rows)")
    except Exception as e:
        print(f"  ERROR: {e}")
    
    # Check user appliances
    print("\n" + "=" * 60)
    print("USER APPLIANCES")
    print("=" * 60)
    try:
        cur.execute("SELECT * FROM user_appliances ORDER BY name LIMIT 10")
        rows = cur.fetchall()
        if rows:
            for row in rows:
                print(f"  {row['name']:<25} {row['power_kwh']} kWh")
        else:
            print("  (no rows — seed data needed)")
    except Exception as e:
        print(f"  ERROR: {e}")
    
    # Check weekly actions
    print("\n" + "=" * 60)
    print("WEEKLY ACTIONS")
    print("=" * 60)
    try:
        cur.execute("SELECT * FROM weekly_actions ORDER BY preferred_time LIMIT 10")
        rows = cur.fetchall()
        if rows:
            for row in rows:
                print(f"  {row['name']:<25} {row['power_kwh']} kWh @ {row['preferred_time']}")
        else:
            print("  (no rows — seed data needed)")
    except Exception as e:
        print(f"  ERROR: {e}")
    
    conn.close()
    print("\n" + "=" * 60 + "\n")

if __name__ == '__main__':
    inspect_db()
