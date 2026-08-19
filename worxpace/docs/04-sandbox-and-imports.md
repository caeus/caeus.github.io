# The sandbox and `wx:/` imports

`package.wx` and every `.wx` file it imports are evaluated with `vm.SourceTextModule` in a
single fresh V8 context created once per load session. This is why the worxpace image's
entrypoint passes `--experimental-vm-modules` to Node.

## What is available

The context is created as:

```ts
vm.createContext(Object.assign(Object.create(null), { Buffer }))
```

**Available:**

- All ECMAScript intrinsics — `Object`, `Array`, `JSON`, `Math`, `String`, `Map`, `Set`,
  `Promise`, `Date`, template literals, spread, destructuring, classes, everything the
  language gives you. A fresh V8 context has its own copy of the standard library.
- `Buffer`, explicitly injected. It exists so build files can base64-encode generated file
  contents (see
  [03 — Authoring `package.wx`](03-authoring-package-wx.md#generating-file-contents)).
- ES module syntax: `import`, `export`, `export default`, named and default both directions.

**Not available:**

- `console` — you cannot `console.log` to debug a build file. Use `wx list` to check that a
  package parsed, and if you need to inspect a computed value, arrange for it to end up in a
  `RUN` step and read it out of the Docker build output.
- `process`, `process.env` — no environment access. Configuration must be literals in `.wx`
  files.
- `require`, `module`, `__dirname`, `__filename`.
- `fs`, `path`, `child_process`, or any other Node builtin. A build file cannot read the
  repository it describes.
- `fetch`, `setTimeout`, `setInterval`, and the other host-provided globals.

This is a real sandbox, not a convention. A malicious or buggy `package.wx` can waste CPU and
throw, but it cannot read your SSH keys or phone home.

## `wx:/` imports

Only one import specifier form is allowed. Anything else throws:

```
Only wx:/ imports are allowed in package.wx, got: <specifier>
```

The rules:

- **Specifiers must start with `wx:/`.** No bare specifiers (`'zod'`), no relative paths
  (`'./utils.js'`), no absolute paths, no URLs.
- **The path after `wx:/` is resolved from the repository root**, never from the importing
  file. `wx:/lib/versions` means `<repo root>/lib/versions` regardless of which package imports
  it. There is no such thing as a relative `.wx` import.
- **The `.wx` extension is appended when the path has no extension.** `wx:/lib/versions`
  loads `lib/versions.wx`. `wx:/lib/data.json` would try to load `lib/data.json` verbatim and
  evaluate it as a module — so in practice always import extensionless `.wx` files.

```js
import versions from 'wx:/lib/versions'                  // default export
import { writeJson, writeText } from 'wx:/lib/file_utils' // named exports
import { stack } from 'wx:/stacks/ts-lib'
```

Imported `.wx` files are ordinary modules — they can import other `wx:/` modules, and they can
export anything: constants, helper functions, or whole facet factories.

## Caching and sharing

One `wx` invocation loads the entire repo in a single session with a **shared module cache
keyed by resolved path**. Consequences worth knowing:

- A `.wx` module is evaluated at most once per invocation, no matter how many `package.wx`
  files import it. Module-level state is therefore shared across modules. Don't rely on that,
  but don't be surprised by it either.
- All modules share one V8 context, so they share intrinsics. An object created in
  `lib/versions.wx` is `instanceof Object` in `packages/ui/package.wx`.

## Immutability

Everything the loader returns is deep-frozen: each parsed `PackageDef`, recursively, plus the
outer `Map`. Attempting to mutate a target definition from anywhere in worxpace throws in
strict mode. This is a guard against the runner accidentally rewriting the graph mid-walk.

Note that freezing applies to the *parsed definition*, not to whatever your `run` function
constructs at build time — that object is freshly created on each call. (//TODO freeze what's returned)

## Shared helper modules

Because `wx:/` paths are root-relative and build files are real JavaScript, the natural way to
avoid repetition is a directory of helpers that export facet factories:

```js
// packages/common/package.wx
import { stack } from 'wx:/stacks/ts-lib'

export default stack({
  name: 'common',
  scope: 'myorg',
  version: '0.1.0',
  deps: [{ remote: 'zod' }],
})
```

`stack` returns every facet the package needs — `config`, `ci`, and `dev`. Each package's
`package.wx` becomes a few lines of declaration, and the actual build logic lives in one place.
See [07 — Conventions and layout](07-conventions-and-layout.md#the-libstacks-pattern).
