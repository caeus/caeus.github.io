import vm from 'node:vm'
import { readdir, readFile } from 'node:fs/promises'
import { resolve, relative } from 'node:path'
import { ProjectFile } from './schema.js'

const WX_PREFIX = 'wx:/'

export interface ProjectFinder {
  findProjects(root: string): Promise<Map<string, ProjectFile>>
}

async function loadProject(filePath: string, root: string): Promise<ProjectFile | null> {
  const context = vm.createContext(Object.create(null))
  const cache = new Map<string, vm.SourceTextModule>()

  async function link(specifier: string): Promise<vm.SourceTextModule> {
    if (!specifier.startsWith(WX_PREFIX))
      throw new Error(`Only wx:/ imports are allowed in project.js, got: ${specifier}`)
    const path = resolve(root, specifier.slice(WX_PREFIX.length))
    const cached = cache.get(path)
    if (cached) return cached
    const code = await readFile(path, 'utf-8')
    const mod = new vm.SourceTextModule(code, { context, identifier: path })
    cache.set(path, mod)
    await mod.link(link)
    return mod
  }

  const code = await readFile(filePath, 'utf-8')
  const mod = new vm.SourceTextModule(code, { context, identifier: filePath })
  await mod.link(link)
  await mod.evaluate()
  const defaultExport = (mod.namespace as Record<string, unknown>)['default']
  const result = ProjectFile.safeParse(defaultExport)
  return result.success ? result.data : null
}

export async function findProjects(root: string): Promise<Map<string, ProjectFile>> {
  const result = new Map<string, ProjectFile>()
  const rootEntries = await readdir(root, { withFileTypes: true })
  if (rootEntries.some(e => !e.isDirectory() && e.name === 'project.js')) {
    const project = await loadProject(resolve(root, 'project.js'), root)
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
    const project = await loadProject(resolve(dir, 'project.js'), root)
    if (project) acc.set(relative(root, dir), project)
    return
  }
  await Promise.all(
    entries
      .filter(e => e.isDirectory())
      .map(e => walk(root, resolve(dir, e.name), acc))
  )
}
