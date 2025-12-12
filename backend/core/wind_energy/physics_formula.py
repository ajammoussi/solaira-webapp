import pandas as pd
import numpy as np
import os
import math

# Configuration
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data')
INPUT_FILE = os.path.join(DATA_DIR, 'era5_data_processed_2021_2023.csv')
OUTPUT_FILE = os.path.join(DATA_DIR, 'era5_data_with_energy.csv')

# Hardware Specs (Wind Tree)
NUMBER_OF_LEAVES = 36
LEAF_RADIUS = 0.5
LEAF_AREA = math.pi * LEAF_RADIUS**2
TOTAL_AREA = NUMBER_OF_LEAVES * LEAF_AREA
CP_FACTOR = 0.35
GENERATOR_EFFICIENCY = 0.9
CUT_IN_SPEED = 2.5
RATED_SPEED = 11.0
CUT_OUT_SPEED = 25.0
RATED_POWER_PER_LEAF = 300
TOTAL_RATED_POWER = NUMBER_OF_LEAVES * RATED_POWER_PER_LEAF

def calculate_air_density(temperature_c, pressure_pa):
    R_specific = 287.058
    temperature_k = temperature_c + 273.15
    rho = pressure_pa / (R_specific * temperature_k)
    return rho

def calculate_turbine_power(wind_speed, air_density):
    if wind_speed < CUT_IN_SPEED or wind_speed > CUT_OUT_SPEED:
        return 0.0
    effective_speed = min(wind_speed, RATED_SPEED)
    power = 0.5 * air_density * TOTAL_AREA * (effective_speed**3) * CP_FACTOR * GENERATOR_EFFICIENCY
    return min(power, TOTAL_RATED_POWER)

def process_energy():
    print("Loading Data...")
    if not os.path.exists(INPUT_FILE):
        print(f"Error: {INPUT_FILE} not found.")
        return

    df = pd.read_csv(INPUT_FILE)
    
    print("Calculating Energy...")
    # Vectorize calculations where possible, but apply is safer for the conditional logic in power
    # Let's use apply for row-wise calculation
    
    def row_power(row):
        rho = calculate_air_density(row['Temperature_2m'], row['Surface_Pressure'])
        power_watts = calculate_turbine_power(row['WS_Hub'], rho)
        return power_watts / 1000.0 # Convert to kWh (since data is hourly)

    df['Energy_kWh'] = df.apply(row_power, axis=1)
    
    print(f"Saving to {OUTPUT_FILE}...")
    df.to_csv(OUTPUT_FILE, index=False)
    
    print("Preview:")
    print(df[['time', 'WS_Hub', 'Energy_kWh']].head())
    print(f"Total Energy in Dataset: {df['Energy_kWh'].sum():.2f} kWh")

if __name__ == "__main__":
    process_energy()
