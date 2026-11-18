"""Pytest bootstrap.

Puts the repository root on ``sys.path`` so tests can import ``backend.*`` the
same way ``backend/main.py`` does, regardless of where pytest is invoked from.
"""

import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = REPO_ROOT / "backend"

for path in (str(REPO_ROOT), str(BACKEND_DIR)):
    if path not in sys.path:
        sys.path.insert(0, path)

# Keep test output readable on Windows consoles (cp1252).
os.environ.setdefault("PYTHONIOENCODING", "utf-8")
os.environ.setdefault("CEREBRAS_API_KEY", "")
