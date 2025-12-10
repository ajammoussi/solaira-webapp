from fastapi.testclient import TestClient
from backend.main import app
import pandas as pd
import json

client = TestClient(app)

def test_prediction():
    # Create dummy data
    data = []
    start_date = pd.Timestamp("2025-06-01 12:00:00")
    
    for i in range(5):
        timestamp = (start_date + pd.Timedelta(hours=i)).isoformat()
        data.append({
            "timestamp": timestamp,
            "ALLSKY_SFC_SW_DWN": 800.0 - (i * 50), # Decreasing sunlight
            "T2M": 25.0,
            "RH2M": 40.0,
            "WS10M": 3.5,
            "WD10M": 180.0
        })
        
    payload = {
        "data": data,
        "model_type": "xgboost"
    }
    
    try:
        print(f"Testing prediction endpoint internally...")
        with TestClient(app) as client:
            response = client.post("/predict", json=payload)
            
            if response.status_code == 200:
                print("Success!")
                print(json.dumps(response.json(), indent=2))
            else:
                print(f"Error: {response.status_code}")
                print(response.text)
            
    except Exception as e:
        print(f"Test failed: {e}")

if __name__ == "__main__":
    test_prediction()
