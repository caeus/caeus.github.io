# Troubleshooting

## My module doesn't show up in `wx list`

This is the failure mode you will hit most, and it is quiet by design-accident rather than by
design. `loadProject` runs the module's default export through `ModuleDef.safeParse` and, on
failure, **returns `null` and skips the module with no diagnostic**. `wx list` then simply
omits it, and `wx run` reports `Unknown target`.

Causes, roughly in order of likelihood:

- **A misspelled or unknown key in a `Step`.** Every step variant is `.strict()`, so
  `{ RUNN: '...' }`, `{ WORKIDR: '...' }`, or `{ COPY: { src, dst } }` (should be `dest`)
  fails validation. One bad step invalidates the entire module.
- **`run` is not a function.** `run: { FROM: ..., steps: [] }` — a common slip — fails the
  `z.custom<RunFn>` check.
- **A helper returned `undefined`.** If a factory in `stacks/` forgets a `return`, or a
  `writeJson(...)` call is left off a step list, the resulting `undefined` fails the union.
- **`deps` contains non-strings.** It must be `string[]`; an accidental nested array or object
  fails.
- **The default export is missing entirely** — e.g. `export const ci = {...}` instead of
  `export default { ci: {...} }`.

Note that `ModuleDef` is a `Record<string, Suite>` with no known keys, so the error is never
about suite names — those can be anything.

**How to find it:** bisect. Comment out targets until the module reappears in `wx list`, then
narrow to the step. If you want a real error message, temporarily change `loader.ts` to throw
instead of returning `null`:

```ts
if (!result.success) throw new Error(`${filePath}: ${result.error}`)
return deepFreeze(result.data)
```

Zod's error is precise about which key in which step failed.

## `Only wx:/ imports are allowed in build.wx, got: <specifier>`

You used a bare, relative, or absolute import. Every import in a `.wx` file must start with
`wx:/` and be root-relative — including imports between two `.wx` files in the same directory.
`import { x } from './sibling.wx'` must be `import { x } from 'wx:/stacks/sibling'`.

The message says `build.wx` because it predates the rename to `package.wx`. Same thing.

## `Unknown target: <fqt>`

Either the module failed to load (see above), or the FQT doesn't resolve to what you think.
Run `wx list` and compare — it prints deps fully expanded, which is usually enough to spot the
mismatch. Common cases:

- You omitted the module segment but were not standing in that module's directory.
- You are at the repo root, where no module is inferred at all — fully qualify the FQT, and
  remember the root module is named `.` (`wx run .#ci#deploy`).
- The suite is not `ci` (nothing forces it to be).

## `Suite required when only target is provided: <name>`

You passed a bare target name on the command line. Only the module is inferred from your
working directory; the suite never is.

```sh
wx run build       # ✗
wx run ci#build    # ✓
```

Inside a `deps` array, however, a bare name *does* work — there the current suite is known.

## `Circular dependency: a -> b -> a`

The path in the message is the actual cycle. Note this is raised at run time, not load time, so
`wx list` will not warn you about it.

## `ENOENT ... /repo/packages`

The loader reads `packages/` unconditionally. Create the directory, even if it is empty.

## `docker: 'buildx' is not a docker command`

The worxpace image installs `docker-cli-buildx`, so if you see this, the CLI in the container
is talking to a daemon that predates buildx, or the plugin failed to install. Upgrade Docker on
the host.

## `Cannot find module` / `SourceTextModule is not a constructor`

`--experimental-vm-modules` is missing. The `Dockerfile` ENTRYPOINT includes it; if you are
running `src/index.ts` directly for development, you need it too:

```sh
node --experimental-vm-modules --import tsx/esm src/index.ts list
```

## A `RUN` step that writes a file fails with "no such file or directory"

The target directory doesn't exist. Docker's `WORKDIR` creates directories; shell redirection
does not. Put `{ WORKDIR: '/repo' }` before any file-writing step. See
[03 — Ordering gotcha](03-authoring-package-wx.md#ordering-gotcha-workdir-creates-directories).

## A generated file's contents are mangled or the build fails on quoting

Don't interpolate content into a shell command. Base64-encode on the host and decode in the
container:

```js
{ RUN: `echo "${Buffer.from(content).toString('base64')}" | base64 -d > ${path}` }
```

Newlines, quotes, `$`, and backticks all break naive `printf`/`echo` approaches. This is what
`Buffer` is injected into the sandbox for.

## `EXPORT` produced nothing

Three possibilities, in order:

1. **You didn't invoke that target directly.** Only the target named on the command line
   materializes its `EXPORT`; transitive deps do not. Run the target itself.
2. **The image has no shell.** Extraction runs `sh -c 'mkdir -p ... && cp -r ...'` inside the
   image. `scratch` and distroless images cannot be exported from.
3. **The bind mount resolved to the wrong filesystem.** Extraction mounts a *host* path,
   because the daemon resolves `-v`. If `HOST_REPO_ROOT` is wrong — or the daemon is genuinely
   remote — the copy succeeds into a directory you cannot see, with no error. See
   [09 — Docker-in-Docker](09-docker-in-docker.md).

## Exported `node_modules` don't work on my machine

They were installed in a Linux container. Packages with platform-gated binaries (rollup,
esbuild, swc, sharp) resolved to Linux artifacts, so a macOS or Windows host fails with missing
optional-dependency errors. Use a local install for host-side tooling and treat the exported
tree as editor metadata only. See
[05](05-deps-and-exports.md#exported-node_modules-are-linux-binaries).

## Everything rebuilds every time

Something volatile is early in your step list. Check for:

- `COPY src` before the dependency install — invert it.
- A generated file whose contents are not stable across runs (a timestamp, a random value, or
  key ordering that isn't deterministic). Any change to a written file invalidates that layer
  and all later ones.
- A dep target that itself rebuilds, since a changed `FROM` invalidates everything downstream.

Read the streamed build output: Docker prints `CACHED` for reused layers, so the first
non-cached line is your culprit.

## Old images piling up

Tags are stable and unversioned, so each rebuild orphans the previous image.

```sh
docker image prune          # dangling layers
docker images | grep -E '^(packages_|ci-)'
```

worxpace never deletes images on its own.
