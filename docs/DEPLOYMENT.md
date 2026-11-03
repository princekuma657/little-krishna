# LittleKrishna Deployment

## Frontend — AWS Amplify

- Static SPA hosted on AWS Amplify. Keep this architecture unchanged.
- Build: `cd frontend && npm run build`.
- Deploy output: `frontend/dist`.
- Required build-time environment variable (set in the Amplify App →
  Environment variables, must be present **before** the build runs):

  ```
  VITE_API_URL=https://little-krishna-2-bwx1.onrender.com/api/v1
  ```

  This is the public, browser-facing API URL — never place backend secrets
  in frontend environment variables.
- Note: production builds fall back to the deployed Render endpoint if
  `VITE_API_URL` is missing or not an absolute `http(s)` URL, so the SPA
  can no longer 404 against the Amplify origin. Configuring the variable
  explicitly is still recommended as the single source of truth.

## Backend — Render

- Render service: `little-krishna-2` (`https://little-krishna-2-bwx1.onrender.com`).
- Start command: `node backend/server.mjs` (Node 22, honours `process.env.PORT`).
- Health check endpoint: `/api/v1/health` (returns `{ ok: true, ... }`).
- API routes are under `/api/v1`; content is served at `/api/v1/content`.
- Required environment variable so the Amplify origin is allowed to call
  the API (comma-separated list — cookie-authenticated requests are
  refused from any other origin by `backend/server.mjs`):

  ```
  CORS_ORIGINS=https://<your-amplify-domain>.amplifyapp.com
  ```

  Include every production origin that must call the API (add the primary
  Amplify domain and any custom domains). Changing the value triggers a
  redeploy/restart of the Render service, which is required for it to
  take effect.
- Local development origins (`http://localhost:5173`,
  `http://127.0.0.1:5173`) are always allowed as defaults.

## Local development

- `npm run dev` (repo root) — runs the API on `127.0.0.1:8787` and Vite on
  `:5173`; the Vite dev proxy maps `/api` to `VITE_BACKEND_URL`
  (default `http://127.0.0.1:8787`).
- `frontend/.env` configures dev-time values only; it is gitignored.

## Database

- Supabase migrations in `supabase/migrations`.
- Apply via Supabase CLI: `supabase db push`.

## Environment

- Frontend: public `VITE_*` variables only (Supabase publishable key,
  Cloudinary cloud name, etc.). No service-role keys in the frontend.
- Backend secrets live in `backend/.env` / Render environment settings
  and are never shipped to browsers.

## Domain

- HTTPS required (Amplify and Render provide TLS).
- Domain: `littlekrishna.com`.
