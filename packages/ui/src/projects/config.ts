import type { ProjectConfig } from '#projects/index'

export const projectsConfig: readonly ProjectConfig[] = [
  {
    name: '@caeus/dagr',
    description: 'A monorepo task runner where every target is a Docker image.',
    url: 'https://github.com/caeus/dagr'
  },
  {
    name: '@caeus/wyr',
    description: 'A type-safe dependency injection library for TypeScript.',
    url: 'https://github.com/caeus/wyr'
  }
]
