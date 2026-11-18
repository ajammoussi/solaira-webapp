# Environment variables

**One file for both apps.** `.env.local` at the repository root:

- Next.js loads it automatically.
- `backend/main.py` loads it explicitly (`load_dotenv(root/.env.local)`).

Copy the template and fill in the blanks:

```bash
cp .env.example .env.local          # Windows: copy .env.example .env.local
```

`.env.local` is gitignored. `.env.example` is committed and documents every
variable with its default. **If you add a variable to the code, add it there
too** — `backend/tests/test_env.py` enforces this for the backend.

## Frontend

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | **yes** | — | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **yes** | — | Supabase anon key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | no | anon key | Server-side writes that bypass RLS |
| `NEXT_PUBLIC_PYTHON_API_URL` | no | `http://localhost:8001` | Main API |
| `SOLAR_FORECAST_SERVICE_URL` | no | `http://localhost:8002` | Quartz service (server-side proxy) |
| `NEXT_PUBLIC_SITE_URL` | no | `http://localhost:3000` | Canonical URL, SEO |
| `NEXT_PUBLIC_CONTACT_EMAIL` | no | `info@solaira.tn` | Header/footer |
| `NEXT_PUBLIC_CONTACT_PHONE` | no | `(+216) 99-999-999` | Header/footer |
| `NEXT_PUBLIC_DEFAULT_PANELS` | no | `10` | Fallback before setup |
| `NEXT_PUBLIC_DEFAULT_BATTERY_KWH` | no | `13.5` | Fallback before setup |
| `NEXT_PUBLIC_GRID_PRICE_KWH` | no | `0.20` | Savings estimate |
| `NEXT_PUBLIC_EXPORT_PRICE_KWH` | no | `0.12` | Export savings estimate |

Without the two Supabase variables the app still builds and renders, but auth and
all persistence are disabled (`isSupabaseConfigured` in `lib/supabase.js`).

## Backend (main service)

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `CEREBRAS_API_KEY` | no | — | Chatbot. Unset ⇒ `/api/chat` reports "agent not initialised" |
| `MODEL_NAMES` | no | `llama3.1-8b` | Comma-separated failover chain |
| `PORT` | no | `8001` | uvicorn port |
| `CORS_ORIGINS` | no | `*` | Comma-separated allowed origins |
| `BATTERY_CAPACITY_KWH` | no | `13.5` | Simulation battery size |
| `INITIAL_SOC_PERCENT` | no | `50` | Simulation start SOC |
| `DATA_DIR` | no | `backend/data` | CSV source directory |
| `LOG_LEVEL` | no | `INFO` | Logging level |

## Quartz forecast service

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `QUARTZ_SOLAR_FORECAST_LOGGING` | no | `True` | Sentry logging toggle |
| `QUARTZ_SOLAR_FORECAST_VERSION` | no | package version | Reporting |

`ENPHASE_SYSTEM_ID` / `ENPHASE_ACCESS_TOKEN` / `HF_TOKEN` exist in the vendored
package but are **not used** by the served `api/v1` endpoint.

## CI

GitHub Actions sets dummy `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` so the build
and the Jest suite run without secrets. No secret is required for CI to be green.

## Never commit

`.env.local`, service-role keys, Cerebras keys, Supabase project secrets.
`.gitignore` covers `.env`, `.env.local` and `.env.*.local`.
