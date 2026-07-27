# Beta operations guide

The operational handbook for running Omnio during the private beta.

Two facts shape everything below, and neither is a detail:

**A user's files are not on the server.** They live in the browser's private
storage on the user's own machine. No backup we take protects them, and no
restore we perform brings them back. What the server holds is job records, an
audit log, and short-lived scratch. When a tester asks "is my work backed up?",
the honest answer is: only if you exported your workspace.

**The repository is not evidence of what is running.** Twice a deployed instance
was behind the code while every file said otherwise. Every verification here
asks the running instance.

---

## 1. Release checklist

`docs/private-beta-checklist.md` is the checklist. It is not repeated here.

```bash
scripts/preflight.sh                                       # 13 automated checks
pnpm turbo lint typecheck test build                       # 193 tasks
pnpm --filter @omnio/web exec playwright test --workers=1   # 97 e2e
```

All three green, then the manual half of that document, then deploy.

## 2. Deployment checklist

```bash
~/scripts/omnio-release        # build → tag → deploy → wait for health → verify
```

It computes release metadata from git, bakes it into the images, **tags them**
(§3 depends on this), recreates the stack, waits for `omnio_web` to report
healthy, and verifies the running version against the source.

Before running it: push first. It warns when local `HEAD` differs from origin,
because GitHub is the canonical source and an instance built from unpushed work
cannot be reproduced by anyone else.

After it finishes:

```bash
scripts/check-deployment.sh    # the instance's commit vs this checkout
COMPOSE_FILE=~/docker/omnio/compose.yml scripts/healthcheck.sh
```

## 3. Rollback

Every release tags its images `omnio-<svc>:<version>-build<n>`. Without that tag
there is nothing to roll back *to* — `:latest` is overwritten by every build.
This was true until 2026-07-27: the procedure existed, the images did not.

```bash
docker images | grep omnio-web              # find the build you want
docker tag omnio-web:0.15.0-alpha-build128 omnio-web:latest
docker tag omnio-api:0.15.0-alpha-build128 omnio-api:latest
docker tag omnio-worker:0.15.0-alpha-build128 omnio-worker:latest
docker compose -f ~/docker/omnio/compose.yml --env-file ~/.env.d/omnio.env \
  up -d --no-build
scripts/check-deployment.sh                 # will report "behind" — correct after a rollback
```

`--no-build` is the whole point: it starts the image you retagged instead of
rebuilding from source and undoing the rollback.

**Roll back the database only if the release changed the schema.** Prisma
migrations are forward-only; an older image against a newer schema may fail to
start. If it does, restore the dump taken before the release (§5).

**Verify a rollback candidate before you need it**, without touching production:

```bash
docker run --rm -d --name probe -p 127.0.0.1:7403:7400 omnio-web:<tag>
curl -sI http://127.0.0.1:7403/en | head -1
docker stop probe
```

## 4. Backup

```bash
~/scripts/backup-project omnio omnio_postgres omnio omnio
```

The four arguments matter: the defaults assume a `postgres` superuser and a
database named after the project, and Omnio uses `omnio` for both. Without them
the dump is skipped and the script still prints "Backup complete".

**What that command actually protects, verified by reading the output:**

| | Covered? |
|---|---|
| Postgres (jobs, sessions, audit log, file records) | **Yes** — `pg_dump`, 8 tables |
| `data/` directory archive | **No.** It contains empty directories only |
| A user's files | **No, and it never can** — they are on the user's device |

The data archive is written by `tar` running as `ubuntu`, and Postgres' files
are owned by uid 999. `tar` skips what it cannot read, exits 0, and the script
reports success. Do not rely on it. The SQL dump is the real backup, and for
Omnio it is sufficient: `data/redis` is a rebuildable queue and `data/storage`
is scratch with a TTL.

To archive the data directory anyway, read it with a container that can:

```bash
docker run --rm -v /home/ubuntu/docker/omnio/data:/d:ro -v ~/backups/omnio:/out \
  alpine tar czf /out/omnio_data_$(date +%Y%m%dT%H%M%SZ).tar.gz -C /d .
```

Before every release, take a dump. It is the only thing that makes §3's database
paragraph actionable.

## 5. Recovery

**Restore the database:**

```bash
zcat ~/backups/omnio/omnio_<timestamp>.sql.gz |
  docker exec -i omnio_postgres psql -U omnio -d omnio
```

**A container will not start.** `docker compose logs <service>` first. Config is
validated at boot and refuses startup by *naming the variable that is wrong* —
read the message before changing anything.

**Postgres data is gone.** Restore the dump into a fresh volume. Jobs in flight
are lost; user files are unaffected, because they were never there.

**A user's workspace is gone** (cleared browser data, wrong profile, new
machine). If they exported a workspace archive, they import it. If they did not,
it is gone, and no action of ours recovers it. Say so plainly and immediately —
this is the single most important thing to be honest about during the beta.

## 6. Version verification

```bash
curl -s http://127.0.0.1:4200/api/version | jq '{version, commit, buildNumber, channel}'
scripts/check-deployment.sh
```

Three things must agree: the version endpoint, `scripts/check-deployment.sh`, and
What's New. If they disagree, the deployment is stale — that is the failure mode
this beta has hit twice.

