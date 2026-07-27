# Release checklist

Run before inviting anyone who cannot ask us a question.

The assumption behind every line: **someone installs Omnio without ever speaking
to us, and has to succeed anyway.** A step that only works because we know
something is a step that fails for them.

Every automated check below exists because the thing it checks was broken and
nothing caught it. That is the rule for adding one: not "this seems worth
checking", but "this reached a user, or would have".

---

## 1. Automated — `scripts/preflight.sh`

```bash
scripts/preflight.sh
```

| Check | Why it is here |
|---|---|
| both compose files parse | `docker/compose.yaml` did not parse **for months**. A `: ` inside an unquoted YAML scalar. Every reader of the README hit it in their first minute; no test looked at the file. |
| missing session secret is refused by name | It must fail at `compose up`, with the command to fix it — not five minutes later as a crash-looping container. |
| a source build is allowed | The build refused any image without release metadata, so a stranger with a clone could not build at all. Our deploy path passed the metadata, so we never saw it. |
| incomplete release metadata is refused | The half-configured case is the dangerous one: an image that claims a release it isn't. |
| `release.json` matches `package.json` | A missed regeneration is invisible until someone opens About and reads a version nobody shipped. |
| release notes exist in both languages | A shipped version with no notes, or notes in one language, is a blank What's New for half the users. |
| `en`/`he` key parity | A missing key renders a raw identifier. Testers screenshot those. |
| `not-found.tsx` / `error.tsx` exist | Without them a wrong address is the framework's bare 404 — no navigation, no branding, always English. |
| no port conflicts | Omnio must never take a port from something else on the machine (`docs/ports.md`). |
| `pnpm audit --prod` | Today's clean result is a point in time; the value is noticing the next one. |

## 2. Automated — the full gate

```bash
pnpm turbo lint typecheck test build     # 193 tasks
pnpm --filter @omnio/web exec playwright test --workers=1   # 97 e2e
```

Both must be green with no skipped tests and no `.only`.

## 3. Manual — what a machine cannot judge

A machine can tell you a page rendered. It cannot tell you the page made sense.
Do these on a **clean browser profile**, at least once per release.

**Install from scratch.** Clone into an empty directory and run the README
commands exactly as written — no shortcuts, no existing `.env`, no warm Docker
cache if you can help it. Open the URL the README gives. Any deviation you have
to make is a documentation bug, not a you problem.

**First launch.** You have never seen this. Is it obvious what to do first?
Read the first screen out loud — anything needing interpretation is too
complicated.

**Drop a file.** A real one from your own machine, not a fixture. Does what
Omnio says about it match what you know about it? Does it offer something you
would actually have done next?

**Hebrew, end to end.** Switch language and repeat the walk. Mirrored layout,
no clipped text, no English left behind, nothing scrolling sideways.

**Keyboard only.** Unplug the mouse. Reach every action, see focus at all times,
escape every dialog. Then run it with a screen reader for the first five
minutes.

**Storage refused.** Block IndexedDB (private mode / site settings) and open
Omnio. It must explain, not crash or lie about having saved something.

**No server.** Stop the api container. Omnio must keep working for everything
that runs on-device, and say plainly what is unavailable.

**A workspace with history.** Not an empty one — one with a few hundred files
and some finished work. Does it feel calmer than an empty workspace, or more
cluttered? If it is worse, that is the bug, however well each screen works.

**Read What's New as a user.** Does it describe things you can find? No
libraries, no refactors, no architecture — only what changed for the person
reading it.

## 4. Release

```bash
set -a && eval "$(node tooling/release/build-metadata.mjs)" && set +a
node tooling/release/gen-manifest.mjs
docker compose -f docker/compose.yaml --env-file .env up -d --build
```

Then, **against the running instance, not the files**:

```bash
scripts/check-deployment.sh          # or: scripts/check-deployment.sh https://your-host
```

It compares the running instance's commit to this checkout and names every
commit that is reaching nobody. Follow it by hand with:

- What's New leads with the version you just built
- the channel is not `stable` unless it genuinely is

A deployed instance once served a 34-hour-old image while every file in the
repository said otherwise, and later kept serving a dead-end 404 for a day after
the fix was merged. Both were found by accident. Files are not evidence; the
running application is — which is why this is a script and not a good intention.

## 5. Sign-off

One question, answered honestly:

> Would I hand this to my own family and colleagues, and not offer to help them?

If the answer needs a qualification, the qualification is the next task.
