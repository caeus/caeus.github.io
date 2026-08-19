# Getting started

## Prerequisites

- **Docker** with **buildx**. worxpace shells out to `docker buildx build --load`, so a plain
  legacy `docker build` is not enough.
- Access to the Docker socket at `/var/run/docker.sock`. worxpace itself runs in a container
  and drives your host daemon through that socket.

You do **not** need Node, pnpm, or TypeScript on the host. worxpace ships as a Docker image
that it builds from its own `Dockerfile` on first use.

## Install the launcher

```sh
worxpace/install.sh
```

That symlinks `worxpace/wx` into `~/.local/bin/wx`. Make sure that directory is on your
`PATH`:

```sh
export PATH="$HOME/.local/bin:$PATH"
```

## What the launcher does

`wx` is a three-line shell script with one job: find the monorepo. It records your current
directory, then walks up the tree looking for a directory named `worxpace`. When it finds
one it execs `worxpace/cli.sh`, passing your original directory through as `WORKING_DIR`.

That means a single global `wx` works across every monorepo that vendors worxpace — the
launcher resolves to whichever copy is above your cwd. If no ancestor contains a `worxpace/`
directory, it fails with:

```
error: not inside a monorepo (no worxpace/ directory found in any parent)
```

`cli.sh` then builds the worxpace image and runs it:

```sh
docker build -t worxpace "$REPO_ROOT/worxpace"
docker run --rm \
  -v "$REPO_ROOT:/repo" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e HOST_REPO_ROOT="$REPO_ROOT" \
  -e WORKING_DIR="${WORKING_DIR:-$REPO_ROOT}" \
  worxpace "$@"
```

The `docker build` runs on every invocation. After the first time it is fully layer-cached,
so it costs well under a second — but it does mean edits to `worxpace/src/` take effect on
the next `wx` call with no separate build step.

## First run

From anywhere inside the monorepo:

```sh
wx list
```

This loads every `package.wx` in the repo and prints the whole target graph in topological
order. It builds nothing, so it is the safe way to confirm your setup and to check that a
build file you just wrote actually parsed.

Then build something:

```sh
wx run packages/ui#ci#build
```

## Running from inside a package

`WORKING_DIR` lets worxpace infer the module you are standing in, so you can drop the module
segment of the target name:

```sh
cd packages/ui
wx run ci#build      # same as: wx run packages/ui#ci#build
```

The suite is never inferred — `wx run build` fails. See
[05 — Dependencies and `EXPORT`](05-deps-and-exports.md#reference-shorthands) for the full
resolution rules.

## Running worxpace's own checks

worxpace is a normal pnpm package, so its own tests and typecheck run outside Docker:

```sh
cd worxpace
pnpm install
pnpm typecheck
pnpm test
```
