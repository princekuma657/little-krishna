# LittleKrishna Security Notes

## Principles

- Never expose Supabase service-role keys, Google Drive credentials or private tokens in browser code.
- All sensitive decisions enforced server-side.
- Row Level Security enabled on all user-facing tables.

## Auth

- Supabase Auth for sessions, email verification, password reset, refresh.
- Profile fields cannot change privileged roles or account status.

## Downloads

- Frontend requests authorization from backend.
- Backend validates session, content visibility, entitlement.
- Backend records authorization event and completion/failure.
- Rate limiting applied.

## Supporter tokens

- Secure random generation.
- Store SHA-256 hash only.
- Expiry, max redemption count, account binding, revocation.

## Admin

- Explicit role checks server-side.
- Audit logs for content changes, tokens, suspensions, permission changes.

## Privacy

- Collect only necessary information.
- Document retention and purpose for analytics/IP logging.

## Delivery

- Protected files use backend-controlled delivery with short-lived authorization.
- Google Drive public links not used for protected content.

See `docs/SECURITY.md` for the full policy and `docs/DEPLOYMENT.md` for hosting.
