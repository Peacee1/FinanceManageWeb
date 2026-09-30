# Capacity and cost plan: 10 million monthly active users

## Goal and current limits

The target is 10 million monthly active users (MAU), not simultaneous connections. The current deployment is one EC2 instance with approximately 1 GB RAM, Nginx, Node/PM2 and PostgreSQL on the same host. This release does not certify that host, or this codebase, for 10 million MAU.

MAU alone cannot determine capacity. For an illustrative planning model, 20% daily activity and 60 API calls per active user per day gives 120 million calls/day, about 1,389 requests/second on average. A 5x peak multiplier gives roughly 6,945 requests/second. These are assumptions to replace with telemetry, not observed traffic or a hosting commitment. Concurrent sockets, peak write rate, catalog sizes, business sizes, retention and background jobs must be measured separately.

## Implemented foundations

- Tenant membership is verified by the server; personal and business transactions remain separate.
- POS prices are computed on the server. Line items, payment method, tracked stock deductions, stock history and revenue commit together. Stable request UUIDs prevent duplicate sale and stock requests.
- Inventory locks one product at a time for manual movements; checkout locks products in increasing ID order. Historical stock corrections reject negative balances and update balances in one bulk query.
- Owner-only history uses a cursor and indexed ordering. Sổ quỹ uses 50-row cursor pages. The business dashboard requests a bounded recent history instead of downloading every transaction repeatedly.
- Business daily totals are maintained in the same PostgreSQL transaction as financial writes, including edits/deletions. Summary reads scan daily per-user totals instead of all order rows. Amounts remain integer/decimal in storage.
- Bounded API concurrency and bounded DB queues reject overload rather than building an unlimited backlog. Health remains available under load. Database statements and connections have timeouts.
- Operational metrics record request counts/duration by a bounded set of API groups, process memory, event loop delay and pool queue state. The internal endpoint requires a separate token. Logs exclude tokens, request bodies and financial values.
- Releases include database backups, migrations, functional/concurrency tests, versioned frontend files and health verification.

## Next infrastructure stages

| Stage | Trigger | Work |
|---|---|---|
| Measurement | Now | Collect latency/error/request/queue metrics; record a controlled read baseline. Create representative synthetic datasets and run write-heavy load tests on a separate staging database. |
| Reliability | Before public growth | HTTPS, restricted SSH, least-privilege API DB role, off-host encrypted backups and tested restores, secret management, disk/log/backup retention, and clear on-call alerts. |
| Split storage and compute | Sustained CPU/RAM/DB queue pressure or availability requirements | Put PostgreSQL on managed RDS with backups; serve static frontend through S3/CloudFront; move uploaded images to private S3 with authorized reads. Keep transactional writes and financial reads on primary. |
| Horizontal API scale | One API instance exceeds measured latency/throughput targets | Add an ALB and multiple API instances with autoscaling. Replace per-process rate limit storage with a shared store first. Size total DB connections across all replicas; use a pooler/proxy where measured needs justify it. |
| Expensive background work | AI/export/images compete with checkout | Move work to bounded workers and queues; apply user/business quotas, timeouts and retry policies. Notifications can be eventual; payment/stock commits cannot. |
| High data volume | Index/IO/storage measurements require it | Add aggregate indexes or read replicas for reports; consider date partitioning and tenant-aware sharding only after workload evidence. Avoid global hot aggregate rows. |

Keep this application as a modular service while business boundaries stabilize. Splitting into microservices immediately adds network, operational and transaction-consistency costs. Introduce infrastructure when measured bottlenecks require it.

## Validation and performance gates

Initial proposed staging goals: read API p95 ≤ 250 ms, checkout p95 ≤ 500 ms, unexpected error rate < 0.1%, and 30% resource headroom at the agreed peak. Confirm or revise these after representative tests. No overselling, no duplicate financial entries and no cross-tenant access are hard invariants at every load level.

Run backend unit/integration tests, then a staging workload covering the product mix, skew toward busy businesses, multiple cashiers, duplicate requests, retry storms, price changes, low stock and history corrections. Test backup restore and rolling-restart behavior too. Record dataset sizes and resource configuration with every result; a tiny production read test is not a capacity estimate.

For a safe current-host baseline, `RUN_READ_BENCHMARK=1 node scripts/benchmark-read.js` inside backend performs exactly 100 read-only loopback requests at concurrency 5 and reports latency/error statistics. It prints no user records or credentials. Do not run an unrestricted stress test on production.

## Known remaining work

- Personal dashboard/report code still downloads full personal history for compatibility. It needs aggregate report APIs and pagination before large per-user histories.
- Dashboard files contain duplicated/dead UI and browser storage coupling; extract features progressively, with regression tests.
- Authentication uses localStorage tokens; account recovery, real email/phone verification, session revocation and a considered cookie/CSRF design remain.
- Upload signature validation is not full image decoding; upload access, image processing and S3 migration remain.
- Rate limits are process-local; they must become shared before multiple replicas. Current uploads/backups are local to one host, so HA/disaster recovery is not achieved.
- Database provisioning still needs least-privilege runtime credentials separate from schema migration credentials. Existing infrastructure access secrets must be rotated through controlled operational steps.
- Daily total consistency needs periodic reconciliation with transactions. The current migration backfill takes a short write lock on the small existing DB; large future backfills require an online strategy.
- Browser visual verification was blocked by browser access policy; builds and API checks do not replace a full browser regression pass.

## References

[AWS data management guidance](https://docs.aws.amazon.com/wellarchitected/latest/performance-efficiency-pillar/data-management.html), [AWS caching guidance](https://aws.amazon.com/caching/best-practices/), [PostgreSQL multicolumn indexes](https://www.postgresql.org/docs/15/indexes-multicolumn.html), and [express-rate-limit memory store source](https://github.com/express-rate-limit/express-rate-limit/blob/main/source/memory-store.ts).
