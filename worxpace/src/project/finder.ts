import { readdir, readFile } from 'fs/promises'
import { resolve, relative } from 'path'
import { parse } from 'yaml'
import { ProjectFile } from './schema.js'

export interface ProjectFinder {
  findProjects(root: string): Promise<Map<string, ProjectFile>>
}

export async function findProjects(root: string): Promise<Map<string, ProjectFile>> {
  const result = new Map<string, ProjectFile>()
  const rootEntries = await readdir(root, { withFileTypes: true })
  if (rootEntries.some(e => !e.isDirectory() && e.name === 'project.yml')) {
    const raw = await readFile(resolve(root, 'project.yml'), 'utf-8')
    const parsed = ProjectFile.safeParse(parse(raw))
    if (parsed.success) result.set('.', parsed.data)
  }
  const packagesRoot = resolve(root, 'packages')
  await walk(root, packagesRoot, result)
  return result
}

async function walk(root: string, dir: string, acc: Map<string, ProjectFile>): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true })
  const hasProjectYml = entries.some(e => !e.isDirectory() && e.name === 'project.yml')
  if (hasProjectYml) {
    const raw = await readFile(resolve(dir, 'project.yml'), 'utf-8')
    const result = ProjectFile.safeParse(parse(raw))
    if (result.success) acc.set(relative(root, dir), result.data)
    return
  }
  await Promise.all(
    entries
      .filter(e => e.isDirectory())
      .map(e => walk(root, resolve(dir, e.name), acc))
  )
}
