# TikTok Inbox Support Plan
10/27/2025
## Current State Audit

- **Ingress**: No TikTok webhook registered. `packages/dash/worker/src/routes/webhooks/index.ts` exposes only `/facebook` and `/instagram`.
- **Inbox APIs**: `inbox-get-conversations/messages/post-message` only handle Meta platforms. TikTok messages never reach `InboxService`.
- **Shared Types**: `packages/shared/src/inbox/index.ts` lacks TikTok Business Messaging payload coverage; schema changes are needed so DB typing accepts TikTok events.
- **Credentials**: `TIKTOK_APP_ID/SECRET` in env are for the Developer app (content posting). Business Messaging requires a Business Center app with its own credentials.

## Credential Strategy

1. Create/obtain TikTok for Business (Business Center) app approved for Business Messaging.
2. Store its credentials separately (e.g. `TIKTOK_BIZ_APP_ID`, `TIKTOK_BIZ_APP_SECRET`).
3. Keep the existing Developer app for content posting until a full migration is viable.

## Implementation Steps

1. **Shared Schema Updates**
   - Extend inbox payload unions to include TikTok Business Messaging events.
   - Add attachment types for TikTok (image/video/audio) and ensure DB types accept them.

2. **Webhook Handling**
   - Add `/webhooks/tiktok` route with signature verification using Business app secret (`Tiktok-Signature` HMAC SHA256).
   - Parse event payloads (DM/conversation) and normalize to `InboxService` structures.
   - Ignore non-messaging events (authorization, video publish) for now; log for observability.
   - Dispatch realtime events via `WorkspacePusher`.

3. **Inbox Service Enhancements**
   - Add helpers to resolve contacts/conversations by TikTok IDs (`business_id`, `conversation_id`).
   - Store conversation metadata (referrals, short links) if provided by webhook.
   - Ensure message upserts include attachment/media metadata.

4. **Reply Path**
   - Introduce TikTok branch in `inboxPostMessageRoute` to call `/business/message/send/`.
   - Handle media uploads (likely staged via `/business/message/media/upload/`) for future parity.
   - Enforce TikTok rate limits (10 messages / 48h window) and surface errors gracefully.

5. **OAuth for Messaging**
   - Add separate “Connect TikTok Messaging” flow using Business app OAuth + scopes (`business.im` etc.).
   - Store business messaging access/refresh tokens + `business_id` so webhook handler can look up accounts.
   - Update UI to differentiate posting vs messaging connections.

6. **Testing & Tooling**
   - Add local mock payloads + unit tests for verifier + parser functions.
   - Provide end-to-end checklist: webhook verification call, DM send echo, inbox UI update.

## Open Questions / Follow Ups

- Confirm Business Messaging access + compliance requirements.
- Decide where to persist Business messaging tokens (new table vs extend `connected_account`).
- Evaluate whether we eventually unify posting & messaging under the Business API.
