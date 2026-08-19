# Conventions and layout

Some things worxpace hardwires. Others are conventions that happen to work well. Knowing
which is which saves time.

## Hardwired (you cannot change without editing worxpace)

- **The build file is named `package.wx`.** `PACKAGE_FILE` in `src/pkg/loader.ts`.
- **Only two places are scanned**: the repository root, and everything under `packages/`.
  A package at `apps/web/package.wx` is invisible.
- **`packages/` must exist.** The loader unconditionally reads it; a repo without that
  directory fails with `ENOENT`.
- **The root `package.wx` gets the package name `.`** — so its FQTs look like `.#ci#deploy`.
- **Discovery stops at the first `package.wx`.** The walker descends `packages/` recursively,
  but as soon as a directory contains a `package.wx` it records that package and does **not**
  look inside it. Nested packages (`packages/group/sub/package.wx` where
  `packages/group/package.wx` also exists) are unreachable. To group packages, leave the
  intermediate directory without a build file — `packages/group/a/package.wx` and
  `packages/group/b/package.wx` both work and are named by their full relative path.
- **`node_modules` and `.git` are excluded from every build context**, via a baked
  `.dockerignore`. There is no way to add entries per target.
- **The build context is the package's own directory** — always, with no option to widen or
  narrow it.

## Conventions (yours to change)

- **Facet named `ci`.** worxpace attaches no meaning to it. Nothing breaks if you use
  `build`, `release`, or `default`.
- **Target names `install` / `build` / `pack` / `typecheck`.** Also arbitrary. The chain
  `install → build → pack` is a useful shape, not a requirement.
- **A `base` package holding shared base images.** See below.
- **`lib/` and `stacks/` for shared `.wx` helpers.** See below.

## Recommended repo shape

```
<repo root>/
├── package.wx              # root package '.', for repo-wide targets (deploy, docs)
├── worxpace/               # vendored worxpace; the wx launcher finds the repo by this
│   ├── cli.sh
│   ├── wx
│   ├── install.sh
│   ├── Dockerfile
│   ├── src/
│   └── docs/
├── lib/                    # low-level .wx helpers (file writing, version pins)
│   ├── versions.wx
│   └── file_utils.wx
├── stacks/                 # .wx facet factories, one per project archetype
│   ├── ts-lib.wx
│   ├── ts-ui.wx
│   └── ts-executable.wx
└── packages/
    ├── base/package.wx     # shared base images
    ├── common/package.wx
    └── ui/package.wx
```

## The `lib/`+`stacks/` pattern

Writing out `install`/`build`/`typecheck` by hand in every package gets old fast, and it lets
packages drift. The fix is to put the logic in a shared `.wx` module that returns a whole
facet.

**`lib/`** holds primitives — no knowledge of your project archetypes:

```js
// lib/versions.wx — one place to bump a version
export const PNPM_VERSION = '11.20.0'

export default {
  typescript: '6.0.3',
  react: '19.2.8',
  zod: '4.4.3',
}
```

```js
// lib/file_utils.wx — turn computed content into a step
export function writeText(path, content) {
  return { RUN: `echo "${Buffer.from(content).toString('base64')}" | base64 -d > ${path}` }
}
export function writeJson(path, value) {
  return writeText(path, JSON.stringify(value, null, 2))
}
```

**`stacks/`** holds one factory per archetype. Each exports a function returning a facet:

```js
// stacks/ts-lib.wx
import versions from 'wx:/lib/versions'
import { writeJson } from 'wx:/lib/file_utils'

const BASE = 'packages/base#ci#node-pnpm'

export function ciFacet({ name, scope, deps = [] }) {
  const localDeps = deps.filter(d => 'local' in d)
  const packTargets = localDeps.map(d => `packages/${d.local}#ci#pack`)

  return {
    install: {
      deps: [...packTargets, BASE],
      run: (d) => ({ FROM: d[BASE], steps: [ /* ... */ ] }),
    },
    build:     { deps: ['install'], run: (d) => ({ FROM: d['install'], steps: [ /* ... */ ] }) },
    pack:      { deps: ['build'],   run: (d) => ({ FROM: d['build'],   steps: [ /* ... */ ] }) },
    typecheck: { deps: ['install'], run: (d) => ({ FROM: d['install'], steps: [ /* ... */ ] }) },
  }
}
```

Each package then declares only what makes it different:

```js
// packages/common/package.wx
import { ciFacet } from 'wx:/stacks/ts-lib'

export default {
  ci: ciFacet({
    name: 'common',
    scope: 'myorg',
    deps: [{ remote: 'zod' }, { remote: '@orpc/contract' }],
  }),
}
```

A useful convention inside these factories is tagging deps by kind — `{ remote: 'zod' }` for a
registry package versus `{ local: 'common' }` for a sibling package — so the factory can turn
locals into `pack` target deps and remotes into `package.json` entries. That distinction is
yours to define; worxpace only ever sees the resulting `deps` strings.

## The base-image package

Every target starts from *some* image, and repeating the same `corepack enable && corepack
prepare pnpm@...` in ten targets means ten copies of that layer. Instead, make it a target:

```js
// packages/base/package.wx
import { PNPM_VERSION } from 'wx:/lib/versions'

export default {
  ci: {
    'node-pnpm': {
      deps: [],
      run: (_deps) => ({
        FROM: 'node:22-alpine',
        steps: [{ RUN: `corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate` }],
      }),
    },
  },
}
```

Then every install target uses `FROM: deps['packages/base#ci#node-pnpm']`. One image, built
once, shared by the whole repo — and bumping the pnpm version invalidates exactly one layer.

## Depending on the local package manager inside a container

The hardest part of containerizing a monorepo build is workspace dependencies:
`"@myorg/common": "workspace:*"` means nothing inside a container that only has one package.

The pattern that works with worxpace's image-as-artifact model:

1. Give each library a `pack` target that ends with `pnpm pack --pack-destination /out`,
   producing a tarball in the image.
2. In the consumer's `install` target, declare a dep on that `pack` target and
   `COPY --from=` the tarball in.
3. Rewrite `workspace:*` to `file:./<name>.tgz` before installing. A generated
   `.pnpmfile.cjs` with a `readPackage` hook does this without touching the `package.json` you
   generate.

The result is a genuine install from a real tarball, so the consumer's image proves the
library's published artifact actually works.
