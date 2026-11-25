# caeus.github.io

Personal site + monorepo. Deployed to GitHub Pages from `docs/`.

## Build system

[Dagr](https://github.com/caeus/dagr/tree/main/engine/docs) evaluates a graph of named
nodes defined in `dagr.index.js`. Each project exports a record keyed by semantic
paths, independent of the filesystem path. A node declares named dependencies and
returns a wrapped value or a wrapped Docker build. File-producing builds return
`{ image, path }`; host materialization is explicit through `EXPORT`.

The launcher and TypeScript recipe are pinned to immutable published image revisions.
Docker is the only prerequisite for builds.

```sh
./.dagr/cli.sh list
./.dagr/install.sh # optional: put dagr on PATH
dagr run //packages/ui:/ui/typecheck
dagr run //packages/ui:/ui/test
dagr run //packages/ui:/ui/build
dagr run //packages/common:/common/pack
dagr run //:/deploy
```

## Shared build logic

`stacks/dagr.typescript.js` composes ordinary namespaced feature records from the
TypeScript recipe using object spread. The mounted recipe is pinned in
`.dagr/volumes.yaml`; versions and other repository policy live in `lib/`.

For example a package dependency identifies the npm name separately from the node
producing its tarball:

```js
{ name: '@internal/common', target: '//packages/common:/common/pack', at: 'prod' }
```

Container builds copy local tarball artifacts and generate the configuration files
required by their own intent. Generated manifests, tsconfig and tool configs are
not checked-in source of truth.

## Local development

```sh
dagr run //:/dev/sync \
  //packages/common:/common/dev/hoist \
  //packages/app:/app/dev/hoist \
  //packages/ui:/ui/dev/hoist
pnpm install
cd packages/ui && pnpm exec vite
```

The root workspace contains all members. Per-package workspace files are only
used in isolated container builds. Host hoisting exports the generated configuration
and local dependency tarballs, not a Linux node_modules tree. Regenerate and install
after changing a local library.

## Packages

| Package | Composition | Description |
|---|---|---|
| `packages/base` | Docker base | Node + pnpm |
| `packages/common` | TypeScript library | Shared contracts and types |
| `packages/app` | Cloudflare Worker | Worker application |
| `packages/ui` | Vite React | Frontend deployed to `docs/` |

CI discovers test and typecheck nodes, verifies host configuration exports, and
builds the website before deployment. Pull requests do not deploy.
