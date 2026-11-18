"""Config-file integrity tests.

Regression guard for a real bug: ``maintenance_config.yaml`` used to point at a
``test_randomized_data/`` folder that was never committed, so the predictive
maintenance pipeline silently fell back to default config on every boot.
"""

from pathlib import Path

import pytest
import yaml

BACKEND_DIR = Path(__file__).resolve().parents[1]

PHASE2_CONFIG = BACKEND_DIR / "core" / "phase_2" / "system_config.yaml"
PHASE3_CONFIG = BACKEND_DIR / "core" / "phase_3" / "maintenance_config.yaml"


@pytest.mark.parametrize("path", [PHASE2_CONFIG, PHASE3_CONFIG])
def test_config_file_exists_and_parses(path):
    assert path.is_file(), f"missing config: {path}"
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    assert isinstance(data, dict)
    assert "config_version" in data


def test_phase3_referenced_data_files_exist():
    """Every declared PV system must resolve relative to backend/."""
    data = yaml.safe_load(PHASE3_CONFIG.read_text(encoding="utf-8"))
    systems = data["pv_systems"]["systems"]
    assert systems, "no PV systems declared"

    for system in systems:
        actual = BACKEND_DIR / system["actual_data"]
        predicted = BACKEND_DIR / system["predicted_data"]
        assert actual.is_file(), f"{system['name']}: missing {system['actual_data']}"
        assert predicted.is_file(), f"{system['name']}: missing {system['predicted_data']}"


def test_phase3_thresholds_are_ordered():
    data = yaml.safe_load(PHASE3_CONFIG.read_text(encoding="utf-8"))
    thresholds = data["deviation_score"]
    assert thresholds["warning_threshold"] < thresholds["critical_threshold"]
    assert 0 < thresholds["warning_threshold"] < 1
    assert 0 < thresholds["critical_threshold"] < 1


def test_phase2_battery_limits_are_sane():
    data = yaml.safe_load(PHASE2_CONFIG.read_text(encoding="utf-8"))
    battery = data["battery"]

    assert battery["capacity_kwh"] > 0
    assert 0 <= battery["min_soc_percent"] < battery["max_soc_percent"] <= 100
    assert 0 < battery["round_trip_efficiency"] <= 1


def test_predictive_maintenance_loads_declared_data():
    """The pipeline must actually load data, not silently fall back to defaults."""
    from backend.core.phase_3.predictive_maintenance import PredictiveMaintenancePipeline

    pipeline = PredictiveMaintenancePipeline()
    loaded = pipeline.load_data()

    assert loaded, "pipeline loaded no PV systems"
    expected = {s["name"] for s in yaml.safe_load(PHASE3_CONFIG.read_text(encoding="utf-8"))["pv_systems"]["systems"]}
    assert set(loaded).issubset(expected)
