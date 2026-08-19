# Dependencies and `EXPORT`

## Reference shorthands

A target reference is a `#`-separated string with one, two, or three segments. Missing
segments are filled from context (`FQT.parse` in `src/runner/index.ts`):

| Written | Segments | Resolves to |
| --- | --- | --- |
| `packages/ui#ci#build` | 3 | Exactly that. Always unambiguous. |
| `ci#build` | 2 | `<current package>#ci#build` |
| `build` | 1 | `<current package>#<current facet>#build` |

Inside a `deps` array, "context" is the package **and** facet of the target doing the
depending. So all three forms work in `deps`:

```js
export default {
  ci: {
    install: { deps: [], run: ... },
    build:   { deps: ['install'], run: ... },                      // same package, same facet
    docs:    { deps: ['release#bundle'], run: ... },               // same package, other facet
    deploy:  { deps: ['packages/ui#ci#build'], run: ... },         // another package
  },
}
```

On the **command line**, only the package is inferred, from `WORKING_DIR`. There is no current
facet, so a bare target name always fails:

```sh
cd packages/ui
wx run packages/ui#ci#build   # ✓
wx run ci#build               # ✓ package inferred from cwd
wx run build                  # ✗ Error: Facet required when only target is provided: build
```

**At the repo root, nothing is inferred.** `currentPackage` is computed as
`relative(hostRoot, WORKING_DIR)`, which is the empty string when the two are the same, and an
empty package means no context is passed at all. So from the repo root every FQT must be fully
qualified — including targets of the root package itself, whose package name is `.`:

```sh
cd <repo root>
wx run .#ci#deploy            # ✓
wx run ci#deploy              # ✗ Error: Package required when only facet#target is provided
```

## The `deps` map

`run` receives an object keyed by the dep strings **exactly as written in `deps`** — not by
their expanded FQTs. This trips people up constantly:

```js
{
  deps: ['install', 'packages/common#ci#pack'],
  run: (deps) => ({
    FROM: deps['install'],                            // ✓ the literal string from deps
    steps: [{ COPY: { from: deps['packages/common#ci#pack'], src: '/out/x.tgz', dest: '/x.tgz' } }],
  })
}
```

```js
deps['packages/ui#ci#install']   // ✗ undefined, even though that's what 'install' resolved to
```

The values are image tags (see [08 — Internals](08-internals.md#image-tag-derivation) for how
tags are derived). A dep you declare but never read is still built — declaring it is what
schedules it.

Two practical habits follow. If you build dep strings programmatically, keep the same
expression for both the `deps` entry and the lookup:

```js
const BASE = 'packages/base#ci#node-pnpm'

return {
  install: {
    deps: [BASE],
    run: (deps) => ({ FROM: deps[BASE], steps: [...] }),
  },
}
```

And if you generate a list of deps, generate the lookups the same way:

```js
const packTargets = localDeps.map(d => `packages/${d.local}#ci#pack`)
// ...
deps: [...packTargets, BASE],
run: (deps) => ({
  FROM: deps[BASE],
  steps: localDeps.map(d => ({
    COPY: { from: deps[`packages/${d.local}#ci#pack`], src: `/out/${d.local}.tgz`, dest: `/repo/${d.local}.tgz` },
  })),
}),
```

## Cycles

Cycles are detected while walking the graph and reported with the full path:

```
Circular dependency: pkg#ci#a -> pkg#ci#b -> pkg#ci#a
```

The check happens at run time, not load time, so `wx list` will happily print a cyclic graph
(with a truncated topological order). `wx run` is what catches it.

## `EXPORT`

`EXPORT` is how files get out of an image and onto your host filesystem. It is a
`Record<string, string>`, and the direction of each half is the thing to remember:

> **Keys are absolute paths inside the image. Values are paths relative to the package's
> directory on the host.**

```js
// in packages/ui/package.wx
EXPORT: {
  '/repo/dist': 'dist',              // image /repo/dist       → packages/ui/dist
  '/repo/node_modules': 'node_modules', // image /repo/node_modules → packages/ui/node_modules
}
```

A value of `'.'` means the package directory itself:

```js
// in the root package.wx (package '.')
EXPORT: { '/docs': 'docs' }          // image /docs → <repo root>/docs
```

Keys may be **directories or individual files**, and the two behave differently in one respect:
for a directory the *contents* are copied into `dest`, while a file is copied *to* `dest`.

```js
EXPORT: {
  '/repo/dist': 'dist',                  // contents of /repo/dist → <pkg>/dist/
  '/repo/package.json': 'package.json',  // the file            → <pkg>/package.json
}
```

Single-file exports are what make a "sync the generated config to my host" target practical —
generate manifests inside the image, then export exactly the ones the host should see, leaving
container-only files like `.pnpmfile.cjs` behind.

### Only the invoked target exports

This is the most important rule about `EXPORT` and it is deliberate.

When you run `wx run packages/ui#ci#build`, worxpace builds every transitive dependency, but
it only materializes the `EXPORT` map of `packages/ui#ci#build` itself. If
`packages/ui#ci#install` also declares an `EXPORT`, nothing is written for it.

So `EXPORT` on an intermediate target is not a side effect that fires whenever the target gets
built — it is a declaration of "here is what this target is worth extracting, *if* you ask for
it directly". To get `install`'s `node_modules` onto your host, run it directly:

```sh
wx run packages/ui#ci#install
```

Without this rule, building anything would spray files across your working tree.

### How extraction works, and what it requires

For each `src → dest` pair, worxpace runs a throwaway container with the package directory
bind-mounted, branching on whether the source is a directory:

```sh
docker run --rm -v <package dir>:/host-out <image> sh -c \
  'if [ -d "<src>" ]; then mkdir -p "<dest>" && cp -r "<src>"/. "<dest>"/; \
   else mkdir -p "$(dirname "<dest>")" && cp "<src>" "<dest>"; fi'
```

Implications:

- **The image needs a shell**, plus `mkdir`, `cp`, and `dirname`. You cannot `EXPORT` from a
  `scratch` or distroless image. Keep a `FROM alpine`-family layer as the export target.
- For directories `cp -r <src>/.` is used, so the *contents* of `src` land in `dest`, not `src`
  itself. `'/repo/dist': 'dist'` gives you `dist/index.js`, not `dist/dist/index.js`.
- For files, intermediate directories in `dest` are created as needed.
- Files are written by the container's user, typically root. Exported trees may be
  root-owned on Linux hosts.
- **A directory export replaces its destination.** The destination is removed before the copy,
  so files the build no longer produces disappear from the host. This is what keeps a
  hash-named bundle directory from accumulating every past build's output.
- The one exception is `dest: '.'`, which names the bind-mount root — the package directory
  itself. That is never removed, so exporting to `'.'` merges. Export into a named
  subdirectory when you want replace semantics.
- Since a directory export deletes first, `EXPORT`-ing `node_modules` will remove whatever the
  host had there, including a platform-correct install done by hand. That is a good reason not
  to export `node_modules` from a target you run casually.

### Exported `node_modules` are Linux binaries

`EXPORT`-ing `node_modules` gives you the tree that was installed inside a Linux container.
Any dependency with native or platform-gated binaries (esbuild, rollup, swc, sharp) will have
resolved to Linux artifacts. On a macOS or Windows host, tools run against that tree fail with
missing optional-dependency errors.

Exporting `node_modules` is useful for editor IntelliSense and for feeding a subsequent
container step. It is not a substitute for a local install when you want to run a dev server
on the host.
