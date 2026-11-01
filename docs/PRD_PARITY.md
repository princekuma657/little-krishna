# PRD Parity — Backend Additions

This document records the backend subsystems added to bring the local Node/SQLite
implementation and the Supabase schema to full parity with the Complete Backend
PRD + TRD.

## Local backend (backend/)

New tables in `backend/lib/db.mjs`:
- `user_devices` — device registration, listing, revocation (PRD §13).
- `storage_objects` — storage provider abstraction metadata (PRD §10, §11).
- `content_versions` — content version history (PRD §7).
- `content_images` — content gallery images (PRD §20).
- `permissions`, `role_permissions` — granular RBAC matrix (PRD §6).
- `security_events` — security event log (PRD §19).

New columns on `content`: `storage_object_id`, `content_version_id`.

New endpoints in `backend/server.mjs`:
- `GET /profile/devices`
- `POST /profile/devices`
- `POST /profile/devices/:id/revoke`
- `GET /content/:id/versions` (or `:slug`) — now reads from `content_versions`.
- `POST /admin/content/:id/versions`
- `GET /admin/storage-objects`
- `POST /admin/storage-objects`
- `GET /admin/security-events`
- `POST /analytics/security-event`

New helpers:
- `hasPermission(user, permissionKey)` — consults `role_permissions`.
- `logSecurityEvent(userId, eventType, severity, metadata)`.

Seed: permission keys, role→permission matrix, one content version per existing
content row, one storage_object per content row with a storage reference.

## Supabase

- `supabase/migrations/20261101000000_prd_parity.sql` — full parity schema,
  indexes, RLS policies and permission seed.
- `supabase/functions/api/index.ts` — Edge Function router scaffold.

## Tests

`tests/api.test.mjs` now includes 11 additional checks covering devices, content
versions, storage objects, security events and role enforcement. Total: 45 checks,
all passing.

## Honest gaps

- Google Drive and Cloudinary integrations remain documented only; they require
  real credentials and are not deployed here. The storage layer is abstracted so
  a private provider can replace the local/demo provider without changing the
  content model.
- Edge Functions are scaffolded, not fully implemented; the canonical
  implementation is the local Node backend. Port handlers from `backend/server.mjs`
  as needed.