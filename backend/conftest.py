"""Pytest bootstrap.

Puts the repository root on ``sys.path`` so tests can import ``backend.*`` the
same way ``backend/main.py`` does, regardless of where pytest is invoked from.

Also isolates the PV monitoring data directory: ``configure_systems`` *deletes*
every CSV it finds, and the service defaulted to the repository's tracked
``monitoring_data/`` fixtures. Autouse so no test can forget it.
"""

import os
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = REPO_ROOT / "backend"

for path in (str(REPO_ROOT), str(BACKEND_DIR)):
    if path not in sys.path:
        sys.path.insert(0, path)

# Keep test output readable on Windows consoles (cp1252).
os.environ.setdefault("PYTHONIOENCODING", "utf-8")
os.environ.setdefault("CEREBRAS_API_KEY", "")


@pytest.fixture(autouse=True)
def _isolate_monitoring_data(tmp_path, monkeypatch):
    """Point PVMonitoringService at a temp dir for every test.

    Without this, ``configure_systems`` wipes the tracked fixtures in
    ``backend/core/phase_3/monitoring_data/``.
    """
    from backend.core.phase_3 import pv_monitor

    isolated = tmp_path / "monitoring_data"
    isolated.mkdir(parents=True, exist_ok=True)

    original_init = pv_monitor.PVMonitoringService.__init__

    def isolated_init(self, data_dir=None, maintenance_pipeline=None):
        original_init(self, str(isolated), maintenance_pipeline)

    monkeypatch.setattr(pv_monitor.PVMonitoringService, "__init__", isolated_init)
    pv_monitor.reset_monitoring_service()
    yield
    pv_monitor.reset_monitoring_service()
