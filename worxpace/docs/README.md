# worxpace

A monorepo task runner where **every target is a Docker image**.

There is no separate cache, no artifact store, and no lockfile of build outputs. A target
declares a base image and a list of Dockerfile-ish steps; worxpace renders that to a real
Dockerfile, builds it, and tags the result. A target that depends on another target receives
the dependency's **image tag** and uses it as its own `FROM` or as a `COPY --from=` source.
Docker's layer cache is the only cache, and the dependency graph is expressed as image
lineage.

Build files are `package.wx` — plain ES modules evaluated inside a `node:vm` sandbox, so they
can compute their contents with real JavaScript (loops, templates, shared helper modules)
without being able to touch the filesystem, the network, or the host process.

## Wiki

| Page | What's in it |
| --- | --- |
| [01 — Getting started](01-getting-started.md) | Install the `wx` launcher, prerequisites, first run |
| [02 — Concepts](02-concepts.md) | Packages, facets, targets, FQTs, images-as-artifacts |
| [03 — Authoring `package.wx`](03-authoring-package-wx.md) | The full schema and every `Step` kind |
| [04 — The sandbox and `wx:/` imports](04-sandbox-and-imports.md) | What your build files can and cannot do |
| [05 — Dependencies and `EXPORT`](05-deps-and-exports.md) | Dep shorthands, the `deps` map, getting files onto the host |
| [06 — CLI reference](06-cli.md) | `wx run`, `wx list`, environment variables |
| [07 — Conventions and layout](07-conventions-and-layout.md) | What worxpace hardwires; recommended repo shape |
| [08 — Internals](08-internals.md) | The pipeline end to end, tag derivation, DI container |
| [09 — Docker-in-Docker](09-docker-in-docker.md) | Why `REPO_ROOT` and `HOST_REPO_ROOT` both exist |
| [10 — Adopting in a new monorepo](10-adopting-in-a-new-monorepo.md) | Checklist for vendoring worxpace elsewhere |
| [11 — Troubleshooting](11-troubleshooting.md) | Silent package drops, export failures, common errors |

## Thirty-second tour

```js
// packages/greeter/package.wx
export default {
  ci: {
    build: {
      deps: [],
      run: () => ({
        FROM: 'node:22-alpine',
        steps: [
          { WORKDIR: '/repo' },
          { COPY: { src: 'src', dest: '/repo/src' } },
          { RUN: 'node src/index.js > /out/greeting.txt' },
        ],
        IGNORE: ['node_modules', '.git'],
        EXPORT: { '/out': 'dist' },
      }),
    },
  },
}
```

```sh
wx run packages/greeter#ci#build
```

That builds an image tagged `packages_greeter-ci-build` and copies the image's `/out`
directory to `packages/greeter/dist` on your host.
