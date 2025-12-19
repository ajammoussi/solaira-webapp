"""
Weather API client to fetch tomorrow's forecast.
Currently supports NASA POWER API (placeholder implementation).
"""

import requests
from datetime import datetime, timedelta
from backend.config import config

def fetch_weather_forecast(forecast_date=None):
    """
    Fetch weather forecast for tomorrow.
    
    Args:
        forecast_date: Date string (YYYY-MM-DD). If None, fetches for tomorrow.
    
    Returns:
        Dict with {temperature_c, irradiance_w_m2, wind_speed_m_s, cloud_cover_percent}
    """
    
    if forecast_date is None:
        forecast_date = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
    
    # TODO: Replace with actual API call
    # Example: NASA POWER API, OpenWeatherMap, etc.
    
    if not config.WEATHER_API_KEY:
        print("[Weather API] WARNING: No API key configured, using mock data")
        return get_mock_weather_forecast()
    
    try:
        # Placeholder API call (replace with actual endpoint)
        url = f"{config.WEATHER_API_URL}?date={forecast_date}&api_key={config.WEATHER_API_KEY}"
        
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        # Parse response (adjust based on actual API structure)
        forecast = {
            'temperature_c': data.get('temperature', 15),
            'irradiance_w_m2': data.get('solar_irradiance', 400),
            'wind_speed_m_s': data.get('wind_speed', 3.5),
            'cloud_cover_percent': data.get('cloud_cover', 30)
        }
        
        print(f"[Weather API] Fetched forecast for {forecast_date}: {forecast}")
        return forecast
        
    except Exception as e:
        print(f"[Weather API] ERROR: {e}. Using mock data.")
        return get_mock_weather_forecast()

def get_mock_weather_forecast():
    """Return mock weather forecast for testing."""
    return {
        'temperature_c': 16.5,
        'irradiance_w_m2': 450,
        'wind_speed_m_s': 4.2,
        'cloud_cover_percent': 25
    }

def store_weather_forecast(forecast, forecast_date):
    """
    Store weather forecast in database.
    
    Args:
        forecast: Dict with weather data
        forecast_date: Date string (YYYY-MM-DD)
    """
    from backend.utils.database import get_connection
    
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO weather_forecast 
        (forecast_date, temperature_c, irradiance_w_m2, wind_speed_m_s, cloud_cover_percent)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(forecast_date) DO UPDATE SET
            temperature_c=excluded.temperature_c,
            irradiance_w_m2=excluded.irradiance_w_m2,
            wind_speed_m_s=excluded.wind_speed_m_s,
            cloud_cover_percent=excluded.cloud_cover_percent,
            fetched_at=CURRENT_TIMESTAMP
    """, (
        forecast_date,
        forecast['temperature_c'],
        forecast['irradiance_w_m2'],
        forecast['wind_speed_m_s'],
        forecast['cloud_cover_percent']
    ))
    
    conn.commit()
    cursor.close()
    conn.close()
    
    print(f"[Weather API] Stored forecast for {forecast_date}")
