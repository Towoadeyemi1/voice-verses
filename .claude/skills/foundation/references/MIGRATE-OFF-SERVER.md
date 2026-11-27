# Moving Jobchuck off its own server

For the agent working on Jobchuck. Read this together with `FOUNDATION.md`
(the owner's rules for all software work); where they overlap, FOUNDATION wins.

## The goal in one paragraph

Jobchuck runs today on a Hetzner server, with Coolify and Traefik in front of
it. That one server holds:
- three app containers;
- a PostGIS 17 database;
- Redis 7.2;
- an object-storage bucket.

Someone has to patch, back up, monitor and upgrade all of it. The owner's other
product, Provilion, runs with **no server of its own**: managed Postgres,
serverless functions and static hosting, deployed by scripts, with a full
staging copy. That approach has run real businesses' calls, texts, billing and
data for months. Move Jobchuck onto it, without losing a row, a file or a
user, and without the live app going down. The owner decides the switch-over
and the shutdown of the old server.

## What the record says today

| What | Today |
|---|---|
| Server | Hetzner CPX22 at 91.98.146.205, about $23 a month |
| Runs | Coolify (its own containers, a PHP/Laravel app), Traefik v3 for TLS and routing |
| Jobchuck | 3 app containers, `postgis/postgis:17-3.5-alpine`, `redis:7.2` |
| Domains | jobchuck.com and jobchuck.co (certificates from Traefik) |
| Files | an object-storage bucket named `jobchuck` |
| Also on the box | n8n (`n8n.provilion.com`), which Provilion no longer uses. Check whether Jobchuck uses it before assuming anything. |

The record says nothing about the language or framework of the three app
containers, what Redis is used for, scheduled jobs, email or users. **Find
out first** (phase 0). Don't guess: an earlier check of this very server
concluded it was idle, because it looked in the wrong places, and it was
wrong.

## The target: the standard platform

| On the server today | On the standard platform | Notes |
|---|---|---|
| Coolify + Traefik (deploys, TLS, routing) | GitHub + deploy scripts; Cloudflare Pages (TLS automatic) | Deploy scripts refuse to run without `--env staging\|production` |
| Web front end container | React + Vite, static, on Cloudflare Pages | One Pages project per app (customer, worker, admin…) |
| API / backend container | Supabase: Postgres with RLS, the auto REST API for reads and writes, and Edge Functions (Deno/TypeScript) for privileged logic and integrations | Most CRUD endpoints disappear: RLS policies replace them |
| PostGIS 17 database | Supabase Postgres with the `postgis` extension enabled | Same SQL, same spatial functions; check the version Supabase offers |
| Redis | Each use replaced: logins by Supabase Auth; rate limits by counter rows in Postgres; queues by a jobs table worked by `pg_cron` (or `pgmq`); caching usually not needed | If a real need for Redis remains, a serverless Redis (e.g. Upstash), not a server |
| Workers and cron | `pg_cron` calling an Edge Function with a cron secret (constant-time check, fails closed) | One schedule per job, in a migration |
| Object storage bucket | Supabase Storage with policies, or Cloudflare R2 if it is S3-style and large | Signed URLs for private files |
| Email | Resend (or the provider Jobchuck uses now) | Never to made-up addresses; [Test] on staging |
| Logs / uptime | Supabase logs, Cloudflare analytics, a live sweep after each deploy | |

**When a server is still right:** a process that runs longer than an Edge
Function may (check Supabase's current limits), a persistent websocket server
you write yourself, heavy CPU work, or a binary that must run. Then run **only
that piece** in a small managed container (for example Fly.io or Google Cloud
Run), never the whole app. Write down why in the plan.

**Rough cost** (check current prices before quoting them):
- **Supabase:** Pro is about $25 a month for the organisation, which includes
  one project's compute; a second project (staging) adds its own compute,
  roughly $10 a month.
- **Cloudflare Pages:** free.
- **Compared with the server:** about $23 a month for Hetzner, plus the time
  spent patching, backing up and fixing it. The real saving is that time, plus
  staging, backups and security updates done for you.

## Phases (each has a gate; don't start the next until it passes)

### Phase 0: Discover (read only, change nothing)
Inventory, written to `docs/migration/inventory.md`:
- **Each container:** image, language and framework, start command,
  environment variable *names* (never values), ports, what it serves.
- **The database:**
  - schema dump (structure only);
  - row counts per table;
  - extensions in use;
  - size;
  - roles;
  - functions and triggers;
  - which tables hold users and password hashes, and the hash type.
- **Redis:** what keys exist, by prefix (`SCAN` with a pattern, counts only),
  and what code uses them (sessions, cache, queues, rate limits, pub/sub).
- **Scheduled jobs and workers:** cron entries, queue consumers, intervals.
- **Files:** the bucket's size, object count, public vs private, and how the
  app links to them.
- **Integrations:** email, SMS, payments, maps, webhooks *into* Jobchuck (they
  will need new URLs).
- **Domains and DNS:** where jobchuck.com and jobchuck.co are hosted, every
  record.
- **Does Jobchuck use n8n?** If it does, list the workflows.

*Gate:* the owner has read the inventory, and every row of the mapping table
above has a concrete answer for Jobchuck.

### Phase 1: The plan
`docs/migration/plan.md`:
- every endpoint, job and Redis use mapped to its new home;
- what (if anything) stays on a small container, and why;
- the data move;
- the user move;
- the cut-over and the rollback;
- the cost arithmetic.

*Gate:* the owner says yes.

### Phase 2: Staging copy
- **Projects:** create two Supabase projects (staging and production) and the
  Cloudflare Pages projects for each environment, then the deploy scripts that
  refuse to run without `--env`.
- **Schema:** numbered, append-only migrations. Enable PostGIS. **RLS on every
  table, with the full policy set** (FOUNDATION §7.2); the isolation matrix and
  offboarding checks from day one.
- **Logic:** Edge Functions for privileged logic. Each login-required function
  calls one gate first, and the public ones are listed in one file.
- **Front end:** pointed at staging, with build-time variables checked before
  the build.
- **Data:** a copy of production data loaded into staging (anonymised if it
  holds personal data the owner doesn't want copied; ask).

*Gate:*
- every page of every app opens against staging with nothing stubbed, no
  refused request and no console error;
- the isolation matrix shows no EXPOSED cell;
- the owner has tried it.

### Phase 3: Data, files and users
- **Database:** `pg_dump` (data, in dependency order) from the PostGIS
  container, restored into the new database. Compare row counts per table, and
  spot-check spatial queries (the same query on both, the same answer).
- **Files:** copy the bucket, then compare object count and total bytes. Links
  in the database are rewritten by a migration, dry-run in a transaction that
  rolls back.
- **Users:** Supabase Auth can import users with bcrypt password hashes
  (confirm for Jobchuck's hash type). If the hashes can't be imported, users
  get a "set your password" email on switch-over day. Decide which with the
  owner.

*Gate:* the counts match; a sample of real users can log in on staging (with
their permission) or test users created the same way can.

### Phase 4: Switch-over (on the owner's word only)
1. Announce a short write freeze; put the old app in read-only mode.
2. Do a final delta copy of data and files; compare the counts again.
3. Point the domains at Cloudflare Pages and the new backend (Cloudflare DNS);
   update every webhook that calls Jobchuck.
4. Run the live sweeps against production, plus one real end-to-end flow by a
   person.
5. **Rollback:** DNS back to the server, which is still running and untouched.
   The rollback is rehearsed on staging first.

*Gate:* everything works on the live domains, and the owner confirms.

### Phase 5: Retire the server (on the owner's word only)
- Keep the old server running, read-only, for at least two weeks.
- Then take a final backup of its database and bucket, kept somewhere the owner
  chooses.
- Only then, with the owner's explicit go, shut it down. **n8n.provilion.com
  lives on the same box**: ask the owner what happens to it first.

## Rules that apply throughout
- Staging first, production on the owner's word. Never delete or shut down
  anything without it.
- Never print secrets. Copy environment variable names, never values.
- Test the path: run the real app against the real staging system, not stubs.
  Prove each guard can fail.
- Every step is committed and pushed, with what was verified and what wasn't.
- Report in plain language: what was done, what's next, what needs the owner.
