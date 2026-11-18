# Pull Request

## What & why

<!-- One paragraph: what changes and what problem it solves. -->

## Area

- [ ] Frontend (`pages/`, `components/`, `lib/`)
- [ ] Backend (`backend/`)
- [ ] CI / tooling
- [ ] Docs

## Checklist

- [ ] `npm run lint:ci` passes (0 errors)
- [ ] `npm run test:ci` passes
- [ ] `npm run build` succeeds locally (or CI build is green)
- [ ] `pytest backend -q` passes (backend changes)
- [ ] No new `.env` variable without a matching entry in `.env.example`
- [ ] No secrets, tokens or real credentials committed
- [ ] If a file was deleted, I grepped for importers first

## Notes for reviewers

<!-- Anything non-obvious: trade-offs, follow-up work, known limitations. -->
