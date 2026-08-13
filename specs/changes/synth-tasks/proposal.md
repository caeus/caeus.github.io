# Proposal: synth-tasks

## Problem

Some targets need to produce files on the host filesystem — generated code, scaffolded projects, config files derived from templates. Currently the runner only builds Docker images and never writes anything back to the working tree.

## Solution

Add two optional fields to the `Target` schema:
- `output: string[]` — list of absolute paths or globs inside the image to extract
- `materialize: true` — opt-in flag that triggers extraction to the host

When both are present, after the image is built the runner extracts each declared output path and writes it back to the module directory on the host (relative to where `project.yml` lives).

## Scope

- Schema changes: add `output` and `materialize` to `Target`
- Runner change: after `buildDockerImage`, if `materialize: true`, run extraction for each path in `output`
- Extraction mechanism: `docker create` + `docker cp` + `docker rm`
- Output lands in the module directory on the host, preserving the path structure from inside the image
- `TaskResult` gains an optional `materializedPaths` field listing what was written

## Out of Scope

- Conflict resolution if extracted files already exist
- Dry-run or preview mode
- Glob expansion inside the image (paths are exact for now)
- Any UI or confirmation prompt before writing
