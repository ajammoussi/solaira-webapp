"""
Enhanced weather API client with latitude/longitude support.
Integrates with OpenWeather, NASA POWER, or mock data.
"""

import requests
from datetime import datetime, timedelta
from typing import Optional, Dict, Tuple
import logging

logger = logging.getLogger(__name__)

# Default location: can be overridden via config or environment
DEFAULT_LATITUDE = 36.8065  # Tunisia example
DEFAULT_LONGITUDE = 10.1815
DEFAULT_LOCATION_NAME = "Tunisia"

class WeatherProvider:
    """Abstract weather provider interface."""
    
    def fetch_forecast(self, latitude: float, longitude: float, date: str) -> Dict:
        """Fetch weather forecast for a specific location and date."""
        raise NotImplementedError
    
    def fetch_current(self, latitude: float, longitude: float) -> Dict:
        """Fetch current weather data."""
        raise NotImplementedError


class MockWeatherProvider(WeatherProvider):
    """Mock weather provider for local testing."""
    
    def fetch_forecast(self, latitude: float, longitude: float, date: str) -> Dict:
        """Return mock forecast data."""
        return {
            'temperature_c': 16.5,
            'irradiance_w_m2': 450,
            'wind_speed_m_s': 4.2,
            'cloud_cover_percent': 25,
            'humidity_percent': 65,
            'pressure_hpa': 1013,
            'source': 'mock',
            'latitude': latitude,
            'longitude': longitude,
            'date': date
        }
    
    def fetch_current(self, latitude: float, longitude: float) -> Dict:
        """Return mock current weather."""
        return {
            'temperature_c': 18.0,
            'wind_speed_m_s': 3.5,
            'cloud_cover_percent': 20,
            'humidity_percent': 60,
            'pressure_hpa': 1013,
            'source': 'mock',
            'latitude': latitude,
            'longitude': longitude
        }


class OpenWeatherProvider(WeatherProvider):
    """OpenWeather API integration (requires API key)."""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.openweathermap.org/data/2.5"
    
    def fetch_forecast(self, latitude: float, longitude: float, date: str) -> Dict:
        """
        Fetch forecast from OpenWeather.
        OpenWeather free tier provides 5-day forecast.
        """
        try:
            url = f"{self.base_url}/forecast?lat={latitude}&lon={longitude}&appid={self.api_key}&units=metric"
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            # Parse the first forecast (simplified; in production, filter by date)
            forecast = data['list'][0] if data.get('list') else {}
            
            return {
                'temperature_c': forecast.get('main', {}).get('temp', 15),
                'irradiance_w_m2': 400 + (100 - forecast.get('clouds', {}).get('all', 50)) * 3,  # Estimate
                'wind_speed_m_s': forecast.get('wind', {}).get('speed', 3.5),
                'cloud_cover_percent': forecast.get('clouds', {}).get('all', 30),
                'humidity_percent': forecast.get('main', {}).get('humidity', 60),
                'pressure_hpa': forecast.get('main', {}).get('pressure', 1013),
                'source': 'openweather',
                'latitude': latitude,
                'longitude': longitude,
                'date': date
            }
        except Exception as e:
            logger.error(f"[Weather API] OpenWeather error: {e}. Falling back to mock data.")
            return MockWeatherProvider().fetch_forecast(latitude, longitude, date)
    
    def fetch_current(self, latitude: float, longitude: float) -> Dict:
        """Fetch current weather from OpenWeather."""
        try:
            url = f"{self.base_url}/weather?lat={latitude}&lon={longitude}&appid={self.api_key}&units=metric"
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            return {
                'temperature_c': data.get('main', {}).get('temp', 15),
                'wind_speed_m_s': data.get('wind', {}).get('speed', 3.5),
                'cloud_cover_percent': data.get('clouds', {}).get('all', 30),
                'humidity_percent': data.get('main', {}).get('humidity', 60),
                'pressure_hpa': data.get('main', {}).get('pressure', 1013),
                'source': 'openweather',
                'latitude': latitude,
                'longitude': longitude
            }
        except Exception as e:
            logger.error(f"[Weather API] OpenWeather current error: {e}. Falling back to mock data.")
            return MockWeatherProvider().fetch_current(latitude, longitude)


