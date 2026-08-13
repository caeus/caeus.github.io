# Tasks: synth-tasks

## Phase 1: Schema

- [x] 1.1 Add `output: z.array(z.string()).readonly().optional()` to `Target` in `worxpace/src/project/schema.ts`
- [x] 1.2 Add `materialize: z.literal(true).optional()` to `Target` in `worxpace/src/project/schema.ts`
- [x] 1.3 Add `materializedPaths?: readonly string[]` to `TaskResult` in `worxpace/src/runner/index.ts`

## Phase 2: Decouple runner dependencies

- [x] 2.1 Define `TargetRunnerDeps` interface in `worxpace/src/runner/target-runner.ts` with method declarations: `renderDockerfile`, `buildDockerImage`, `extractFromImage`
- [x] 2.2 Update `runTarget` to accept `deps: TargetRunnerDeps` as a parameter instead of importing directly
- [x] 2.3 Update `buildRunner` in `worxpace/src/runner/index.ts` to accept `deps: TargetRunnerDeps` and pass it through to `runTarget`
- [x] 2.4 Update `wire.ts` to construct and pass the default `TargetRunnerDeps` implementation (wiring real docker functions) into `buildRunner`

## Phase 3: Extraction

- [x] 3.1 Create `worxpace/src/runner/docker-extractor.ts` with a function `extractFromImage(imageId, outputGlobs, destDir): Promise<readonly string[]>` that runs `docker run --rm -v <destDir>:/out <imageId> sh -c "cp -r <glob> /out/"` for each glob
- [x] 3.2 Update `runTarget` to call `deps.extractFromImage` when `target.materialize === true` and `target.output` is non-empty, passing the module directory as `destDir`
- [x] 3.3 Include returned paths in `TaskResult.materializedPaths`

## Verification

- [ ] Add `materialize: true` and `output` to `packages/common/project.yml` as a smoke test
- [ ] Run `node --import tsx/esm src/index.ts run packages/common#ci#typecheck` and confirm files appear on host
- [ ] Remove smoke test fields from `project.yml` after verification
