# LittleKrishna.com

Indian railway simulation content & community platform.

Inspired by the cinematic storytelling of landonorris.com, built with an original
LittleKrishna identity.

## Current state

- Public cinematic website (React + Vite + TypeScript + GSAP + Lenis + Lucide).
- Content detail, collections, catalog, gallery, community, releases, supporter pages.
- Authentication, profile, downloads, notifications, settings pages.
- Responsive admin console under `/admin`.
- Supabase schema migrations, backend API specification, security docs.

## Stack

- Frontend: React 19, Vite, TypeScript, GSAP + ScrollTrigger, Lenis, Lucide, React Router.
- Backend: Supabase Auth/PostgreSQL/Edge Functions + secure API layer (`/api/v1`).
- Media: Cloudinary, optimized video hosting, Google Drive for authorized archives.

## Getting started

```bash
cd frontend
npm install
npm run dev
```

Build:

```bash
cd frontend
npm run build
```

## Environment

Copy `.env.example` to `.env` and configure Supabase, Google Drive and Cloudinary.
The browser must never receive service-role keys.

## Documentation

- `docs/PRD.md`
- `docs/TRD.md`
- `docs/DATABASE.md`
- `docs/API.md`
- `docs/SECURITY.md`
- `docs/DEPLOYMENT.md`
