"""Guards for the monitoring fixtures.

Regression tests for two real incidents:

1. ``PVMonitoringService`` defaulted its data directory to the *relative* path
   ``backend/core/phase_3/monitoring_data``, so depending on the working
   directory it wrote a stray ``backend/backend/`` tree.
2. ``configure_systems`` deletes every CSV it finds, and the API tests used to
   point it at the repository fixtures, overwriting committed data.

The per-test directory isolation lives in ``conftest.py`` (autouse), so these
tests can safely exercise the real endpoints and then assert nothing changed.
"""

import json
from pathlib import Path

PHASE3_DIR = Path(__file__).resolve().parents[1] / "core" / "phase_3"
MONITORING_DIR = PHASE3_DIR / "monitoring_data"
REPO_ROOT = PHASE3_DIR.parents[1]


def test_fixtures_exist():
    fixtures = sorted(MONITORING_DIR.glob("pv_system_*_*.csv"))
    assert fixtures, f"no monitoring fixtures in {MONITORING_DIR}"


def test_no_stray_nested_backend_directory():
    """backend/backend/ appeared once because of a relative default path."""
    assert not (REPO_ROOT / "backend" / "backend").exists(), "stray backend/backend/ tree"


def test_endpoints_do_not_touch_tracked_fixtures():
    """The API tests configure systems; that must never delete real fixtures."""
    before = {p.name: p.read_bytes() for p in sorted(MONITORING_DIR.glob("pv_system_*_*.csv"))}

    from fastapi.testclient import TestClient

    from backend.main import app

    client = TestClient(app)
    client.post("/api/pv-systems/configure", json={"num_systems": 2, "capacity_per_system": 1.0})

    after = {p.name: p.read_bytes() for p in sorted(MONITORING_DIR.glob("pv_system_*_*.csv"))}

    assert after == before, (
        "tracked monitoring fixtures changed. The conftest isolation fixture "
        "must patch PVMonitoringService.__init__ before any service exists."
    )


def test_pv_config_json_parses():
    config = MONITORING_DIR / "pv_config.json"
    if config.exists():
        assert isinstance(json.loads(config.read_text(encoding="utf-8")), dict)
