"""PV systems API contract tests.

Validates the endpoint shapes the frontend actually consumes
(``lib/api/pvMonitoring.js``) and the input validation guards.

Directory isolation (``configure_systems`` deletes every CSV it finds) is
handled globally by the autouse fixture in ``conftest.py``.
"""

import pytest
from fastapi.testclient import TestClient

from backend.core.phase_3.pv_monitor import reset_monitoring_service
from backend.main import app


@pytest.fixture(scope="module")
def client():
    reset_monitoring_service()
    yield TestClient(app)
    reset_monitoring_service()


def test_configure_rejects_out_of_range_system_count(client):
    assert client.post("/api/pv-systems/configure", json={"num_systems": 0}).status_code == 400
    assert client.post("/api/pv-systems/configure", json={"num_systems": 21}).status_code == 400


def test_configure_rejects_out_of_range_capacity(client):
    response = client.post(
        "/api/pv-systems/configure",
        json={"num_systems": 3, "capacity_per_system": 0.05},
    )
    assert response.status_code == 400


def test_configure_then_status_lists_systems(client):
    configured = client.post(
        "/api/pv-systems/configure",
        json={"num_systems": 3, "capacity_per_system": 1.5},
    )
    assert configured.status_code == 200

    status = client.get("/api/pv-systems/status")
    assert status.status_code == 200
    body = status.json()

    assert body["total_systems"] == 3
    assert len(body["systems"]) == 3
    assert "timestamp" in body


def test_monitoring_start_and_stop(client):
    client.post("/api/pv-systems/configure", json={"num_systems": 2, "capacity_per_system": 2.0})

    started = client.post(
        "/api/pv-systems/monitoring",
        json={"action": "start", "interval_seconds": 60},
    )
    assert started.status_code == 200

    stopped = client.post("/api/pv-systems/monitoring", json={"action": "stop"})
    assert stopped.status_code == 200


def test_monitoring_rejects_unknown_action(client):
    response = client.post("/api/pv-systems/monitoring", json={"action": "explode"})
    assert response.status_code == 400


def test_config_endpoint_shape(client):
    client.post("/api/pv-systems/configure", json={"num_systems": 2, "capacity_per_system": 2.0})
    body = client.get("/api/pv-systems/config").json()

    assert body["num_systems"] == 2
    assert isinstance(body["monitoring_active"], bool)
    assert len(body["systems"]) == 2
    assert {"id", "name", "capacity_kw", "has_anomaly"} <= set(body["systems"][0])


def test_history_returns_requested_window(client):
    client.post("/api/pv-systems/configure", json={"num_systems": 1, "capacity_per_system": 5.0})

    body = client.get("/api/pv-systems/1/history", params={"hours": 6}).json()
    assert body["system_id"] == 1
    assert body["hours"] == 6
    assert body["data_points"] == len(body["history"])
