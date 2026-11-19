# Authentication

Authentication and all persistence run through **Supabase** from the browser.
The Python services never authenticate and never touch the database.

## Setup

1. Create a Supabase project.
2. Put the URL and anon key in `.env.local` (see [environment.md](environment.md)).
3. Create the schema. Either `npm run db:apply` (needs `SUPABASE_DB_URL` from
   Dashboard → Database → Connection string; see [environment.md](environment.md)),
   or paste `database/schema.sql` into the Supabase SQL editor. It creates
   `profiles`, `pv_systems`, `batteries`, `load_profiles`, `energy_snapshots`,
   forecasts, `alerts` and `energy_recommendations`, enables RLS on all of them,
   and adds a trigger that creates a `profiles` row on signup. It is the only
   schema file — there is no SQLite fallback — and it is safe to re-run.
   `npm run db:apply` also backfills a `profiles` row for accounts that signed
   up before the schema existed; if you paste the SQL manually, run the same
   `INSERT INTO public.profiles … SELECT … FROM auth.users ON CONFLICT DO NOTHING`
   from `scripts/apply-schema.mjs` afterwards.
4. Optional: enable Google/GitHub providers and anonymous sign-ins in
   Supabase → Authentication.

The service-role key (`SUPABASE_SERVICE_ROLE_KEY`) is used **server-side only**
by `/api/profile`, so profile writes are not blocked by RLS.

## Routes

| Route | File | Guard |
| --- | --- | --- |
| `/signin` | `pages/auth/signin.js` | redirects away when signed in |
| `/signup` | `pages/auth/signup.js` | redirects away when signed in |
| `/forgot-password` | `pages/auth/forgot-password.js` | redirects away when signed in |
| `/reset-password` | `pages/auth/reset-password.js` | requires the email link token |
| `/account` | `pages/auth/account.js` | redirects to `/signin` when signed out |
| `/callback` | `pages/auth/callback.js` | OAuth redirect handler |

`next.config.js` rewrites the bare paths (`/signin` → `/auth/signin`, etc.).

## Providers

`pages/_app.js` mounts `AuthProvider`, which exposes:

```js
const {
  user, profile, loading, error,
  isAuthenticated, isGuest,
  signUp, signIn, signInWithOAuth, signOut,
  updateProfile, resetPassword, updatePassword,
  refreshProfile,
} = useAuth();
```

- `isAuthenticated` is `!!user`.
- `isGuest` is `!!user?.is_anonymous` — a Supabase anonymous session. It is a
  real signed-in session with no email identity.

Session and profile fetches race a 5 s / 3 s timeout, so a slow or unreachable
Supabase degrades to "signed out" instead of an infinite spinner.

## Protecting an API route

```js
import { withApiAuth } from '../../lib/auth/apiMiddleware';

async function handler(req, res) {
  // req.user      — the authenticated Supabase user
  // req.supabase  — server client (service role when configured)
  return res.status(200).json({ ok: true });
}

export default withApiAuth(handler, { allowGuest: false });
```

`withApiAuth` requires `Authorization: Bearer <access token>`, and can require a
non-anonymous user (`allowGuest: false`) or an admin role (`requireAdmin: true`).
`/api/profile` uses `allowGuest: false` and only writes the caller's own row.

## Guest mode

Previously several pages read an `isGuest` value and one called
`enterGuestMode()` — neither existed on the auth context, so the guest path was
dead code (and would have thrown). It has been removed:

- `isGuest` is now derived from the real Supabase anonymous flag.
- There is no in-app "continue as guest" button. If guest access is wanted,
  call `supabase.auth.signInAnonymously()` and enable anonymous sign-ins in
  Supabase.

The `GuestButton` component in `components/Auth` is exported but unused; keep it
if the feature returns, otherwise it can be deleted.

## Manual checklist

Kept as a record of the flows that were exercised by hand; automated coverage
for these does not exist yet.

- [ ] Sign up with email/password, confirm the email, reach `/dashboard`
- [ ] Sign in, refresh the page, stay signed in
- [ ] Wrong password shows an error and does not navigate
- [ ] Password reset email arrives; the link opens `/reset-password`; the new
      password works
- [ ] Google OAuth returns to `/callback` then `/dashboard`
- [ ] Sign out clears the session in this and other tabs
- [ ] `/account` and `/settings` writes persist after a reload
- [ ] A signed-out user visiting `/dashboard` is redirected to `/signin`