`channel` must never read `stable` before there is a stable release. A build made
without release metadata reports `0.0.0-source` and channel `alpha`.

## 7. Smoke test

Five minutes, after every deploy, against the running instance.

- [ ] Home loads; the drop zone invites you to start
- [ ] Drag in a PDF — it is recognised, tools are offered, a preview appears
- [ ] Run one on-device tool end to end; the download arrives
- [ ] The file appears in Files and survives a refresh
- [ ] Settings, About, What's New, Stats all render
- [ ] What's New leads with the version you just deployed
- [ ] A wrong address (`/en/no-such-page`) shows Omnio's not-found screen, not a bare 404
- [ ] Switch to Hebrew: layout mirrors, nothing clipped, no English left behind
- [ ] Browser console: no uncaught errors
- [ ] `scripts/healthcheck.sh`: six green

## 8. Manual QA checklist

The part no machine can judge is in `docs/private-beta-checklist.md` §3: install
from a clean clone, first launch, a real file of your own, Hebrew end to end,
keyboard only, storage refused, no server, a workspace with history.

Run it in full before the first invitation, and after any change to storage,
import/export, or the shell.

## 9. Known limitations

Tell testers these before they find them. None is a bug.

- **Files live in this browser, on this device.** Not synced, not backed up, not
  available in another browser. Clearing site data deletes them.
- **Office → PDF runs on the server**, not on the device. It is the one job that
  leaves the machine, and Omnio says so at the point of use.
- **Archiving is permanent.** The record and history remain; the contents do not.
- **Out-of-date exports are prepared, not run.** Omnio opens the right tool with
  everything loaded; the button is still yours to press.
- **Drafts group only when names say so plainly.** A wrong guess costs more trust
  than the grouping is worth.
- **Alpha.** The version says so, and the channel is not `stable`.

## 10. Support workflow

There is no support inbox, and no telemetry that would tell us something broke.
A problem reaches us only if a tester reports it.

1. Tester hits **About → Report a problem**. It opens a prefilled GitHub issue
   with system details in a collapsed block. **Nothing is sent automatically** —
   they see it and press submit themselves.
2. Triage within one working day (§11).
3. Reproduce before changing code. If it cannot be reproduced, ask for the
   template in §13 rather than guessing.
4. Fix, verify against the running instance, deploy, and tell the reporter which
   build contains the fix.

## 11. Bug triage

Every report gets, in order: **reproduce → severity → decide**.

- **Reproduce first.** A fix for a bug you have not seen is a guess.
- **Assign severity from §12**, by consequence to the user, never by how
  interesting the cause is.
- **S1 stops everything else.** S2 goes into the next deploy. S3 is scheduled.
  S4 is recorded and may be closed as intended behaviour with an explanation.
- **Data-loss reports are S1 until disproven**, including "I think I lost a
  file". Prove it did not happen before downgrading it.

## 12. Severity definitions

| | Meaning | Examples | Response |
|---|---|---|---|
| **S1** | Work is lost, corrupted, or leaves the device unexpectedly | A file silently not stored; an export producing wrong content; anything contradicting local-first | Stop other work. Fix, deploy, notify testers |
| **S2** | A core path is blocked with no workaround | Install fails; a tool cannot run; the workspace will not load | Next deploy |
| **S3** | Works, but wrong or confusing | Wrong label, missing translation, layout broken at a size | Scheduled |
| **S4** | Cosmetic or a preference | Spacing, wording, "I'd rather it did X" | Recorded |

Two rules that override the table: **anything that makes a user doubt their files
are safe is at least S2**, however small the cause. **Anything that sends data
off the device without asking is S1**, always.

## 13. Reproduction template

Ask for exactly this — no more, and never the file itself unless offered:

```
What I did:
What I expected:
What happened:
Browser + version:
Omnio version:            (About → Version)
Roughly how many files in your workspace:
Does it happen every time?
Console errors, if you can see them:
```

Never ask a tester to send the document. If the file matters, ask whether the
problem reproduces with a file they do not mind sharing.

## 14. Beta tester instructions

Send this, unedited:

> Omnio runs on your own machine and works on your files there. Nothing is
> uploaded, there is no account, and there is nothing to sign up for.
>
> **Your files stay in this browser, on this device.** They are not backed up
> anywhere. If you clear your browsing data they are gone. Please don't use it
> for the only copy of something that matters yet — it is an alpha.
>
> One job is the exception: turning Office documents into PDFs runs on the
> server. Omnio tells you at the moment it matters.
>
> If something goes wrong, use **About → Report a problem**. It opens a
> half-written bug report with your version and browser filled in. Read it,
> delete anything you would rather not share, and send it. Nothing leaves your
> machine until you press submit.
>
> The most useful thing you can tell us is where you hesitated — not only what
> broke.

## 15. Feedback collection

- **Everything is pull, never push.** Omnio has no server that receives reports,
  and adding one would break the promise the product is built on.
- **The tester is the transport.** They see the whole report and send it.
- **Hesitation is the signal.** "I wasn't sure what would happen" is worth more
  than a stack trace, and only a human can send it.
- **Close the loop.** Tell reporters which build carries their fix. A beta where
  reports vanish trains people to stop reporting.
