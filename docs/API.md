# LittleKrishna API Reference

Base URL: `/api/v1`

## Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh`
- `POST /auth/forgot-password`

## Profile

- `GET /profile`
- `PATCH /profile`
- `GET /profile/downloads`
- `GET /profile/notifications`

## Content

- `GET /content`
- `GET /content/:slug`
- `GET /content/:id/versions`
- `GET /categories`
- `GET /collections`
- `GET /collections/:slug`

## Downloads

- `POST /downloads/authorize`
- `POST /downloads/start`
- `POST /downloads/complete`
- `POST /downloads/failure`
- `GET /downloads/history`

## Supporter

- `POST /supporter/redeem`
- `GET /supporter/status`
- `GET /supporter/content`

## Community

- `GET /community`
- `POST /community/submissions`
- `GET /community/submissions`

## Admin

- `GET /admin/dashboard`
- `GET /admin/users`
- `PATCH /admin/users/:id`
- `POST /admin/content`
- `PATCH /admin/content/:id`
- `DELETE /admin/content/:id`
- `POST /admin/tokens`
- `GET /admin/tokens`
- `POST /admin/tokens/:id/revoke`
- `GET /admin/downloads`
- `GET /admin/analytics`
- `GET /admin/audit-logs`
- `POST /admin/announcements`

Errors use a consistent envelope with machine-readable codes.

Full interactive documentation is served by the backend once deployed.
