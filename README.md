# caeus.github.io

Personal site + monorepo. Deployed to GitHub Pages from `docs/`.

## Build system

This repo uses **dagr**, a Docker-based task runner defined via `dagr.index.js` files. Every package declares facets of targets; targets have dependencies, a Dockerfile-like `run` definition, and an optional `EXPORT` map to materialize files back to the host. Full documentation lives in the [dagr repo](https://github.com/caeus/dagr/tree/main/engine/docs).

### Running `dagr`

dagr runs from a published image pinned in `.dagr/cli.sh`, so Docker is the only prerequisite:

```sh
./.dagr/cli.sh list
```

Upgrading dagr means bumping that image pin.

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
dagr run //packages/ui:dev:install     # install host-compatible node_modules
dagr run //packages/ui:ci:typecheck    # type-check
dagr run //packages/ui:ci:build        # vite production build
dagr run //packages/common:ci:pack     # tarball the library for local consumers
dagr run //:ci:deploy                  # build ui and deploy to docs/
```

### `dagr.index.js` format

A `dagr.index.js` default-exports facets of targets. See
[03 - Authoring `dagr.index.js`](https://github.com/caeus/dagr/blob/main/engine/docs/03-authoring-dagr-index-js.md)
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
        FROM: images['<target>'],
        steps: [
          { WORKDIR: '/repo' },
          { COPY: { src: 'src', dest: '/repo/src' } },
          { RUN: 'pnpm install' },
        ],
        IGNORE: ['node_modules', '.git'],
        EXPORT: { '/repo/dist': 'dist' },
      }),
    },
  },
}
```

### Shared build logic

The repository mounts the `typescript` component from `caeus/dagr-stacks` and pins its immutable
filesystem image in the root volume registry. Package `dagr.index.js` files contain package facts and
dependencies; the stack derives manifests, tool configuration, and targets.

| Path | Contents |
|---|---|
| `.dagr/config.js` | Maps mount requests to global volume IDs |
| `.dagr/volumes.yaml` | Pins implementations for the TypeScript and nested DI volumes |
| `lib/dagr.versions.yaml` | Repository dependency version policy |
| `lib/dagr.dockerignore.js` | Repository build-context exclusions |
| `stacks/ts/dagr.mount.yaml` | Requests the shared TypeScript stack volume |
| `stacks/dagr.typescript.js` | Repository policy plus library, Worker, and UI compositions |

The TypeScript stack is a calculation DAG. It derives target-specific manifests and tool
configuration from package facts, repository policy, and selected capabilities. Generated
`package.json`, TypeScript, Prettier, ESLint, Vite, and Vitest files are outputs rather than checked-in
project truth.

Stacks derive the package name from `import.meta.dagr.location`: `//packages/ui` becomes
`@internal/ui`, while nested paths are flattened, so `//packages/a/b` becomes `@internal/a-b`.
Dependencies use `{ pkg, at }` for logical packages and `{ npm, at }` for registry packages, for
example `{ pkg: '//packages/common', at: 'prod' }` and `{ npm: 'zod', at: 'prod' }`.

Each library's `ci:pack` output contains its own tarball and the complete transitive closure of local
package tarballs. Consumers copy that closure and rewrite local package dependencies to their tarballs
during installation.

### Local development

The stack can generate host-compatible dependencies directly:

```sh
dagr run //:dev:sync
dagr run //packages/ui:dev:sync
dagr run //packages/ui:dev:install
cd packages/ui && pnpm exec vite
```

## Packages

| Package | Stack | Description |
|---|---|---|
| `packages/base` | - | Shared `node:22-alpine` + pnpm base image |
| `packages/common` | TypeScript library | Shared contracts and types |
| `packages/app` | Cloudflare Worker | Worker application |
| `packages/ui` | Vite React | Frontend deployed to `docs/` |
| `packages/client` | - | oRPC client, not currently in the build graph (no `dagr.index.js`) |
