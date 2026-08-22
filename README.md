# caeus.github.io

Personal site + monorepo. Deployed to GitHub Pages from `docs/`.

## Build system

This repo uses **worxpace** — a Docker-based task runner defined via `package.wx` files. Every package declares facets of targets; targets have dependencies, a Dockerfile-like `run` definition, and an optional `EXPORT` map to materialize files back to the host. Full documentation lives in [`worxpace/docs/`](worxpace/docs/README.md).

### Install `wx`

```sh
./worxpace/install.sh
```

This symlinks `wx` to `~/.local/bin/wx`. Make sure `~/.local/bin` is on your `PATH`.

`wx` traverses parent directories looking for a `worxpace/` folder. When found, that directory is the monorepo root and `worxpace/cli.sh` is invoked from there.

### Commands

```sh
wx list                              # list all available targets
wx run <package>#<facet>#<target>    # run a specific target
```

Examples:

```sh
wx run packages/ui#ci#install      # install node_modules (exports to host)
wx run packages/ui#ci#typecheck    # type-check
wx run packages/ui#ci#build        # vite production build
wx run packages/common#ci#pack     # tarball the library for local consumers
wx run .#ci#deploy                 # build ui and deploy to docs/
```

### `package.wx` format

A `package.wx` default-exports facets of targets. See
[03 — Authoring `package.wx`](worxpace/docs/03-authoring-package-wx.md) for the full schema and
every step kind.

```js
export default {
  <facet>: {
    <target>: {
      deps: [
        '<target>',                     // same facet
        '<facet>#<target>',             // same package, different facet
        '<package>#<facet>#<target>',   // cross-package
      ],
      run: ({ images }) => ({
        FROM: images['<target>'],       // a dep's image tag, or a registry ref
        steps: [
          { WORKDIR: '/repo' },
          { COPY: { src: 'src', dest: '/repo/src' } },
          { RUN: 'pnpm install' },
        ],
        IGNORE: ['node_modules', '.git'],  // the target's .dockerignore
        EXPORT: { '/repo/dist': 'dist' },  // image path → path under the package dir
      }),
    },
  },
}
```

### Shared build logic

Rather than repeating targets per package, the facets come from factories in `stacks/`, with
primitives in `lib/`. Each package's `package.wx` is a few lines of declaration.

| Path | Contents |
|---|---|
| `lib/versions.wx` | Single source of truth for dependency versions |
| `lib/file_utils.wx` | `writeText`/`writeJson`/`writeYaml` — generate a file as a build step |
| `lib/dockerignore.wx` | `RECOMMENDED_IGNORE`, the default build-context exclusions |
| `stacks/ts-lib.wx` | `stack` for libraries — config, ci (install/build/pack/typecheck), dev |
| `stacks/ts-ui.wx` | `stack` for the Vite frontend |
| `stacks/ts-executable.wx` | `stack` for the Worker |
| `stacks/utils.wx` | `buildPackageJson`, `pnpmfile` helpers |

Each stack returns three facets: `config` generates the manifests, `ci` installs and builds
from them, and `dev` syncs them to your host for local work.

### Local development

The containerized `ci#install` produces a Linux `node_modules`, which can't run vite on macOS.
So local dev generates the manifests and lets your host do the install:

```sh
wx run .#dev#sync                  # root pnpm-workspace.yaml + package.json
wx run packages/ui#dev#sync        # per-package manifests
pnpm install                       # from the repo root — platform-correct binaries
cd packages/ui && pnpm exec vite
```

## Packages

| Package | Stack | Description |
|---|---|---|
| `packages/base` | — | Shared `node:22-alpine` + pnpm base image |
| `packages/common` | ts-lib | Shared contracts and types |
| `packages/app` | ts-executable | Cloudflare Worker |
| `packages/ui` | ts-ui | React/Vite frontend (deployed to `docs/`) |
| `packages/client` | — | oRPC client — not currently in the build graph (no `package.wx`) |