class NASAPowerProvider(WeatherProvider):
    """NASA POWER API integration (no API key required)."""
    
    def __init__(self):
        self.base_url = "https://power.larc.nasa.gov/api/v1"
    
    def fetch_forecast(self, latitude: float, longitude: float, date: str) -> Dict:
        """
        Fetch data from NASA POWER (historical/recent data only, not true forecast).
        Good for reanalysis and historical weather.
        """
        try:
            # Parse date YYYYMMDD format for NASA API
            date_str = date.replace('-', '')
            
            url = (
                f"{self.base_url}/temporal/daily/point?"
                f"parameters=WS10M,T2M,ALLSKY_SFC_SW_DWN,PS&"
                f"longitude={longitude}&latitude={latitude}&"
                f"start={date_str}&end={date_str}&"
                f"format=JSON"
            )
            
            response = requests.get(url, timeout=15)
            response.raise_for_status()
            
            data = response.json()
            
            if 'properties' in data and 'parameter' in data['properties']:
                params = data['properties']['parameter']
                
                # Extract values (handle single day vs multiple days)
                ws10m = params.get('WS10M', {})
                t2m = params.get('T2M', {})
                irradiance = params.get('ALLSKY_SFC_SW_DWN', {})
                pressure = params.get('PS', {})
                
                # Get first (and likely only) value
                ws_val = list(ws10m.values())[0] if ws10m else 3.5
                temp_val = list(t2m.values())[0] if t2m else 15
                irrad_val = list(irradiance.values())[0] if irradiance else 400
                press_val = list(pressure.values())[0] if pressure else 1013
                
                return {
                    'temperature_c': float(temp_val),
                    'irradiance_w_m2': float(irrad_val),
                    'wind_speed_m_s': float(ws_val),
                    'cloud_cover_percent': 30,  # Not provided by NASA POWER
                    'humidity_percent': 60,  # Not provided
                    'pressure_hpa': float(press_val) / 100,  # Convert Pa to hPa
                    'source': 'nasa_power',
                    'latitude': latitude,
                    'longitude': longitude,
                    'date': date
                }
        except Exception as e:
            logger.error(f"[Weather API] NASA POWER error: {e}. Falling back to mock data.")
            return MockWeatherProvider().fetch_forecast(latitude, longitude, date)
    
    def fetch_current(self, latitude: float, longitude: float) -> Dict:
        """Fetch recent data from NASA POWER (pseudo-current)."""
        today = datetime.now().strftime('%Y-%m-%d')
        forecast = self.fetch_forecast(latitude, longitude, today)
        # Mark as current-ish
        forecast['source'] = 'nasa_power_recent'
        return forecast


# Global provider instance
_provider: Optional[WeatherProvider] = None


def initialize_weather_provider(api_key: Optional[str] = None, provider_type: str = 'auto'):
    """
    Initialize global weather provider.
    
    Args:
        api_key: OpenWeather API key (optional)
        provider_type: 'openweather', 'nasa', 'mock', or 'auto' (auto-detect)
    """
    global _provider
    
    if provider_type == 'auto':
        # Auto-select based on available API key
        if api_key:
            _provider = OpenWeatherProvider(api_key)
            logger.info("[Weather API] Using OpenWeather provider")
        else:
            _provider = NASAPowerProvider()
            logger.info("[Weather API] Using NASA POWER provider (no API key needed)")
    elif provider_type == 'openweather':
        if not api_key:
            logger.warning("[Weather API] OpenWeather requires API key. Falling back to NASA POWER.")
            _provider = NASAPowerProvider()
        else:
            _provider = OpenWeatherProvider(api_key)
            logger.info("[Weather API] Using OpenWeather provider")
    elif provider_type == 'nasa':
        _provider = NASAPowerProvider()
        logger.info("[Weather API] Using NASA POWER provider")
    else:  # mock
        _provider = MockWeatherProvider()
        logger.info("[Weather API] Using mock provider (testing only)")


def get_provider() -> WeatherProvider:
    """Get or initialize the global weather provider."""
    global _provider
    if _provider is None:
        initialize_weather_provider()
    return _provider


def fetch_weather_forecast(
    forecast_date: Optional[str] = None,
    latitude: float = DEFAULT_LATITUDE,
    longitude: float = DEFAULT_LONGITUDE
) -> Dict:
    """
    Fetch weather forecast for a location.
    
    Args:
        forecast_date: Date string (YYYY-MM-DD). If None, uses tomorrow.
        latitude: Location latitude (default: Tunisia)
        longitude: Location longitude (default: Tunisia)
    
    Returns:
        Dict with {temperature_c, irradiance_w_m2, wind_speed_m_s, cloud_cover_percent, ...}
    """
    if forecast_date is None:
        forecast_date = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
    
    provider = get_provider()
    forecast = provider.fetch_forecast(latitude, longitude, forecast_date)
    
    logger.info(
        f"[Weather API] Forecast for {forecast_date} @ ({latitude}, {longitude}): "
        f"Temp={forecast['temperature_c']}°C, Wind={forecast['wind_speed_m_s']}m/s, "
        f"Irradiance={forecast['irradiance_w_m2']}W/m² [source: {forecast['source']}]"
    )
    
    return forecast


def fetch_current_weather(
    latitude: float = DEFAULT_LATITUDE,
    longitude: float = DEFAULT_LONGITUDE
) -> Dict:
    """Fetch current/recent weather for a location."""
    provider = get_provider()
    weather = provider.fetch_current(latitude, longitude)
    
    logger.info(
        f"[Weather API] Current @ ({latitude}, {longitude}): "
        f"Temp={weather['temperature_c']}°C, Wind={weather['wind_speed_m_s']}m/s "
        f"[source: {weather['source']}]"
    )
    
    return weather


def store_weather_forecast(forecast: Dict, forecast_date: str) -> None:
    """
    Store weather forecast in database with metadata.
    
    Args:
        forecast: Weather dict from fetch_weather_forecast()
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
    
    logger.info(f"[Weather API] Stored forecast for {forecast_date}")

