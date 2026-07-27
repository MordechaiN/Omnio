# Ports

Omnio owns the range **7400–7449** and uses nothing outside it.

The reason is narrow and practical: a developer machine runs more than one
project. If Omnio takes port 3000, it takes it from every other Node app on the
laptop, and whoever loses the race has to edit config before they can work. That
is a permanent tax on everyone who ever runs two things at once, paid to save
five characters here.

So Omnio does not use the popular defaults. Not 3000, not 4000, not 5432, not
6379, not 8080. It uses its own range, and it uses it everywhere — dev, test,
container, documentation — so there is exactly one number per role.

| Role | Port | Where it applies |
|---|---|---|
| **web** | `7400` | `pnpm dev`, `next start`, inside the container, Playwright's `baseURL` |
| **api** | `7410` | `pnpm dev`, inside the container, `EXPOSE` |
| **worker health** | `7420` | `pnpm dev`, inside the container, `EXPOSE` |
| **postgres** | `7432` | host port in `docker/compose.dev.yaml` |
| **redis** | `7479` | host port in `docker/compose.dev.yaml` |

`7401–7409`, `7411–7419`, `7421–7431` and the rest of the range are reserved for
Omnio. A new service takes the next free number here rather than reaching for a
familiar default.

## Why these numbers

- **Unclaimed.** No common tool defaults to anything in 7400–7449, so Omnio does
  not collide with the next framework you install.
- **Outside the ephemeral range.** Linux hands out 32768–60999 for outbound
  connections. A "permanent" port in that window is not permanent; it is a port
  the kernel may already have given to something else. 7400 is below it.
- **Legible.** `74xx` reads as Omnio at a glance in `ss -ltn`, `docker ps`, or a
  half-remembered browser tab. Postgres and Redis keep their familiar last two
  digits (`7432`, `7479`) so the mapping is guessable rather than memorised.

## Container ports vs host ports

Postgres and Redis still listen on **5432** and **6379 inside their containers**.
Those are the images' own conventions, they are reachable only on the compose
network, and two containers on separate networks cannot collide. Only the
*published* host port needs to be unique, and that is what moves to 7432/7479.

Omnio's own three services (web, api, worker) use the 74xx number *inside* the
container too. They are our processes, so there is no external convention to
respect, and one number per role means a health check, a Dockerfile, a document
and a dev command can never quietly disagree.

## Deployment

`docker/compose.yaml` publishes `${WEB_PORT:-7400}` and `${API_PORT:-7410}`. A
deployment that needs different host ports sets those variables in its env file —
that is what environment files are for. The numbers *inside* the containers do
not change with the environment.

**A deployment on the same machine as a dev checkout must publish elsewhere.**
Otherwise the running deployment holds 7410 and `pnpm dev` cannot start its api —
Omnio colliding with itself, which is the same bug as colliding with anyone else.
The convention is the `+1` slots: `7401` for web, `7411` for api.

The live Oracle instance follows that (`API_PORT=7411`) with one exception worth
stating plainly: it publishes web on `4200`, because its Cloudflare Tunnel
ingress points there and that ingress is configured in the Cloudflare dashboard
rather than in any file on the machine. Moving it is a one-line dashboard change
followed by `WEB_PORT=7401` in `~/.env.d/omnio.env`. It is recorded here rather
than left as a surprise.

## Checking

`scripts/check-ports.sh` reports whether anything else on the machine already
holds an Omnio port, and exits non-zero if so — a specific message instead of
`EADDRINUSE` a minute into a build.
