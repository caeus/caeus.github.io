import { object, or } from '@optique/core/constructs'
import { argument, command, constant } from '@optique/core/primitives'
import { string } from '@optique/core/valueparser'
import { run } from '@optique/run'
import { resolve } from 'node:path'
import { AsyncDisposeStack, createKey, createModule, Module } from './di-container.js'
import { findProjects, type ProjectFinder } from './project/finder.js'
import type { Impl, ProjectFile } from './project/schema.js'
import { buildRunner, type Runner } from './runner/index.js'
import { renderDockerfile } from './runner/dockerfile-renderer.js'
import { buildDockerImage } from './runner/docker-builder.js'
import { extractFromImage } from './runner/docker-extractor.js'

export interface DockerfileRenderer {
  renderDockerfile(impl: Impl): string
}

export interface DockerImageBuilder {
  buildDockerImage(content: string, tag: string, context: string): Promise<string>
}

export interface DockerImageExtractor {
  extractFromImage(imageId: string, outputGlobs: readonly string[], destDir: string): Promise<readonly string[]>
}

const rootKey = createKey<string>('root')
const projectFinderKey = createKey<ProjectFinder>('projectFinder')
const projectsKey = createKey<Map<string, ProjectFile>>('projects')
const dockerfileRendererKey = createKey<DockerfileRenderer>('dockerfileRenderer')
const dockerImageBuilderKey = createKey<DockerImageBuilder>('dockerImageBuilder')
const dockerImageExtractorKey = createKey<DockerImageExtractor>('dockerImageExtractor')
const runnerKey = createKey<Runner>('runner')

const parser = or(
  command('run', object({
    command: constant('run' as const),
    fqt: argument(string()),
  })),
  command('list', object({
    command: constant('list' as const),
  })),
)

export type ModuleFactory = (stack: AsyncDisposeStack, env: NodeJS.ProcessEnv) => Module

export function defaultModule(_stack: AsyncDisposeStack, env: NodeJS.ProcessEnv): Module {
  return createModule()
    .bind(rootKey).toValue(env['REPO_ROOT'] ?? resolve(new URL('../../', import.meta.url).pathname))
    .bind(projectFinderKey).toValue({ findProjects } satisfies ProjectFinder)
    .bind(dockerfileRendererKey).toValue({ renderDockerfile } satisfies DockerfileRenderer)
    .bind(dockerImageBuilderKey).toValue({ buildDockerImage } satisfies DockerImageBuilder)
    .bind(dockerImageExtractorKey).toValue({ extractFromImage } satisfies DockerImageExtractor)
    .bind(projectsKey).toFun([rootKey, projectFinderKey], (root, finder) => finder.findProjects(root))
    .bind(runnerKey).toFun(
      [rootKey, projectsKey, dockerfileRendererKey, dockerImageBuilderKey, dockerImageExtractorKey],
      (root, projects, renderer, builder, extractor) => buildRunner(root, projects, {
        renderDockerfile: (impl) => renderer.renderDockerfile(impl),
        buildDockerImage: (content, tag, context) => builder.buildDockerImage(content, tag, context),
        extractFromImage: (imageId, globs, destDir) => extractor.extractFromImage(imageId, globs, destDir),
      })
    )
}

export async function main(args: string[], env: NodeJS.ProcessEnv, moduleFactory: ModuleFactory = defaultModule): Promise<void> {
  const cmd = run(parser, { args })

  const stack = new AsyncDisposeStack()
  try {
    const container = moduleFactory(stack, env).build()

    if (cmd.command === 'list') {
      const projects = await container.get(projectsKey)
      for (const [moduleName, suites] of projects) {
        for (const [suiteName, targets] of Object.entries(suites)) {
          for (const targetName of Object.keys(targets)) {
            console.log(`${moduleName}#${suiteName}#${targetName}`)
          }
        }
      }
    } else {
      const runner = await container.get(runnerKey)
      const result = await runner(cmd.fqt)
      console.log(`Done: ${result.imageId}`)
    }
  } finally {
    await stack.dispose()
  }
}
