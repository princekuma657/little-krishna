# LittleKrishna Backend

Secure API layer for LittleKrishna.com.

## Responsibilities

- Authentication sessions (Supabase).
- Content retrieval with visibility rules.
- Download authorization, delivery references, event logging.
- Supporter token redemption and entitlement issuance.
- Admin operations and audit logging.
- Rate limiting and input validation.

## API versioning

Base URL: `/api/v1`

All sensitive endpoints require bearer or session credentials and return
consistent error envelopes:

```json
{ "error": { "code": "unauthorized", "message": "Authentication required." } }
```

## Endpoint groups

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh`
- `POST /auth/forgot-password`
- `GET /profile`
- `PATCH /profile`
- `GET /profile/downloads`
- `GET /profile/notifications`
- `GET /content`
- `GET /content/:slug`
- `GET /content/:id/versions`
- `GET /categories`
- `GET /collections`
- `GET /collections/:slug`
- `POST /downloads/authorize`
- `POST /downloads/start`
- `POST /downloads/complete`
- `POST /downloads/failure`
- `GET /downloads/history`
- `POST /supporter/redeem`
- `GET /supporter/status`
- `GET /supporter/content`
- `GET /community`
- `POST /community/submissions`
- `GET /community/submissions`
- Admin group under `/admin/*` with server-side role validation.

## Delivery

Authorized downloads resolve to storage references managed server-side.
Google Drive public links are never exposed to clients for protected content.

## Security

- Server-side authorization only.
- Token hashing (SHA-256) at rest.
- Rate limiting on auth and download endpoints.
- Audit logging on sensitive actions.
- No service-role credentials in browser code.
