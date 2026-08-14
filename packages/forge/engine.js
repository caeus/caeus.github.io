import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Eta } from 'eta'

function renderDir(eta, src, dest, data) {
  mkdirSync(dest, { recursive: true })
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry)
    if (statSync(srcPath).isDirectory()) {
      renderDir(eta, srcPath, join(dest, entry), data)
    } else {
      const content = readFileSync(srcPath, 'utf-8')
      const rendered = eta.renderString(content, data)
      const outName = entry.endsWith('.tmpl') ? entry.slice(0, -5) : entry
      writeFileSync(join(dest, outName), rendered, 'utf-8')
    }
  }
}

export function wire({
  args = process.argv.slice(2),
  eta = new Eta({ autoEscape: false }),
} = {}) {
  const get = (flag) => args[args.indexOf(flag) + 1]
  renderDir(eta, get('--template'), get('--out'), JSON.parse(get('--data')))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) wire()
