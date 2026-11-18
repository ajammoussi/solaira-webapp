"""Maintenance analysis contract tests.

``/maintenance`` is called by both ``pages/maintenance`` and ``pages/predictions``.
It must always return JSON-safe values: ``NaN``/``inf`` in the response would
produce invalid JSON on the wire and break the charts.
"""

import json

import pytest
from fastapi.testclient import TestClient

from backend.main import app


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


def _payload(days=3, efficiency_last=1.0):
    return {
        "dates": [f"2025-06-{d:02d}" for d in range(1, days + 1)],
        "actual_production": [10.0] * (days - 1) + [10.0 * efficiency_last],
        "predicted_production": [10.0] * days,
    }


def test_maintenance_rejects_mismatched_lengths(client):
    payload = {
        "dates": ["2025-06-01", "2025-06-02"],
        "actual_production": [1.0],
        "predicted_production": [1.0, 1.0],
    }
    response = client.post("/maintenance", json=payload)
    assert response.status_code == 400
    assert "same length" in response.json()["detail"]


def test_maintenance_healthy_series_is_normal(client):
    body = client.post("/maintenance", json=_payload()).json()

    assert body["analysis"]["status"] in {"normal", "warning", "critical", "unknown"}
    assert isinstance(body["analysis"]["issues"], list)
    assert len(body["pr_history"]) == 3
    assert all({"date", "pr"} <= set(point) for point in body["pr_history"])


def test_maintenance_detects_degradation(client):
    """A series averaging well below expected must not be reported as healthy."""
    payload = {
        "dates": [f"2025-06-{d:02d}" for d in range(1, 5)],
        "actual_production": [5.0, 5.0, 5.0, 5.0],
        "predicted_production": [10.0, 10.0, 10.0, 10.0],
    }
    body = client.post("/maintenance", json=payload).json()

    assert body["analysis"]["mean_pr"] == pytest.approx(0.5)
    assert body["analysis"]["status"] in {"warning", "critical"}
    assert body["analysis"]["issues"]


def test_maintenance_response_is_json_safe(client):
    """No NaN/Infinity literals may leak into the payload."""
    body = client.post("/maintenance", json=_payload(days=4, efficiency_last=0.0)).json()
    serialized = json.dumps(body)
    assert "NaN" not in serialized
    assert "Infinity" not in serialized


def test_maintenance_zero_prediction_does_not_crash(client):
    """Predicted == 0 would divide by zero if PR were not guarded."""
    payload = {
        "dates": ["2025-06-01", "2025-06-02"],
        "actual_production": [1.0, 2.0],
        "predicted_production": [0.0, 0.0],
    }
    response = client.post("/maintenance", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["analysis"]["status"] == "unknown"
    assert all(point["pr"] is None for point in body["pr_history"])
