import { join } from 'node:path'
import type { TargetDef } from '../pkg/schema.js'
import type { BuildResult } from './docker-builder.js'
import type { FQT, TaskResult } from './index.js'

export interface TargetRunnerDeps {
  renderDockerfile(run: ReturnType<TargetDef['run']>): string
  buildDockerImage(content: string, tag: string, context: string, ignore: readonly string[]): Promise<BuildResult>
}

export async function runTarget(fqt: FQT, target: TargetDef, depResults: TaskResult[], root: string, deps: TargetRunnerDeps): Promise<TaskResult> {
  const packageDir = join(root, fqt.pkg)
  const tag = fqt.toString().replace(/#/g, '-').replace(/\//g, '_').replace(/^[^a-zA-Z0-9]+/, '')

  const depsMap = Object.fromEntries(
    target.deps.map((dep, i) => [dep, depResults[i]!.imageTag])
  )

  const runDef = target.run(depsMap)
  const dockerfileContent = deps.renderDockerfile(runDef)
  const { tag: imageTag, digest: imageDigest } = await deps.buildDockerImage(dockerfileContent, tag, packageDir, runDef.IGNORE)

  return runDef.EXPORT
    ? { fqt, imageTag, imageDigest, export: runDef.EXPORT }
    : { fqt, imageTag, imageDigest }
}
