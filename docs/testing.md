# Testing

Two suites that run independently. CI runs both
(`.github/workflows/ci.yml`), path-filtered so only the affected side runs.

## Commands

```bash
# Frontend (Jest + React Testing Library)
npm run test            # watch/dev
npm run test:ci         # CI mode with coverage + threshold

# Backend (pytest)
# pytest/ruff are not in requirements.txt (serving deps only):
pip install -r backend/requirements-ci.txt   # adds pytest, ruff, pyyaml
python -m pytest backend -q
ruff check backend      # lint
```

## Frontend

Jest via `next/jest`, so JSX, CSS modules and module resolution match the app.
RTL is pinned to **v12** because the app runs React 17 (RTL 13+ requires React 18).

```
tests/
  setup.js                      jest-dom matchers, dummy env, console silencers
  unit/  csvParser              CSV parsing edge cases
         csvRoutePattern        path-traversal whitelist (security)
         config                 env defaults + panel catalogue
  hooks/ useCSVData             request contract + module cache
         useSummaryStats        hardcoded stats resolution (duplicate-key guard)
  components/ marketing         SectionHeading / Button / FeatureCard
  api/   profile                auth, method, and column-whitelist behaviour
```

What the suite deliberately protects:

- **The CSV route's filename regex** — it is a path-traversal boundary. If it is
  relaxed, `tests/unit/csvRoutePattern.test.js` fails.
- **`/api/profile`'s field whitelist** — a client must not be able to write
  arbitrary columns or override its own row id.
- **The panel catalogue** — `tests/unit/config.test.js` asserts one entry per
  supported panel count, which is what caught the duplicated `16:` key.

Coverage is collected for `lib/`, `components/` and `pages/api/`, with a
deliberately low floor (8%) so the gate is enforceable today. Raise it as
coverage grows; do not lower it.

## Backend

```
backend/tests/
  test_health.py         routes register once, expected endpoints exist, health shapes
  test_env.py            boots without chatbot credentials, documented env defaults
  test_pv_monitor.py     synthetic generator, health mapping, service singleton
  test_pv_systems_api.py configure/status/history contract + input validation
  test_maintenance.py    length validation, status mapping, JSON safety (no NaN)
  test_config_paths.py   YAML files parse and referenced data files exist
  test_fixture_integrity guard: the suite never mutates tracked fixtures
```

Notes:

- `conftest.py` puts the repo root on `sys.path`, so `import backend.*` works
  from anywhere.
- The `TestClient` fixture intentionally does **not** use `with TestClient(app)`,
  so the heavy lifespan (model loading) does not run. Tests requiring artifacts
  should be marked `@pytest.mark.slow`.
- `requirements-ci.txt` excludes TensorFlow and ONNX Runtime. Installing the full
  `requirements.txt` in CI is not required and would dominate runtime.

`test_config_paths.py` exists because `maintenance_config.yaml` once referenced a
data folder that was never committed, and the pipeline silently fell back to
defaults on every boot — including on Windows, filtered through a second bug
where an emoji in the loader crashed under cp1252.

## Adding a test

- Frontend: put it under `tests/<area>/`, mock `lib/hooks/useAuth` and
  `lib/hooks/useCSVData` with **stable object identities** (a fresh literal per
  call causes a render loop), and assert on behaviour rather than internals.
- Backend: put it under `backend/tests/`, use `TestClient` for API shape and a
  plain function call for domain logic.
