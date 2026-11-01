# LittleKrishna Database Design

## Tables

- `profiles`
- `roles`, `user_roles`
- `categories`
- `content`
- `content_versions`
- `content_images`
- `collections`, `collection_items`
- `downloads`
- `supporter_tokens`
- `supporter_entitlements`
- `notifications`
- `announcements`
- `community_submissions`
- `page_views`
- `audit_logs`
- `application_settings`

## Notes

- UUID primary keys, foreign keys, indexes and constraints.
- TIMESTAMPTZ defaults.
- Content access types: public, registered, supporter, restricted.
- Downloads record authorization and completion events.

See `supabase/migrations/20261031000000_initial_schema.sql` for the canonical DDL.
