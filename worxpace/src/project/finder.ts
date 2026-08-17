import vm from 'node:vm'
import { readdir, readFile } from 'node:fs/promises'
import { resolve, relative } from 'node:path'
import type { ProjectFile } from './schema.js'

export interface ProjectFinder {
  findProjects(root: string): Promise<Map<string, ProjectFile>>
}

async function loadProject(filePath: string): Promise<ProjectFile | null> {
  const code = await readFile(filePath, 'utf-8')
  const context = vm.createContext(Object.create(null))
  const mod = new vm.SourceTextModule(code, { context, identifier: filePath })
  await mod.link(async (specifier: string) => {
    throw new Error(`Imports not allowed in project.js: ${specifier}`)
  })
  await mod.evaluate()
  const defaultExport = (mod.namespace as Record<string, unknown>)['default']
  if (defaultExport == null || typeof defaultExport !== 'object') return null
  return defaultExport as ProjectFile
}

export async function findProjects(root: string): Promise<Map<string, ProjectFile>> {
  const result = new Map<string, ProjectFile>()
  const rootEntries = await readdir(root, { withFileTypes: true })
  if (rootEntries.some(e => !e.isDirectory() && e.name === 'project.js')) {
    const project = await loadProject(resolve(root, 'project.js'))
    if (project) result.set('.', project)
  }
  const packagesRoot = resolve(root, 'packages')
  await walk(root, packagesRoot, result)
  return result
}

async function walk(root: string, dir: string, acc: Map<string, ProjectFile>): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true })
  const hasProjectJs = entries.some(e => !e.isDirectory() && e.name === 'project.js')
  if (hasProjectJs) {
    const project = await loadProject(resolve(dir, 'project.js'))
    if (project) acc.set(relative(root, dir), project)
    return
  }
  await Promise.all(
    entries
      .filter(e => e.isDirectory())
      .map(e => walk(root, resolve(dir, e.name), acc))
  )
}
