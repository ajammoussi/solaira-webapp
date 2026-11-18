"""PV monitoring domain tests.

Covers the synthetic data generator, health-state mapping and the singleton
service accessor. No external calls, no model artifacts required.
"""

import pytest

from backend.core.phase_3.pv_monitor import (
    HealthStatus,
    PVSystem,
    PVMonitoringService,
    SolarDataGenerator,
    get_monitoring_service,
    reset_monitoring_service,
)


def test_health_status_values_are_stable():
    assert HealthStatus.HEALTHY.value == "healthy"
    assert HealthStatus.WARNING.value == "warning"
    assert HealthStatus.CRITICAL.value == "critical"


def test_pv_system_health_status_property():
    system = PVSystem(system_id=1, name="PV_1", capacity_kw=5.0)
    assert system.health_status == "healthy"
    assert system.id == 1


def test_pv_system_degradation_ordering():
    """Critical systems must degrade below warning, warning below healthy."""
    healthy = PVSystem(system_id=1, name="h", health=HealthStatus.HEALTHY)
    warning = PVSystem(system_id=2, name="w", health=HealthStatus.WARNING)
    critical = PVSystem(system_id=3, name="c", health=HealthStatus.CRITICAL)

    assert healthy._base_performance > warning._base_performance > critical._base_performance


def test_daily_production_scales_with_capacity(monkeypatch):
    """Doubling capacity must double production, given the same weather.

    The generator draws a random weather factor per call, so pin it to make the
    linear relationship observable.
    """
    from datetime import datetime

    import backend.core.phase_3.pv_monitor as pv_monitor

    monkeypatch.setattr(pv_monitor.np.random, "uniform", lambda low, high: 1.0)

    day = datetime(2025, 6, 15)
    predicted_5, _ = SolarDataGenerator.daily_production(day, capacity_kw=5.0)
    predicted_10, _ = SolarDataGenerator.daily_production(day, capacity_kw=10.0)

    assert predicted_10 == pytest.approx(predicted_5 * 2, rel=1e-6)


def test_daily_production_is_non_negative_and_finite():
    from datetime import datetime

    for month in range(1, 13):
        predicted, actual = SolarDataGenerator.daily_production(datetime(2025, month, 15), 5.0)
        assert predicted >= 0
        assert actual >= 0
        assert predicted == predicted  # not NaN


def test_monitoring_service_is_a_singleton():
    reset_monitoring_service()
    first = get_monitoring_service()
    second = get_monitoring_service()
    assert first is second
    assert isinstance(first, PVMonitoringService)
    reset_monitoring_service()
