# Authoring `package.wx`

A `package.wx` file is an ES module whose **default export** describes one module's suites and
targets.

## The shape

```js
export default {
  <suiteName>: {
    <targetName>: {
      deps: [ /* target references, strings */ ],
      run: (deps) => ({
        FROM: '<image ref>',
        steps: [ /* Step objects */ ],
        EXPORT: { '<abs path in image>': '<path relative to module dir>' },  // optional
      }),
    },
  },
}
```

Formally (this is the Zod schema in `src/project/schema.ts`):

```
ModuleDef = Record<string, Suite>
Suite     = Record<string, Target>
Target    = { deps: string[] (default []), run: (deps) => Run }
Run       = { FROM: string, steps: Step[], EXPORT?: Record<string, string> }
```

Notes on validation:

- `deps` defaults to `[]`, so you may omit it. Being explicit is still clearer.
- `run` must be a function. It is *not* called during loading — only when the target is
  actually built.
- `steps` is required. Use `steps: []` for a target that only re-tags or re-exports its base.
- Every `Step` object is `.strict()`: an unknown or misspelled key makes validation fail.
  **A module that fails validation is silently skipped** — see
  [11 — Troubleshooting](11-troubleshooting.md#my-module-doesnt-show-up-in-wx-list).

## `run(deps)`

`run` is called once, at build time, with a `Record<string, string>` mapping each entry of
`deps` to that dependency's built **image tag**. The keys are the dep strings **exactly as you
wrote them** — see [05 — Dependencies and `EXPORT`](05-deps-and-exports.md#the-deps-map).

`run` must be pure. It is called inside the sandbox and has no access to the filesystem.

## Step reference

Each step is a single-key object. The table shows the rendered Dockerfile line
(`src/runner/dockerfile-renderer.ts`).

| Step | Renders to |
| --- | --- |
| `{ RUN: 'cmd' }` | `RUN cmd` |
| `{ WORKDIR: '/repo' }` | `WORKDIR /repo` |
| `{ ARG: 'NAME' }` | `ARG NAME` |
| `{ ENV: { A: '1', B: '2' } }` | `ENV A=1` and `ENV B=2` (one line per key) |
| `{ COPY: { src, dest } }` | `COPY src dest` |
| `{ COPY: { from, src, dest } }` | `COPY --from=from src dest` |
| `{ ENTRYPOINT: ['node', 'x.js'] }` | `ENTRYPOINT ["node","x.js"]` (JSON form) |
| `{ CMD: ['sh'] }` | `CMD ["sh"]` (JSON form) |

`FROM` is not a step — it is the `FROM` field of the returned object, and it is always
emitted first.

`ENTRYPOINT` and `CMD` always render in exec (JSON) form, so they take an array of strings,
never a shell string.

### `COPY` and the build context

`src` in a `COPY` without `from` is resolved against the **build context**, which is the
module's own directory. For `packages/ui`, `{ COPY: { src: 'src', dest: '/repo/src' } }`
copies `packages/ui/src`. You cannot `COPY` a path outside your module — that is Docker's
rule, not worxpace's.

A baked-in `.dockerignore` excludes `node_modules` and `.git` from every context.

With `from`, `src` is an absolute path inside the referenced image and the context is not
involved:

```js
{ COPY: { from: deps['packages/common#ci#pack'], src: '/out/pkg.tgz', dest: '/repo/pkg.tgz' } }
```

## Ordering gotcha: `WORKDIR` creates directories

Steps that write files need their target directory to exist. Docker's `WORKDIR` creates it;
a bare `RUN ... > /repo/file` does not. So put `WORKDIR` before any file-writing step:

```js
steps: [
  { WORKDIR: '/repo' },              // creates /repo
  writeJson('/repo/package.json', pkg),
  { RUN: 'pnpm install' },
]
```

## Generating file contents

A common need is writing a config file whose contents are computed in JavaScript. Because a
step is just a `RUN`, a helper can return one:

```js
// lib/file_utils.wx
export function writeText(path, content) {
  return { RUN: `echo "${Buffer.from(content).toString('base64')}" | base64 -d > ${path}` }
}

export function writeJson(path, value) {
  return writeText(path, JSON.stringify(value, null, 2))
}
```

Base64 is not decoration. A naive `printf '%s' '<content>'` breaks the moment the content
contains a newline, a quote, or a `$`. Base64-encoding on the host and decoding in the
container sidesteps shell quoting entirely. `Buffer` is injected into the sandbox specifically
so this pattern works.

The tradeoff: any change to the file's contents invalidates that layer and everything after
it. That is correct behaviour, and it is why config writes belong early in the step list,
before the expensive install.

## A worked example

```js
import { PNPM_VERSION } from 'wx:/lib/versions'
import { writeJson, writeText } from 'wx:/lib/file_utils'

const TSCONFIG = {
  extends: '@tsconfig/strictest/tsconfig.json',
  include: ['src/**/*'],
  compilerOptions: { noEmit: true, module: 'ESNext', moduleResolution: 'Bundler' },
}

const PACKAGE_JSON = {
  name: '@scope/thing',
  type: 'module',
  devDependencies: { typescript: '6.0.3', '@tsconfig/strictest': '2.0.8' },
}

export default {
  ci: {
    install: {
      deps: [],
      run: (_deps) => ({
        FROM: 'node:22-alpine',
        steps: [
          { RUN: `corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate` },
          { WORKDIR: '/repo' },
          writeJson('/repo/package.json', PACKAGE_JSON),
          writeJson('/repo/tsconfig.json', TSCONFIG),
          { RUN: 'pnpm install --prod=false' },
        ],
      }),
    },
    typecheck: {
      deps: ['install'],
      run: (deps) => ({
        FROM: deps['install'],
        steps: [
          { COPY: { src: 'src', dest: '/repo/src' } },
          { WORKDIR: '/repo' },
          { RUN: 'pnpm exec tsc --noEmit' },
        ],
      }),
    },
  },
}
```

Note the split: `install` writes config and installs dependencies but never touches `src/`,
so editing a source file leaves the `install` image fully cached and only `typecheck` rebuilds.
Getting this boundary right is most of what makes a worxpace repo feel fast.
