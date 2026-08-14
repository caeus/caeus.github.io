# caeus.github.io

Personal site + monorepo. Deployed to GitHub Pages from `docs/`.

## Build system

This repo uses **worxpace** — a Docker-based task runner defined via `project.yml` files. Every package declares suites of targets; targets have dependencies, a Dockerfile-like `run` definition, and optional `exports` to materialize files back to the host.

### Install `wx`

```sh
./worxpace/install.sh
```

This symlinks `wx` to `~/.local/bin/wx`. Make sure `~/.local/bin` is on your `PATH`.

`wx` traverses parent directories looking for a `worxpace/` folder. When found, that directory is the monorepo root and `worxpace/cli.sh` is invoked from there.

### Commands

```sh
wx list                        # list all available targets
wx run <module>#<suite>#<target>   # run a specific target
```

Examples:

```sh
wx run packages/ui#ci#scaffold     # generate config files from templates
wx run packages/ui#ci#install      # install node_modules (exports to host)
wx run packages/ui#ci#typecheck    # type-check
wx run packages/ui#ci#build        # vite production build
wx run .#ci#deploy                 # build ui and deploy to docs/
```

### `project.yml` format

```yaml
<suite>:
  <target>:
    deps:
      - <target>                     # same suite
      - <suite>#<target>             # same module, different suite
      - <module>#<suite>#<target>    # cross-module
    run:
      FROM:
        image: node:22-alpine        # base image
        # or:
        target: install              # use another target's image as base
      steps:
        - RUN: pnpm install
        - COPY:
            src: package.json
            dest: /repo/package.json
        - COPY:
            from: other-target       # copy from another target's image
            src: /out/file
            dest: /repo/file
        - WORKDIR: /repo
        - ENV:
            NODE_ENV: production
    exports:
      - /repo/node_modules           # copy directory to host as node_modules/
      - /out/                        # copy contents of /out to host (trailing slash = flatten)
```

### Stacks & templates

The `packages/forge` package contains a template engine ([Eta](https://eta.js.org/)) and stack templates. Each stack is a `FROM scratch` image of template files.

| Stack | Target | Contents |
|---|---|---|
| `ts-ui` | `packages/forge#ci#ts-ui` | tsconfig, eslintrc, prettierrc, package.json, vite.config.ts, vitest.config.ts |
| `ts-lib` | `packages/forge#ci#ts-lib` | tsconfig, prettierrc, package.json |
| `ts-executable` | `packages/forge#ci#ts-executable` | tsconfig, prettierrc, package.json |

Render a stack's templates in a consuming target:

```yaml
ci:
  scaffold:
    deps:
      - packages/forge#ci#engine
      - packages/forge#ci#ts-ui
    run:
      FROM:
        image: node:22-alpine
      steps:
        - COPY:
            from: packages/forge#ci#engine
            src: /forge
            dest: /forge
        - COPY:
            from: packages/forge#ci#ts-ui
            src: /forge/templates/ts-ui
            dest: /forge/templates/ts-ui
        - RUN: 'node /forge/engine.js --template /forge/templates/ts-ui --data ''{"scope":"caeus","name":"mypackage","outDir":"../../docs"}'' --out /out'
    exports:
      - /out/
```

Template variables use Eta syntax: `<%= it.scope %>`, `<%= it.name %>`, etc.

## Packages

| Package | Stack | Description |
|---|---|---|
| `packages/common` | ts-lib | Shared contracts and types |
| `packages/client` | ts-lib | oRPC client |
| `packages/app` | ts-executable | Cloudflare Worker |
| `packages/ui` | ts-ui | React/Vite frontend (deployed to `docs/`) |
| `packages/forge` | — | Template engine + stack templates |
