"""Health and route-registration tests.

These are the cheapest possible regression net: if the FastAPI app fails to
import, or a refactor removes/duplicates a route, CI fails here first.
"""

import pytest
from fastapi.testclient import TestClient

from backend.main import app


@pytest.fixture(scope="module")
def client():
    # Deliberately NOT using `with TestClient(app)` — that runs the heavy
    # lifespan (model loading) which is covered by test_models_import instead.
    return TestClient(app)


def test_root_returns_service_summary(client):
    response = client.get("/")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "healthy"
    assert "message" in body


def test_health_returns_ok(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_api_health_returns_model_message(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "healthy"
    assert "message" in body


def test_openapi_schema_is_served(client):
    response = client.get("/openapi.json")
    assert response.status_code == 200
    assert "paths" in response.json()


def _declared_routes():
    return [
        (route.path, method)
        for route in app.routes
        if hasattr(route, "methods")
        for method in route.methods
        if method != "HEAD"
    ]


def test_no_duplicate_route_registrations():
    """A duplicated (path, method) pair means a silently shadowed handler."""
    routes = _declared_routes()
    assert len(routes) == len(set(routes)), f"duplicate routes: {routes}"


def test_expected_routes_are_registered():
    registered = set(_declared_routes())
    expected = {
        ("/", "GET"),
        ("/health", "GET"),
        ("/api/health", "GET"),
        ("/predict", "POST"),
        ("/simulate", "POST"),
        ("/maintenance", "POST"),
        ("/energy-simulation", "POST"),
        ("/api/chat", "POST"),
        ("/api/pv-systems/configure", "POST"),
        ("/api/pv-systems/monitoring", "POST"),
        ("/api/pv-systems/status", "GET"),
        ("/api/pv-systems/{system_id}/status", "GET"),
        ("/api/pv-systems/{system_id}/history", "GET"),
        ("/api/pv-systems/config", "GET"),
    }
    assert expected.issubset(registered), f"missing routes: {expected - registered}"
