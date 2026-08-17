import vm from 'node:vm'
import { readdir, readFile } from 'node:fs/promises'
import { resolve, relative, extname } from 'node:path'
import { ModuleDef } from './schema.js'

const WX_PREFIX = 'wx:/'
const BUILD_FILE = 'build.wx'

export interface ModuleLoader {
  loadModules(root: string): Promise<ReadonlyMap<string, ModuleDef>>
}

interface LoadContext {
  readonly root: string
  readonly context: vm.Context
  readonly cache: Map<string, vm.SourceTextModule>
}

function deepFreeze<T>(value: T): T {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return value
  Object.freeze(value)
  for (const v of Object.values(value as object)) deepFreeze(v)
  return value
}

async function link(specifier: string, ctx: LoadContext): Promise<vm.SourceTextModule> {
  if (!specifier.startsWith(WX_PREFIX))
    throw new Error(`Only wx:/ imports are allowed in build.wx, got: ${specifier}`)
  const rel = specifier.slice(WX_PREFIX.length)
  const base = resolve(ctx.root, rel)
  const path = extname(base) ? base : `${base}.wx`
  const cached = ctx.cache.get(path)
  if (cached) return cached
  const code = await readFile(path, 'utf-8')
  const mod = new vm.SourceTextModule(code, { context: ctx.context, identifier: path })
  ctx.cache.set(path, mod)
  await mod.link((s) => link(s, ctx))
  return mod
}

async function loadProject(filePath: string, ctx: LoadContext): Promise<ModuleDef | null> {
  const code = await readFile(filePath, 'utf-8')
  const mod = new vm.SourceTextModule(code, { context: ctx.context, identifier: filePath })
  await mod.link((s) => link(s, ctx))
  await mod.evaluate()
  const defaultExport = (mod.namespace as Record<string, unknown>)['default']
  const result = ModuleDef.safeParse(defaultExport)
  return result.success ? deepFreeze(result.data) : null
}

export async function loadModules(root: string): Promise<ReadonlyMap<string, ModuleDef>> {
  const ctx: LoadContext = {
    root,
    context: vm.createContext(Object.assign(Object.create(null), { Buffer })),
    cache: new Map(),
  }
  const result = new Map<string, ModuleDef>()
  const rootEntries = await readdir(root, { withFileTypes: true })
  if (rootEntries.some(e => !e.isDirectory() && e.name === BUILD_FILE)) {
    const project = await loadProject(resolve(root, BUILD_FILE), ctx)
    if (project) result.set('.', project)
  }
  await walk(resolve(root, 'packages'), ctx, result)
  return Object.freeze(result)
}

async function walk(dir: string, ctx: LoadContext, acc: Map<string, ModuleDef>): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true })
  if (entries.some(e => !e.isDirectory() && e.name === BUILD_FILE)) {
    const project = await loadProject(resolve(dir, BUILD_FILE), ctx)
    if (project) acc.set(relative(ctx.root, dir), project)
    return
  }
  await Promise.all(
    entries
      .filter(e => e.isDirectory())
      .map(e => walk(resolve(dir, e.name), ctx, acc))
  )
}
