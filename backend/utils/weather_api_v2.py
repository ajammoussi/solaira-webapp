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


class OpenMeteoProvider(WeatherProvider):
    """Open-Meteo API (free, no key, hourly forecast)."""

    def __init__(self):
        self.base_url = "https://api.open-meteo.com/v1/forecast"

    def fetch_forecast(self, latitude: float, longitude: float, date: str) -> Dict:
        try:
            params = {
                'latitude': latitude,
                'longitude': longitude,
                'hourly': 'temperature_2m,wind_speed_10m,shortwave_radiation,cloud_cover,pressure_msl',
                'timezone': 'auto'
            }
            response = requests.get(self.base_url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            times = data.get('hourly', {}).get('time', [])
            temp = data.get('hourly', {}).get('temperature_2m', [])
            wind = data.get('hourly', {}).get('wind_speed_10m', [])
            swr = data.get('hourly', {}).get('shortwave_radiation', [])
            cloud = data.get('hourly', {}).get('cloud_cover', [])
            press = data.get('hourly', {}).get('pressure_msl', [])

            # Filter to target date; compute simple average
            day_mask = [t.startswith(date) for t in times]
            def avg(series):
                vals = [v for v, m in zip(series, day_mask) if m and v is not None]
                return float(sum(vals) / len(vals)) if vals else None

            temp_avg = avg(temp) or 15.0
            wind_avg = avg(wind) or 3.5
            swr_avg = avg(swr) or 400.0
            cloud_avg = avg(cloud) or 40.0
            press_avg = avg(press) or 1013.0

            return {
                'temperature_c': temp_avg,
                'irradiance_w_m2': swr_avg,
                'wind_speed_m_s': wind_avg,
                'cloud_cover_percent': cloud_avg,
                'humidity_percent': 60,  # Not provided; fallback
                'pressure_hpa': press_avg,
                'source': 'openmeteo',
                'latitude': latitude,
                'longitude': longitude,
                'date': date
            }
        except Exception as e:
            logger.error(f"[Weather API] Open-Meteo error: {e}. Falling back to mock data.")
            return MockWeatherProvider().fetch_forecast(latitude, longitude, date)

    def fetch_current(self, latitude: float, longitude: float) -> Dict:
        # Use the first hour as current-ish
        today = datetime.now().strftime('%Y-%m-%d')
        forecast = self.fetch_forecast(latitude, longitude, today)
        forecast['source'] = 'openmeteo'
        return forecast


# Global provider instance
_provider: Optional[WeatherProvider] = None


def initialize_weather_provider(api_key: Optional[str] = None, provider_type: str = 'auto'):
    """Initialize global weather provider with fallback cascade."""
    global _provider

    if provider_type == 'mock':
        _provider = MockWeatherProvider()
    elif provider_type == 'openweather':
        if not api_key:
            raise ValueError("OpenWeather API key is required for OpenWeather provider")
        _provider = OpenWeatherProvider(api_key)
    elif provider_type == 'openmeteo':
        _provider = OpenMeteoProvider()
    elif provider_type == 'nasa':
        _provider = NASAPowerProvider()
    elif provider_type == 'auto':
        # Auto: OpenWeather (if key) -> OpenMeteo -> NASA -> Mock
        if api_key:
            _provider = OpenWeatherProvider(api_key)
            logger.info("[Weather API] Using OpenWeather provider (auto)")
        else:
            try:
                _provider = OpenMeteoProvider()
                logger.info("[Weather API] Using Open-Meteo provider (auto)")
            except Exception:
                _provider = NASAPowerProvider()
                logger.info("[Weather API] Using NASA POWER provider (auto)")
    else:
        raise ValueError(f"Unknown provider type: {provider_type}")

    logger.info(f"[Weather API] Initialized provider: {_provider.__class__.__name__}")


def get_provider() -> WeatherProvider:
    if _provider is None:
        raise RuntimeError("Weather provider not initialized. Call initialize_weather_provider first.")
    return _provider


def fetch_weather_forecast(
    forecast_date: Optional[str] = None,
    latitude: float = DEFAULT_LATITUDE,
    longitude: float = DEFAULT_LONGITUDE
) -> Dict:
    """Fetch weather forecast for a location."""
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

