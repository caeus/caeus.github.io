import { join } from 'node:path'
import type { Run, Target } from '../project/schema.js'
import type { BuildResult } from './docker-builder.js'
import type { TaskResult } from './index.js'

export interface TargetRunnerDeps {
  renderDockerfile(run: Run, depResults: readonly TaskResult[]): string
  buildDockerImage(content: string, tag: string, context: string): Promise<BuildResult>
  extractFromImage(imageTag: string, outputGlobs: readonly string[], destDir: string): Promise<readonly string[]>
}

export async function runTarget(fqt: string, target: Target, depResults: TaskResult[], root: string, deps: TargetRunnerDeps): Promise<TaskResult> {
  const moduleName = fqt.slice(0, fqt.indexOf('#'))
  const moduleDir = join(root, moduleName)
  const tag = fqt.replace(/#/g, '-').replace(/\//g, '_').replace(/^[^a-zA-Z0-9]+/, '')
  const dockerfileContent = deps.renderDockerfile(target.run, depResults)
  const { tag: imageTag, digest: imageDigest } = await deps.buildDockerImage(dockerfileContent, tag, moduleDir)

  if (target.materialize === true && target.output && target.output.length > 0) {
    const materializedPaths = await deps.extractFromImage(imageTag, target.output, moduleDir)
    return { fqt, imageTag, imageDigest, materializedPaths }
  }

  return { fqt, imageTag, imageDigest }
}
