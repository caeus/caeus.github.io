# caeus.github.io

Personal site + monorepo. Deployed to GitHub Pages from `docs/`.

## Build system

This repo uses **dagr** — a Docker-based task runner defined via `dagr.index.js` files. Every package declares facets of targets; targets have dependencies, a Dockerfile-like `run` definition, and an optional `EXPORT` map to materialize files back to the host. Full documentation lives in the [dagr repo](https://github.com/caeus/dagr/tree/main/docs).

### Running `dagr`

dagr's source is not vendored here. `.dagr/Dockerfile` clones [caeus/dagr](https://github.com/caeus/dagr) at a pinned commit and compiles it inside the image, so Docker is the only prerequisite:

```sh
./.dagr/cli.sh list
```

Upgrading dagr means bumping that pinned SHA — it is part of the layer's cache key, so nothing else has to change.

Optionally put the launcher on your `PATH`, which lets you run `dagr` from any subdirectory and have the current package inferred:

```sh
./.dagr/install.sh
```

This symlinks `dagr` to `~/.local/bin/dagr`. Make sure `~/.local/bin` is on your `PATH`. The launcher traverses parent directories looking for a `.dagr/` folder; the directory containing it is the monorepo root, and `.dagr/cli.sh` is invoked from there.

### Commands

```sh
dagr list                              # list all available targets
dagr run //<package>:<facet>:<target>  # run a specific target
```

Examples:

```sh
dagr run //packages/ui:ci:install      # install node_modules (exports to host)
dagr run //packages/ui:ci:typecheck    # type-check
dagr run //packages/ui:ci:build        # vite production build
dagr run //packages/common:ci:pack     # tarball the library for local consumers
dagr run //:ci:deploy                 # build ui and deploy to docs/
```

### `dagr.index.js` format

A `dagr.index.js` default-exports facets of targets. See
[03 — Authoring `dagr.index.js`](https://github.com/caeus/dagr/blob/main/docs/03-authoring-dagr-index-js.md)
for the full schema and every step kind.

```js
export default {
  <facet>: {
    <target>: {
      deps: [
        '<target>',                     // same facet
        '<facet>:<target>',             // same package, different facet
        '<package>:<facet>:<target>',   // cross-package
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
primitives in `lib/`. Each package's `dagr.index.js` is a few lines of declaration.

| Path | Contents |
|---|---|
| `lib/dagr.versions.yaml` | Single source of truth for dependency versions |
| `lib/dagr.file_utils.js` | `writeText`/`writeJson`/`writeYaml` — generate a file as a build step |
| `lib/dagr.dockerignore.js` | `RECOMMENDED_IGNORE`, the default build-context exclusions |
| `stacks/dagr.ts-lib.js` | `stack` for libraries — config, ci (install/build/pack/typecheck), dev |
| `stacks/dagr.ts-ui.js` | `stack` for the Vite frontend |
| `stacks/dagr.ts-executable.js` | `stack` for the Worker |
| `stacks/dagr.utils.js` | `buildPackageJson`, `pnpmfile` helpers |

Each stack returns three facets: `config` generates the manifests, `ci` installs and builds
from them, and `dev` syncs them to your host for local work. Stacks derive the package name from
`import.meta.dagr.location`: `//packages/ui` becomes `@internal/ui`, while nested paths are
flattened, so `//packages/a/b` becomes `@internal/a-b`. Dependencies use `{ pkg, at }` for
logical packages and `{ npm, at }` for registry packages, for example
`{ pkg: '//packages/common', at: 'prod' }` and `{ npm: 'zod', at: 'prod' }`.
Each library's `ci:pack` output contains its own tarball and the complete transitive closure of local
package tarballs. Consumers copy that closure and rewrite every `@internal/*` dependency to its
local tarball during installation.

### Local development

The containerized `ci:install` produces a Linux `node_modules`, which can't run vite on macOS.
So local dev generates the manifests and lets your host do the install:

```sh
dagr run //:dev:sync                  # root pnpm-workspace.yaml + package.json
dagr run //packages/ui:dev:sync        # per-package manifests
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
| `packages/client` | — | oRPC client — not currently in the build graph (no `dagr.index.js`) |
