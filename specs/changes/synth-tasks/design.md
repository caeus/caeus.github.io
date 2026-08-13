# Design: synth-tasks

## Context

- `Target` schema lives in `worxpace/src/project/schema.ts` — currently `{ deps, impl }`
- `runTarget` in `worxpace/src/runner/target-runner.ts` builds the image and returns `TaskResult { fqt, imageId }`
- `buildDockerImage` in `worxpace/src/runner/docker-builder.ts` handles the actual `docker buildx build`
- The module directory on the host is `<root>/<moduleName>` (e.g. `packages/common`)

## Goals / Non-Goals

**Goals**
- Allow targets to write files back to the host in a declared, explicit way
- Keep the dangerous nature visible: both `materialize: true` AND `output` must be set
- `TaskResult` carries what was materialized so downstream targets can reason about it

**Non-goals**
- Merge/conflict strategies
- Interactive confirmation

## Decisions

### 1. Extraction via `docker run` with glob expansion inside the container

**Rationale:** `docker cp` does not support globs — it takes exact paths. Since `output` supports globs, expansion must happen inside the container. The approach: `docker run --rm -v <destDir>:/out <image> sh -c "cp -r <glob> /out/"`. This expands globs using the container's shell and copies matched files to a host-mounted `/out` directory.

**Alternative considered:** `docker create` + `docker cp` + `docker rm` — rejected because `docker cp` takes only exact paths, requiring a separate glob-expansion step inside the container anyway, making `docker run -v` simpler overall.

### 2. Output lands relative to the module directory

**Rationale:** The build context is already the module directory. Keeping output relative to it is consistent and predictable — the user sees generated files next to `project.yml`.

**Alternative considered:** A configurable destination per output path — rejected as premature; can be added later.

### 3. Both `materialize: true` AND `output` required to trigger extraction

**Rationale:** Either alone is inert — `materialize: true` with no `output` doesn't know what to copy; `output` alone with no `materialize` is just metadata. The dual requirement makes the dangerous operation explicit and hard to trigger accidentally.

### 4. `TaskResult` gains `materializedPaths?: readonly string[]`

**Rationale:** Downstream targets may need to know what files were written. Keeping it optional means non-materializing targets are unaffected.

### 5. `TargetRunnerDeps` interface with method declarations, injected into `buildRunner`

**Rationale:** `target-runner.ts` currently hardcodes imports of `renderDockerfile` and `buildDockerImage`, making it untestable and tightly coupled. Extracting these into an injected interface with method declarations (not function-typed properties) makes the dependencies explicit and swappable:

```ts
export interface TargetRunnerDeps {
  renderDockerfile(impl: Impl): string
  buildDockerImage(content: string, tag: string, context: string): Promise<string>
  extractFromImage(imageId: string, outputGlobs: readonly string[], destDir: string): Promise<readonly string[]>
}
```

`buildRunner` receives a `TargetRunnerDeps` and passes it through to `runTarget`. The default implementation wires the real docker functions. Tests can supply a stub.

**Alternative considered:** Keeping direct imports — rejected because it couples the runner to the docker implementation and makes unit testing impossible.

## Risks / Trade-offs

- **Host mutation is irreversible** — no undo. Mitigated by requiring explicit opt-in on both fields.
- **Path collisions** — extracted files silently overwrite existing ones. Acceptable for now; can add a `--force` guard later.
- **Shell availability** — extraction uses `sh -c` inside the container; images built `FROM scratch` won't have a shell. Images that materialize output must include a shell or use a multi-stage build with a shell-bearing final stage.
