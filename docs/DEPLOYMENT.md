# LittleKrishna Deployment

## Frontend

- Cloudflare Pages or equivalent static host.
- Build: `cd frontend && npm run build`.
- Deploy output: `frontend/dist`.

## Backend

- Supabase project with hosted Postgres, Auth, Edge Functions, Storage.
- API routes under `/api/v1`.

## Database

- Supabase migrations in `supabase/migrations`.
- Apply via Supabase CLI: `supabase db push`.

## Environment

- Set `VITE_*` variables for Supabase, Google Drive, Cloudinary, admin.
- Backend secrets stored in Supabase Edge Function secrets.

## Domain

- HTTPS required.
- Domain: `littlekrishna.com`.
