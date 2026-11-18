# Frontend

Next.js **12.1** with the **Pages Router**, React 17, CSS Modules plus one
global stylesheet. There is no TypeScript in the app (the `.d.ts` dev deps are
editor tooling only), and `next-intl` is mounted but unused (`locales/en.json`
is `{}`).

## App shell

`pages/_app.js` composes, outermost first:

1. `NextIntlProvider` — inert today (no messages).
2. `AuthProvider` (`lib/hooks/useAuth.js`) — Supabase session + profile.
3. `GlobalProvider` (`global-context.js`) — locale context, also inert.
4. The page component, then two global mounts:
   - `SetupEnforcer` → shows `SolarSetupModal` until
     `profile.preferences.setup_completed === true`.
   - `ChatbotWrapper` → `SolarChatbot` on every page (it is not mounted per page).

Guarded pages redirect to `/signin` themselves via a `useEffect` (there is no
route-level HOC in use).

## Routes

| Route | File | Notes |
| --- | --- | --- |
| `/` | `pages/index.js` | Marketing landing page |
| `/about`, `/blog`, `/contact`, `/pricing` | `pages/*/index.js` | Static content |
| `/dashboard`, `/energy`, `/predictions`, `/maintenance`, `/settings` | `pages/*/index.jsx` | App, sidebar shell |
| `/signin`, `/signup`, `/account`, `/forgot-password`, `/reset-password`, `/callback` | `pages/auth/*` | Rewrites in `next.config.js` drop the `/auth` prefix |
| `/oauth/consent` | `pages/oauth/consent.js` | OAuth consent landing |
| `/404` | `pages/404.js` | |

## Data layer

Two mechanisms, and knowing which page uses which is the main thing to
understand:

**1. CSV fixtures (dashboard, energy, predictions, maintenance).**
`lib/hooks/useCSVData.js` fetches three CSVs for the panel count in
`profile.current_system` through the `/api/csv/*` route, parses them with
`lib/utils/csvParser.js`, and memoises per panel count in a module-level object.

`lib/hooks/useEnergyData.js` builds on top of it:
`useRealtimeEnergy`, `useHistoricalData`, `useForecast`, `useRecommendations`,
`useMaintenanceAlerts`, `useSystemConfig`, `useSummaryStats`, and the composite
`useAllEnergyData`. Several of them fall back to `lib/mockData.js` when a CSV is
missing.

> `useSummaryStats` contains a hardcoded statistics table keyed by panel count.
> It is intentional (signed-off figures), not a bug, but it means those numbers
> are not derived from the CSVs.

**2. Python API (predictions, maintenance).**
`lib/api/pythonApi.js` wraps `POST /energy-simulation`, `/maintenance`,
`/predict` and `/simulate`; `useEnergySimulation` and `useDailyPrediction` sit on
top. `lib/api/pvMonitoring.js` wraps the `/api/pv-systems/*` endpoints used by
`PVSystemsGrid` and the maintenance page.

**3. Supabase directly.** Auth and profile reads/writes, plus `/api/profile`
for server-side writes.

## Components

| Group | Components |
| --- | --- |
| Marketing | `Header`, `Footer`, `Button`, `CookieBanner`, `FeatureCard`, `FeaturesSection`, `InfoSection`, `SectionHeading`, `TrustBadge` |
| App shell | `Layout` (sidebar + account menu + logout) |
| Dashboard | `EnergyFlowDiagram`, `ElectricityUsage` |
| Energy | `EnergyDistributionCard`, `BarChart` |
| Predictions | `PowerSourcesChart`, `EnergySimulationChart` |
| Maintenance | `PVSystemsGrid` |
| Forecast | `solar-forecast/{PVForecastForm,PredictionChart,PredictionTable}` |
| Global | `SolarChatbot`, `SolarSetupModal` |
| Auth | `Auth/` (inputs, buttons, OAuth buttons, messages) |

## Configuration

`lib/config/` is the single place for values that used to be literals:

- `env.js` — env access with documented defaults (service URLs, branding,
  panel/battery defaults, tariffs).
- `constants.js` — code invariants (polling intervals, timeouts, cache size).
- `solar-systems.js` — the panel catalogue used by the setup modal, the
  maintenance page, and cross-checked by the CSV route test.

## Styling

Three approaches coexist, which is known debt:

1. CSS Modules per component (`components/*/styles.module.css`) — preferred.
2. TeleportHQ class names on the landing page (`frame1920wlight-*` in
   `pages/index.js` + `pages/style.css`).
3. Inline `style={{}}` objects, heaviest in `SolarSetupModal.jsx` and `Layout`.

New code should use CSS Modules.
