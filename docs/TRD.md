# LittleKrishna Technical Requirements Document (TRD)

## Goals

1. Cinematic, scroll-driven brand experience on the public site.
2. Real content management with database-driven rendering.
3. Secure, entitlement-aware downloads.
4. Exclusive supporter token system.
5. Role-gated admin console.

## Decisions

### Frontend

- React 19 + Vite 8 + TypeScript.
- GSAP 3 with ScrollTrigger for cinematic reveals.
- Lenis for smooth scrolling.
- Lucide for icons.
- React Router 7 for routing.
- Vanilla CSS design system (no Tailwind).

### Data

- Supabase PostgreSQL with Row Level Security.
- UUID keys, FKs, indexes, check constraints, TIMESTAMPTZ.

### Media

- Cloudinary for optimized imagery.
- Optimized video hosting for cinematic hero/intro footage.
- Google Drive for authorized downloadable archives via backend-controlled delivery.

### Security

- Supabase Auth for accounts.
- Server-side role checks for admin.
- Download authorization server-side.
- SHA-256 token hashing and file checksum verification.
- Audit logs for sensitive operations.

## Tradeoffs

- Google Drive public links cannot enforce revocation; backend-controlled delivery
  (short-lived tokens / private storage) is used for protected content.
- Initial user scale is small; architecture targets horizontal growth.

## Open items

- Supabase project creation and credentials.
- Cloudinary / Google Drive account linking.
- Backend deployment region.
