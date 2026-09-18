# Periodic summaries and receipts

Read this reference when generating or distributing a weekly/monthly result summary.

The platform creates the immutable metric snapshot. Hermès owns the authorized schedule and delivery adapter. The provider owns only transport status. No platform delivery cron or direct provider connector is implied.

## Run contract

1. Verify CLI release manifest, live OpenAPI bytes/fingerprint, workspace and `reports` scope.
2. Require the relevant synchronization/reconciliation to be truthful and terminal. Under `skip_stale`, a skipped result is immutable and is not deliverable; use a new external run identity after freshness changes.
3. Request the summary from the verified OpenAPI example. Keep a stable external run ID and replay only an identical request with the same idempotency key.
4. Read the immutable snapshot. Deliver only the aggregate payload through the separately configured, authorized channel. Person-level details stay behind the authenticated deep link.
5. Record one receipt per actual transport attempt using a non-sensitive external delivery ID, status and timestamp. A later attempt is a new logical receipt and gets a new idempotency key.

Never place recipient addresses, tokens, raw messages or personal payloads in receipts. A ready summary does not authorize a channel, recipient or cron mutation.
