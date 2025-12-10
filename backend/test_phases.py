from fastapi.testclient import TestClient
from backend.main import app
import pandas as pd
import numpy as np
import json
from datetime import datetime, timedelta

client = TestClient(app)

def test_simulation():
    print("\nTesting Simulation Endpoint...")
    
    # Create dummy weather data for 24 hours
    data = []
    start_date = pd.Timestamp("2025-06-01 00:00:00")
    
    for i in range(24):
        timestamp = (start_date + pd.Timedelta(hours=i)).isoformat()
        # Simulate day/night cycle for irradiance
        hour = i
        irradiance = 0
        if 6 <= hour <= 18:
            irradiance = 800 * np.sin(np.pi * (hour - 6) / 12)
            
        data.append({
            "timestamp": timestamp,
            "ALLSKY_SFC_SW_DWN": max(0, irradiance),
            "T2M": 25.0,
            "RH2M": 40.0,
            "WS10M": 3.5,
            "WD10M": 180.0
        })
        
    # Dummy consumption profile (higher in evening)
    consumption = []
    for i in range(24):
        if 18 <= i <= 22:
            consumption.append(2.5) # High evening load
        else:
            consumption.append(0.5) # Low base load
            
    payload = {
        "weather_data": data,
        "current_soc": 50.0,
        "consumption_profile": consumption
    }
    
    try:
        with client:
            response = client.post("/simulate", json=payload)
            if response.status_code == 200:
                print("Success!")
                res = response.json()
                print("Summary:", json.dumps(res['summary'], indent=2))
                print("Advice:", json.dumps(res['advice'], indent=2))
            else:
                print(f"Error: {response.status_code}")
                print(response.text)
    except Exception as e:
        print(f"Failed: {e}")

def test_maintenance():
    print("\nTesting Maintenance Endpoint...")
    
    # Create dummy history (30 days)
    dates = []
    actuals = []
    predicteds = []
    
    start_date = datetime(2025, 1, 1)
    for i in range(30):
        date = (start_date + timedelta(days=i)).isoformat()
        dates.append(date)
        
        # Simulate degradation: Actual starts matching predicted, then drops
        pred = 20.0
        if i > 20:
            act = 15.0 # Drop in performance
        else:
            act = 20.0
            
        actuals.append(act)
        predicteds.append(pred)
        
    payload = {
        "dates": dates,
        "actual_production": actuals,
        "predicted_production": predicteds
    }
    
    try:
        with client:
            response = client.post("/maintenance", json=payload)
            if response.status_code == 200:
                print("Success!")
                res = response.json()
                print("Analysis:", json.dumps(res['analysis'], indent=2))
            else:
                print(f"Error: {response.status_code}")
                print(response.text)
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    test_simulation()
    test_maintenance()
