#!/usr/bin/env python
"""Seed test data into energy.db for local testing."""

import sqlite3
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.config import config

def seed_test_data():
    """Populate database with realistic test data."""
    db_path = config.DB_PATH
    
    if not os.path.exists(db_path):
        print(f"[Seed] ERROR: Database not found at {db_path}")
        return
    
    print(f"[Seed] Seeding test data into {db_path}\n")
    
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    # 1. Seed user appliances
    print("[Seed] Inserting user appliances...")
    appliances = [
        ('Washing Machine', 2.5, True),
        ('Dishwasher', 1.8, True),
        ('HVAC System', 3.5, False),
        ('Water Heater', 4.0, False),
        ('EV Charger', 7.0, True),
        ('Refrigerator', 0.15, False),
        ('Lighting', 0.5, True),
    ]
    for name, power_kwh, schedulable in appliances:
        cur.execute(
            "INSERT OR IGNORE INTO user_appliances (name, power_kwh, is_schedulable) VALUES (?, ?, ?)",
            (name, power_kwh, schedulable)
        )
    conn.commit()
    print(f"  ✓ Inserted {len(appliances)} appliances")
    
    # 2. Seed weekly actions
    print("[Seed] Inserting weekly actions...")
    today = datetime.now().date()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)
    
    actions = [
        ('Weekly Laundry', 2.5, '10:00', week_start, week_end),
        ('Weekly Cleaning', 1.5, '09:00', week_start, week_end),
        ('Pool Pump Run', 2.0, '14:00', week_start, week_end),
    ]
    for name, power_kwh, pref_time, start, end in actions:
        cur.execute(
            "INSERT OR IGNORE INTO weekly_actions (name, power_kwh, preferred_time, week_start, week_end) "
            "VALUES (?, ?, ?, ?, ?)",
            (name, power_kwh, pref_time, start, end)
        )
    conn.commit()
    print(f"  ✓ Inserted {len(actions)} weekly actions")
    
    # 3. Seed vacation dates (none for now, or a future date)
    print("[Seed] Inserting vacation dates...")
    vacation_start = today + timedelta(days=60)
    vacation_end = vacation_start + timedelta(days=14)
    cur.execute(
        "INSERT OR IGNORE INTO vacation_dates (start_date, end_date) VALUES (?, ?)",
        (vacation_start, vacation_end)
    )
    conn.commit()
    print(f"  ✓ Inserted vacation period: {vacation_start} to {vacation_end}")
    
    # 4. Seed historic consumption data (last 40 days of dummy data)
    print("[Seed] Inserting consumption historic data (40 days)...")
    base_consumption = 6.5  # kWh/day baseline
    now = datetime.now()
    count = 0
    for days_back in range(40, 0, -1):
        ts = (now - timedelta(days=days_back)).replace(hour=0, minute=0, second=0, microsecond=0)
        # Vary consumption: baseline ± 30%
        import random
        random.seed(int(ts.timestamp()))  # Consistent "randomness" per day
        consumption = base_consumption * (0.7 + random.random() * 0.6)
        
        cur.execute(
            "INSERT OR IGNORE INTO consumption_historic (timestamp, consumption_kwh) VALUES (?, ?)",
            (ts.isoformat(), consumption)
        )
        count += 1
    
    conn.commit()
    print(f"  ✓ Inserted {count} consumption records (40 days)")
    
    # 5. Seed historic weather data (last 40 days)
    print("[Seed] Inserting weather historic data (40 days)...")
    count = 0
    for days_back in range(40, 0, -1):
        ts = (now - timedelta(days=days_back)).replace(hour=0, minute=0, second=0, microsecond=0)
        
        import random
        random.seed(int(ts.timestamp()))
        temperature = 15 + random.random() * 15  # 15–30°C
        irradiance = 200 + random.random() * 600  # 200–800 W/m²
        wind_speed = 1 + random.random() * 8  # 1–9 m/s
        cloud_cover = random.randint(10, 80)  # 10–80%
        
        cur.execute(
            "INSERT OR IGNORE INTO weather_historic "
            "(timestamp, temperature_c, irradiance_w_m2, wind_speed_m_s, cloud_cover_percent) "
            "VALUES (?, ?, ?, ?, ?)",
            (ts.isoformat(), temperature, irradiance, wind_speed, cloud_cover)
        )
        count += 1
    
    conn.commit()
    print(f"  ✓ Inserted {count} weather records (40 days)")
    
    # 6. Seed some actual generation data for anomaly detection
    print("[Seed] Inserting generation actual data (7 days)...")
    count = 0
    for days_back in range(7, 0, -1):
        date = (now - timedelta(days=days_back)).date()
        
        # PV panels
        for panel_id in [1, 2, 3]:
            import random
            random.seed(int(date.isoformat().replace('-', '')) + panel_id)
            total_kwh = 2.0 + random.random() * 4.0  # 2–6 kWh/day
            
            cur.execute(
                "INSERT OR IGNORE INTO generation_actual (date, source_type, panel_id, total_kwh) "
                "VALUES (?, ?, ?, ?)",
                (date, 'pv', panel_id, total_kwh)
            )
            count += 1
        
        # Wind turbine
        import random
        random.seed(int(date.isoformat().replace('-', '')) + 99)
        wind_kwh = 1.0 + random.random() * 5.0  # 1–6 kWh/day
        cur.execute(
            "INSERT OR IGNORE INTO generation_actual (date, source_type, panel_id, total_kwh) "
            "VALUES (?, ?, ?, ?)",
            (date, 'wind_tree', 1, wind_kwh)
        )
        count += 1
    
    conn.commit()
    print(f"  ✓ Inserted {count} generation records (7 days)")
    
    conn.close()
    print("\n[Seed] ✅ Test data seeding complete!\n")

if __name__ == '__main__':
    seed_test_data()
