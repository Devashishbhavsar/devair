# Wave Status

## DEV-104 - Reservation Store Recovery

- Updated: 2026-07-17
- Scope: W1-RESERVE reservation JSON-store replacement and smoke evidence.
- Store: `lib/reservations.ts` no longer imports `fs/promises`, `tmpdir`, or writes `reservations.json`; reservation holds use the app process repository.
- Smoke: `DEVAIR_SMOKE_BASE_URL=http://127.0.0.1:3210 npm run smoke:reservations` passed against `npm run start -- -p 3210`.
  - `48h`: create -> retrieve -> PDF passed, example PNR `RC24L4`, PDF bytes `3204`.
  - `14d`: create -> retrieve -> PDF passed, example PNR `GXGMXG`, PDF bytes `3209`.
- MVP verification: `npm run test:mvp` passed (`npm run lint && npm run build`).
- Build note: Next.js 16.2.10 emitted the existing multiple-lockfile workspace-root warning for `/home/dev1029/package-lock.json` and `/home/dev1029/DevAir/package-lock.json`; build completed successfully.
