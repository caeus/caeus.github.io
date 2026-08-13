import { join } from 'node:path'
import type { Impl, Target } from '../project/schema.js'
import type { TaskResult } from './index.js'

export interface TargetRunnerDeps {
  renderDockerfile(impl: Impl): string
  buildDockerImage(content: string, tag: string, context: string): Promise<string>
  extractFromImage(imageId: string, outputGlobs: readonly string[], destDir: string): Promise<readonly string[]>
}

export async function runTarget(fqt: string, target: Target, _depResults: TaskResult[], root: string, deps: TargetRunnerDeps): Promise<TaskResult> {
  const moduleName = fqt.slice(0, fqt.indexOf('#'))
  const moduleDir = join(root, moduleName)
  const tag = fqt.replace(/#/g, '-').replace(/\//g, '_')
  const dockerfileContent = deps.renderDockerfile(target.impl)
  const imageId = await deps.buildDockerImage(dockerfileContent, tag, moduleDir)

  if (target.materialize === true && target.output && target.output.length > 0) {
    const materializedPaths = await deps.extractFromImage(imageId, target.output, moduleDir)
    return { fqt, imageId, materializedPaths }
  }

  return { fqt, imageId }
}
