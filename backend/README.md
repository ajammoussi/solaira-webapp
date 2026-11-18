# Backend

See the root documentation instead of a partial copy here:

- [../docs/backend.md](../docs/backend.md) — services, modules, endpoints, known gaps
- [../docs/api.md](../docs/api.md) — endpoint contracts
- [../docs/environment.md](../docs/environment.md) — configuration
- [../docs/testing.md](../docs/testing.md) — test suite

## Quick reference

```bash
# Full serving stack (both services)
python backend/start.py

# Main API only
python backend/main.py

# Tests + lint
python -m pytest backend -q
ruff check backend
```

Python 3.10+. Install with `pip install -r backend/requirements.txt`; CI uses the
slimmer `backend/requirements-ci.txt`.
