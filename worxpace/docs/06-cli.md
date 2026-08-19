# CLI reference

```
wx run <fqt>
wx list
```

Argument parsing uses [`@optique`](https://github.com/dahlia/optique), so `--help` is
available and unknown arguments produce a usage error rather than being ignored.

## `wx run <fqt>`

Builds the target and every transitive dependency, then materializes the target's own
`EXPORT` map if it has one.

```sh
wx run packages/ui#ci#build
wx run ci#build          # module inferred from cwd
```

The FQT may omit the module segment, which is then taken from your working directory. The
suite can never be omitted on the command line. See
[05 — Reference shorthands](05-deps-and-exports.md#reference-shorthands).

What happens, in order:

1. Every `package.wx` in the repo is loaded and validated.
2. The target is looked up. Unknown target → `Error: Unknown target: <fqt>`.
3. Dependencies are resolved recursively and built with `Promise.all`, so independent branches
   are launched together. Each FQT is built at most once per invocation.
4. The target's own image is built. Docker's full build output streams to your terminal
   (`stdio: 'inherit'`), so `RUN` step output, test failures, and compiler errors appear inline.
5. If the target declared `EXPORT`, a throwaway container copies each mapped path to the
   module's directory on the host.
6. A final line is printed:

```
Done: packages/ui#ci#build (packages_ui-ci-build)
```

Exit code is non-zero if any dependency's Docker build fails; the error propagates and no
further work is attempted.

## `wx list`

Loads the whole repo and prints every target with its resolved dependencies, in topological
order (dependencies before dependents). Builds nothing.

```
packages/base#ci#node-pnpm[]
packages/common#ci#install[packages/base#ci#node-pnpm]
packages/common#ci#build[packages/common#ci#install]
packages/common#ci#pack[packages/common#ci#build]
packages/ui#ci#install[packages/common#ci#pack, packages/base#ci#node-pnpm]
packages/ui#ci#build[packages/ui#ci#install]
.#ci#deploy[packages/ui#ci#build]
```

Format is `module#suite#target[dep, dep, ...]`. Dependencies are printed **fully expanded**,
so this is the way to confirm that a shorthand like `'install'` resolved to the module you
expected.

`wx list` is also the cheapest validity check on a build file you just edited. If a module is
missing from the output, its `package.wx` failed schema validation — see
[11 — Troubleshooting](11-troubleshooting.md#my-module-doesnt-show-up-in-wx-list).

## Environment variables

Set by `cli.sh` and the worxpace `Dockerfile`; you rarely touch them directly, but they explain
the behaviour.

| Variable | Set by | Meaning |
| --- | --- | --- |
| `REPO_ROOT` | `Dockerfile` (`/repo`) | Repo root **as seen inside the worxpace container**. Used for loading `package.wx` files and as the base for Docker build contexts. Falls back to worxpace's own parent directory when unset. |
| `HOST_REPO_ROOT` | `cli.sh` | Repo root **on the host**. Used for `EXPORT` bind mounts. Falls back to `REPO_ROOT`. |
| `WORKING_DIR` | `wx` launcher | The host directory you invoked `wx` from. Its path relative to `HOST_REPO_ROOT` becomes the current module for FQT completion. Defaults to the repo root — in which case the relative path is empty and **no** module is inferred. |

Why two roots exist is explained in [09 — Docker-in-Docker](09-docker-in-docker.md).

## Overriding the wiring

`main` takes an optional third argument — a factory producing the DI module:

```ts
export async function main(
  args: string[],
  env: NodeJS.ProcessEnv,
  moduleFactory: ModuleFactory = defaultModule
): Promise<void>
```

`src/index.ts` calls it with the default. Tests and alternative front-ends can pass their own
factory to swap in a fake Docker builder, a fixture module map, or a different loader without
touching the command layer. See [08 — Internals](08-internals.md#the-di-container).
