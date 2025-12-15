# PV Monitoring Integration with src_final/phase_3 Pipeline

## Overview
The PV monitoring system is fully integrated with the `src_final/phase_3` predictive maintenance pipeline, using the complete `PredictiveMaintenancePipeline` class.

## Key Implementation

### 1. Single Pipeline Import
**Simple and clean:**
```python
from src_final.phase_3.predictive_maintenance import PredictiveMaintenancePipeline
```

The pipeline internally handles:
- Configuration loading
- Performance Ratio calculation
- Deviation score calculation
- Pairwise comparison matrix
- Visualization (optional)

### 2. Configuration System
The service creates a dynamic YAML configuration file that matches the `src_final/phase_3` structure:

**Location:** `backend/core/phase_3/monitoring_data/monitoring_config.yaml`

```yaml
config_version: '3.0.0'
system_name: 'Real-time PV Monitoring System'

pv_systems:
  systems:
    - name: 'PV_System_1'
      actual_data: 'backend/core/phase_3/monitoring_data/pv_system_1_actual.csv'
      predicted_data: 'backend/core/phase_3/monitoring_data/pv_system_1_predicted.csv'
    # ... more systems

deviation_score:
  warning_threshold: 0.20      # ≤20%: healthy
  critical_threshold: 0.30     # >30%: critical
```

### 3. Data Format Compatibility
The monitoring service now saves data in CSV format compatible with the phase_3 pipeline:

**CSV Structure:**
- `date` column (YYYY-MM-DD format)
- `energy_kwh` column (daily aggregated production)

**Files Generated:**
- `pv_system_1_actual.csv` - Actual production data
- `pv_system_1_predicted.csv` - Predicted production data
- (One pair per system)

### 4. Analysis Method Update

**Old Approach:**
- Single-system PR calculation
- Simple threshold-based anomaly detection

**New Approach (Pairwise Comparison):**
- Multi-system comparative analysis
- Pairwise deviation matrix across N systems
- Anomaly detection based on peer comparison
- Severity categorization:
  - **NORMAL**: Mean deviation ≤20%
  - **MEDIUM** (Warning): Mean deviation 20-30%
  - **CRITICAL**: Mean deviation >30%

### 5. Analysis Workflow

```
1. Configure systems → Creates YAML config file
   ↓
2. Initialize PredictiveMaintenancePipeline(config_path)
   ↓
3. Generate mock data every minute
   ↓
4. Save to CSV files (daily aggregation)
   ↓
5. pipeline.load_data() - Loads all system data
   ↓
6. pipeline.calculate_performance_ratios() - Calculates PR for each system
   ↓
7. pipeline.calculate_pairwise_deviations() - Analyzes deviations
   ↓
8. Return system status with severity level
   ↓
9. Frontend displays: Green/Yellow/Red
```

## Pipeline Methods Used

### PredictiveMaintenancePipeline Methods:
1. **`__init__(config_path)`** - Initializes the pipeline with YAML config
2. **`load_data()`** - Loads actual and predicted data for all systems
3. **`calculate_performance_ratios(pv_data)`** - Calculates PR for all systems
4. **`calculate_pairwise_deviations(pr_all_systems)`** - Creates deviation matrix and analyzes

## API Response Format

### System Status Response
```json
{
  "system_id": 1,
  "system_name": "PV System 1",
  "status": "warning",
  "severity": "warning",
  "recent_pr": 0.75,
  "mean_deviation": 0.25,
  "category": "MEDIUM",
  "current_anomaly": "panel_soiling",
  "issues_detected": [
    "Warning: 25.0% deviation from peer systems",
    "Active anomaly: Panel Soiling"
  ],
  "data_points": 120,
  "analysis_method": "pairwise_comparison"
}
```

## Severity Levels

| Severity | Color | Condition | Action |
|----------|-------|-----------|--------|
| `normal` | Green (#00D9A3) | Mean deviation ≤20% | No action needed |
| `warning` | Yellow (#ffaa00) | Mean deviation 20-30% | Monitor closely |
| `critical` | Red (#ff4444) | Mean deviation >30% | Immediate action required |

## Anomaly Types Supported

1. **panel_soiling**: 10-20% production loss
2. **partial_shading**: 15-30% production loss
3. **inverter_issue**: 20-40% production loss
4. **micro_failure**: 5-15% production loss

Each anomaly:
- Has random probability of occurring (2% per minute)
- Lasts 10-60 minutes
- Automatically resolves after duration

## Frontend Integration

The frontend components remain unchanged:
- `PVSystemsGrid` - Visual representation with color coding
- `PVSystemsConfig` - Configuration UI
- `lib/services/pvMonitoring.js` - API service layer

## Testing

To test the integration:

1. **Configure systems:**
   ```bash
   POST /api/pv-systems/configure
   {
     "num_systems": 4,
     "capacity_per_system": 5.0
   }
   ```

2. **Start monitoring:**
   ```bash
   POST /api/pv-systems/monitoring
   {
     "action": "start"
   }
   ```

3. **Check status:**
   ```bash
   GET /api/pv-systems/status
   ```

4. **View in UI:**
   - Navigate to `/maintenance`
   - Toggle configuration panel
   - Configure systems and start monitoring
   - Watch grid for color changes (green/yellow/red)

## Benefits of src_final/phase_3 Integration

1. ✅ **Industry-standard approach**: Pairwise comparison is proven for multi-PV monitoring
2. ✅ **More accurate**: Detects relative performance issues, not just absolute thresholds
3. ✅ **Scalable**: Works with N systems (2 to 20+)
4. ✅ **Weather-independent**: Peer comparison accounts for common weather conditions
5. ✅ **Config-driven**: Easy to adjust thresholds and parameters
6. ✅ **CSV-based**: Data can be exported and analyzed offline

## File Structure

```
backend/core/phase_3/
├── pv_monitor.py                 # Updated to use src_final pipeline
├── INTEGRATION_NOTES.md          # This file
└── monitoring_data/              # Generated at runtime
    ├── pv_config.json           # System configuration
    ├── pv_system_1_actual.csv   # Actual production (System 1)
    ├── pv_system_1_predicted.csv
    ├── pv_system_2_actual.csv   # Actual production (System 2)
    ├── pv_system_2_predicted.csv
    └── ...
```

## Compatibility Notes

- **Minimum systems**: 2 (for pairwise comparison)
- **Maximum systems**: Tested up to 20
- **Data retention**: Last 24 hours in memory, daily aggregation in CSV
- **Analysis interval**: Real-time (updated every API call)
- **Python version**: 3.10-3.12 (same as backend)
- **Dependencies**: All already installed (pandas, numpy, pyyaml)

## Future Enhancements

1. Add time-series visualization of PR trends
2. Export deviation analysis reports
3. Email/SMS alerts for critical anomalies
4. Historical anomaly tracking
5. Machine learning-based anomaly prediction
