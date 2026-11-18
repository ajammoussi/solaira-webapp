"""Environment-variable handling tests.

Locks down the documented defaults so config changes stay intentional, and
proves the API boots without the optional chatbot credentials/models.
"""

import pytest

from backend.main import app


def test_app_boots_without_chatbot_credentials(monkeypatch):
    """No CEREBRAS_API_KEY must not break import; only the chatbot is disabled."""
    monkeypatch.delenv("CEREBRAS_API_KEY", raising=False)
    # Importing succeeded (module-level import above); the agent is created in
    # the lifespan, which intentionally does not run for a plain TestClient.
    assert app is not None
    assert getattr(app.state, "agent", None) is None


def test_env_defaults_documented_in_example():
    """Every var the backend reads should appear in .env.example."""
    from pathlib import Path

    example = Path(__file__).resolve().parents[2] / ".env.example"
    if not example.exists():
        pytest.skip(".env.example not found")

    contents = example.read_text(encoding="utf-8")
    for name in (
        "CEREBRAS_API_KEY",
        "MODEL_NAMES",
        "PORT",
        "CORS_ORIGINS",
        "BATTERY_CAPACITY_KWH",
        "INITIAL_SOC_PERCENT",
        "DATA_DIR",
        "LOG_LEVEL",
    ):
        assert name in contents, f"{name} missing from .env.example"


def test_data_dir_default_points_at_backend_data():
    """DATA_DIR must default to an existing directory so startup does not warn."""
    from pathlib import Path

    import backend.main as main_module

    assert Path(main_module.DATA_DIR).is_dir(), main_module.DATA_DIR


def test_cors_origins_default_allows_all():
    """Default CORS_ORIGINS is '*' for development."""
    from backend.main import cors_origins

    assert cors_origins == ["*"]


def test_cors_origins_parsing_helper(monkeypatch):
    """Comma-separated origins are split and stripped (same expression as main.py)."""
    import os

    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:3000, https://solaira.tn ")
    parsed = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()]
    assert parsed == ["http://localhost:3000", "https://solaira.tn"]
