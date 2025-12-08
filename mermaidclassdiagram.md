classDiagram
    %% User & Profile
    class Profile {
        +UUID user_id
        +String display_name
        +JSON preferences
    }

    %% Energy Production
    class IEnergySource {
        <<interface>>
        +getCapacity() Float
        +getCurrentOutput() Float
        +getType() String
    }
    
    class PVSystem {
        +Float azimuth
        +String tilt_strategy
        +Float inverter_efficiency
        +Integer panel_count
    }
    
    class Location {
        +Float latitude
        +Float longitude
        +String timezone
        +Float elevation_m
    }
    
    class WeatherData {
        +Timestamp timestamp
        +Float irradiance_wm2
        +Float temperature_c
        +Float cloud_cover_percent
    }

    %% Energy Storage
    class IEnergyStorage {
        <<interface>>
        +charge() void
        +discharge() void
        +getCurrentSOC() Float
        +getCapacity() Float
    }
    
    class Battery {
        +Float capacity_kwh
        +Float max_charge_kw
        +Float max_discharge_kw
        +Float current_soc_percent
        +Float min_soc_percent
        +Float max_soc_percent
    }

    %% Energy Consumption
    class LoadProfile {
        +String name
        +Float[] hourly_multipliers
        +Float base_load_kw
        +Float peak_load_kw
        +getLoadForHour() Float
    }
    
    class ConsumptionRecord {
        +Timestamp timestamp
        +Float load_kw
        +Float battery_soc_before
        +Float battery_soc_after
    }

    %% Energy Flow Tracking
    class EnergySnapshot {
        +Timestamp timestamp
        +Float production_kw
        +Float consumption_kw
        +Float battery_soc_percent
        +Float battery_charge_kw
        +Float surplus_energy_kw
    }

    %% Forecasting
    class IForecastModel {
        <<interface>>
        +predict() Object
        +getModelType() String
    }
    
    class ProductionForecast {
        +Date target_date
        +Float predicted_production_kwh
        +Float confidence_interval
        +String model_type
    }
    
    class ConsumptionForecast {
        +Date target_date
        +Float predicted_consumption_kwh
        +Float confidence_interval
    }
    
    class BatteryLevelForecast {
        +Date target_date
        +Float predicted_soc_percent
        +Boolean will_deplete
        +Integer days_until_depletion
    }

    %% Alerts & Recommendations
    class AlertType {
        <<enumeration>>
        BATTERY_FULL
        BATTERY_LOW
        EXCESS_PRODUCTION
        HIGH_CONSUMPTION
        LOW_CONSUMPTION
        FORECAST_DEPLETION
    }
    
    class Alert {
        +UUID user_id
        +String severity
        +AlertType type
        +String message
        +Boolean is_read
        +Timestamp created_at
    }
    
    class EnergyRecommendation {
        +UUID alert_id
        +String recommendation_text
        +String[] alternative_uses
    }

    %% Relationships - Interfaces
    PVSystem ..|> IEnergySource
    Battery ..|> IEnergyStorage
    ProductionForecast ..|> IForecastModel
    ConsumptionForecast ..|> IForecastModel
    BatteryLevelForecast ..|> IForecastModel

    %% Relationships - Profile ownership
    Profile "1" --> "*" PVSystem
    Profile "1" --> "*" Battery
    Profile "1" --> "*" LoadProfile
    Profile "1" --> "*" Alert
    Profile "1" --> "*" EnergySnapshot
    Profile "1" --> "*" ConsumptionRecord
    Profile "1" --> "*" ProductionForecast
    Profile "1" --> "*" ConsumptionForecast
    Profile "1" --> "*" BatteryLevelForecast

    %% Relationships - Location & Weather
    Location "1" --> "*" PVSystem
    Location "1" --> "*" WeatherData
    WeatherData --> ProductionForecast : influences

    %% Relationships - Energy tracking & consumption
    LoadProfile "1" --> "*" ConsumptionRecord : defines pattern
    LoadProfile --> EnergySnapshot : drives consumption

    %% Relationships - Alerts
    Alert --> AlertType : uses
    Alert "1" o-- "0..1" EnergyRecommendation
    Battery ..> Alert : triggers
    ProductionForecast ..> Alert : triggers
    ConsumptionForecast ..> Alert : triggers
    BatteryLevelForecast ..> Alert : triggers

    %% Notes
    note for Profile "Authentication via Supabase Auth / Auth0 (not shown)"
    note for EnergySnapshot "Hourly snapshots track system state:\nProduction → Charge Battery → Consumption"
    note for Alert "Alerts trigger from battery states and all forecasts"