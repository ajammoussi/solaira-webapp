"""
Generate consumption data for the entire 2022-2025 period
Creates: data/consumption/processed_power_usage_2022_2025.csv
"""

import pandas as pd
import numpy as np
from pathlib import Path


def create_realistic_consumption(df, pv_column="pv_production_kwh"):
    """
    Create realistic energy consumption data matching phase 2 scale
    Target: 15-20 kWh per day, peaks up to ~5 kW
    """
    np.random.seed(42)  # For reproducibility

    # Extract time features
    df["hour"] = df["datetime"].dt.hour
    df["day_of_week"] = df["datetime"].dt.dayofweek
    df["month"] = df["datetime"].dt.month
    df["is_weekend"] = df["day_of_week"] >= 5

    # Base consumption patterns
    # 1. Daily pattern: higher during waking hours, lower at night
    daily_pattern = np.zeros(24)

    # Typical residential consumption pattern (normalized)
    # Night (12AM-6AM): low consumption
    daily_pattern[0:6] = [0.2, 0.15, 0.1, 0.1, 0.15, 0.3]
    # Morning (6AM-9AM): rising consumption
    daily_pattern[6:9] = [0.5, 0.8, 0.7]
    # Daytime (9AM-5PM): moderate consumption
    daily_pattern[9:17] = [0.6, 0.6, 0.5, 0.5, 0.5, 0.5, 0.6, 0.7]
    # Evening (5PM-12AM): high consumption
    daily_pattern[17:24] = [0.9, 1.0, 0.9, 0.8, 0.7, 0.5, 0.4]

    # 2. Seasonal pattern with HVAC loads
    # Base seasonal variation
    seasonal_multiplier = 1 + 0.2 * np.sin((df["month"] - 1) * np.pi / 6)

    # HVAC loads: higher in summer (cooling) and winter (heating)
    hvac_load = np.zeros(len(df))
    # Summer cooling (June, July, August) - peaks during afternoon
    summer_mask = df["month"].isin([6, 7, 8])
    hvac_load[summer_mask] = 0.3 * (
        1 + 0.3 * np.sin((df.loc[summer_mask, "hour"] - 6) * np.pi / 12)
    )

    # Winter heating (December, January, February) - more constant
    winter_mask = df["month"].isin([12, 1, 2])
    hvac_load[winter_mask] = 0.4 * (
        1 + 0.2 * np.sin((df.loc[winter_mask, "hour"] - 12) * np.pi / 12)
    )

    # 3. Weekend pattern: different consumption behavior
    weekend_multiplier = np.where(
        df["is_weekend"], 1.1, 1.0
    )  # Slightly higher on weekends

    # Create base consumption using daily pattern
    base_consumption = np.array([daily_pattern[h] for h in df["hour"]])

    # 4. Solar correlation component (negative for lighting reduction)
    # Normalize solar generation
    solar_normalized = (df[pv_column] - df[pv_column].mean()) / (
        df[pv_column].std() + 1e-6
    )

    # When sun is shining, less lighting needed (negative correlation)
    lighting_reduction = (
        -0.15 * solar_normalized * (df["hour"] >= 6) * (df["hour"] <= 20)
    )

    # But more cooling in summer during sunny hours (positive correlation)
    solar_cooling = (
        0.1 * solar_normalized * summer_mask * (df["hour"] >= 10) * (df["hour"] <= 18)
    )

    solar_component = lighting_reduction + solar_cooling

    # 5. Add stochastic appliance usage with MORE variability
    # Simulate occasional high-draw appliances (washer, dryer, dishwasher, oven)
    appliance_probability = 0.08  # Lower baseline probability
    appliance_events = np.random.random(len(df)) < appliance_probability
    appliance_load = np.where(
        appliance_events, np.random.uniform(0.3, 3.5, len(df)), 0
    )  # Bigger range for spikes
    # Appliances more likely during certain hours
    appliance_hours_mask = ((df["hour"] >= 7) & (df["hour"] <= 10)) | (
        (df["hour"] >= 18) & (df["hour"] <= 22)
    )
    appliance_load = appliance_load * appliance_hours_mask

    # Add random consumption spikes (multi-day high usage events)
    # This creates the dramatic drops in SOC visible in target graph
    spike_days = np.random.random(len(df) // 24) < 0.25  # 25% of days have spikes
    spike_pattern = np.repeat(spike_days, 24)[: len(df)]
    spike_multiplier = np.where(
        spike_pattern, np.random.uniform(2.0, 3.5, len(df)), 1.0
    )  # Much higher spikes (2-3.5x)

    # Combine all components with lower baseline
    consumption = (
        base_consumption * 0.5  # Lower base pattern (50%)
        + hvac_load * 0.3  # Lower HVAC (30%)
        + solar_component * 0.1  # Solar interaction (10%)
        + appliance_load * 0.5  # Higher appliance weight for spikes
        + np.random.normal(0, 0.2, len(df)) * 0.4
    )  # More noise/variability

    # Apply seasonal, weekend, and spike patterns
    consumption = (
        consumption * seasonal_multiplier * weekend_multiplier * spike_multiplier
    )

    # Add general random noise for realism
    noise = np.random.normal(0, 0.15, len(df))
    consumption = consumption + noise

    # Scale to realistic kW values - HIGHER average, HIGHER peaks for battery cycling
    # Target: 40-60 kWh per day average, with spikes to 80+ kWh to cause significant SOC drops
    consumption = (consumption - consumption.min()) / (
        consumption.max() - consumption.min()
    )
    consumption = (
        consumption * 6.5 + 0.5
    )  # Scale to 0.5-7.0 kW range with much higher variability

    return consumption


# ============================================================================
# MAIN SCRIPT
# ============================================================================
print("=" * 80)
print("GENERATING CONSUMPTION DATA FOR 2022-2025")
print("=" * 80)

# Load PV data
pv_data_path = "data/processed_pv_data_2022_2025.csv"
print(f"\n📂 Loading PV data from: {pv_data_path}")
df = pd.read_csv(pv_data_path)
df["datetime"] = pd.to_datetime(df["datetime"])

print(f"✅ Loaded {len(df):,} hours of data")
print(f"   Period: {df['datetime'].min()} to {df['datetime'].max()}")
print(f"   Total days: {len(df) / 24:.1f}")

# Generate consumption data
print(f"\n⚙️  Generating consumption data...")
df["consumption_kwh"] = create_realistic_consumption(df, pv_column="pv_production_kwh")

# Extract required columns
print(f"\n📋 Extracting required columns...")
output_df = pd.DataFrame(
    {
        "datetime": df["datetime"],
        "year": df["datetime"].dt.year,
        "month": df["datetime"].dt.month,
        "day": df["datetime"].dt.day,
        "hour": df["datetime"].dt.hour,
        "day_of_week": df["datetime"].dt.dayofweek,
        "consumption_kwh": df["consumption_kwh"],
    }
)

# Calculate statistics
print(f"\n📊 CONSUMPTION STATISTICS:")
print(f"   Total consumption: {output_df['consumption_kwh'].sum():,.1f} kWh")
print(f"   Average hourly: {output_df['consumption_kwh'].mean():.3f} kWh")
print(f"   Peak hourly: {output_df['consumption_kwh'].max():.3f} kWh")
print(f"   Min hourly: {output_df['consumption_kwh'].min():.3f} kWh")

# Calculate daily averages
daily_total = output_df.groupby(output_df["datetime"].dt.date)["consumption_kwh"].sum()
print(f"\n📅 DAILY STATISTICS:")
print(f"   Average daily consumption: {daily_total.mean():.1f} kWh/day")
print(f"   Max daily consumption: {daily_total.max():.1f} kWh/day")
print(f"   Min daily consumption: {daily_total.min():.1f} kWh/day")

# Create output directory
output_dir = Path("data/consumption")
output_dir.mkdir(parents=True, exist_ok=True)

# Save to CSV
output_path = output_dir / "processed_power_usage_2022_2025.csv"
print(f"\n💾 Saving to: {output_path}")
output_df.to_csv(output_path, index=False)

print(f"\n✅ SUCCESS! Consumption data generated and saved")
print(f"   File: {output_path}")
print(f"   Rows: {len(output_df):,}")
print(f"   Columns: {list(output_df.columns)}")
print("=" * 80)
