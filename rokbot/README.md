# ROK Bot / Peacee1

User web: https://rokbot.peacee1.io.vn/ — mandatory Peacee1 session.
Admin: https://rokbot.peacee1.io.vn/admin.html — ROKBOT_ADMIN_USER_IDS allowlist, configured for owner requested in chat.

User can add at most three password-based game accounts, edit allocations/level/hour interval, view governors and logs. Google and verification-code login are not supported. Credentials are AES-256-GCM encrypted with a server-only key. API never returns credentials to the browser. Operators pair machines using an opaque 256-bit token; only its SHA-256 hash is stored on server.

Clients heartbeat every 15 seconds, stop after a stale connection, and receive exclusive 90-second assignment leases. Server best-fit packs whole accounts up to 20 governors. Discovery tasks with unknown governor count can run first; after discovery server releases tasks that would exceed the machine capacity. Accounts over 20 governors are currently rejected for automatic farming rather than partially farmed.

Deploy selectively with rokbot/release.sh because existing production checkout contains unrelated uncommitted changes. Migrations 038/039 are exclusive to this module. Do not reset or git-pull over production changes.

Verification: node --test backend/test/rokFleet.test.js backend/test/rokApi.test.js backend/test/auth.test.js. Production verify-rokbot.js creates isolated temporary test users, performs persistence/ownership/CSRF/lease checks, then removes those test users. Run it only while actual agents are stopped, because allocation uses the shared production pool.

The first local client is paired and online. Password login and automatic character discovery/farming have not yet been verified end-to-end against a real game account. Local per-account farm progress is retained on that client; migrating between clients can require re-reading march state.
