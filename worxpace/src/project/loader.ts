import vm from 'node:vm'
import { readdir, readFile } from 'node:fs/promises'
import { resolve, relative } from 'node:path'
import { ProjectFile } from './schema.js'

const WX_PREFIX = 'wx:/'

export interface ProjectLoader {
  loadProjects(root: string): Promise<Map<string, ProjectFile>>
}

interface LoadContext {
  readonly root: string
  readonly context: vm.Context
  readonly cache: Map<string, vm.SourceTextModule>
}

async function link(specifier: string, ctx: LoadContext): Promise<vm.SourceTextModule> {
  if (!specifier.startsWith(WX_PREFIX))
    throw new Error(`Only wx:/ imports are allowed in project.js, got: ${specifier}`)
  const path = resolve(ctx.root, specifier.slice(WX_PREFIX.length))
  const cached = ctx.cache.get(path)
  if (cached) return cached
  const code = await readFile(path, 'utf-8')
  const mod = new vm.SourceTextModule(code, { context: ctx.context, identifier: path })
  ctx.cache.set(path, mod)
  await mod.link((s) => link(s, ctx))
  return mod
}

async function loadProject(filePath: string, ctx: LoadContext): Promise<ProjectFile | null> {
  const code = await readFile(filePath, 'utf-8')
  const mod = new vm.SourceTextModule(code, { context: ctx.context, identifier: filePath })
  await mod.link((s) => link(s, ctx))
  await mod.evaluate()
  const defaultExport = (mod.namespace as Record<string, unknown>)['default']
  const result = ProjectFile.safeParse(defaultExport)
  return result.success ? result.data : null
}

export async function loadProjects(root: string): Promise<Map<string, ProjectFile>> {
  const ctx: LoadContext = {
    root,
    context: vm.createContext(Object.create(null)),
    cache: new Map(),
  }
  const result = new Map<string, ProjectFile>()
  const rootEntries = await readdir(root, { withFileTypes: true })
  if (rootEntries.some(e => !e.isDirectory() && e.name === 'project.js')) {
    const project = await loadProject(resolve(root, 'project.js'), ctx)
    if (project) result.set('.', project)
  }
  const packagesRoot = resolve(root, 'packages')
  await walk(packagesRoot, ctx, result)
  return result
}

async function walk(dir: string, ctx: LoadContext, acc: Map<string, ProjectFile>): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true })
  if (entries.some(e => !e.isDirectory() && e.name === 'project.js')) {
    const project = await loadProject(resolve(dir, 'project.js'), ctx)
    if (project) acc.set(relative(ctx.root, dir), project)
    return
  }
  await Promise.all(
    entries
      .filter(e => e.isDirectory())
      .map(e => walk(resolve(dir, e.name), ctx, acc))
  )
}
