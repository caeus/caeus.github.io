import { writeFile, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'

const DEFAULT_DOCKERIGNORE = 'node_modules\n.git\n'

export async function buildDockerImage(dockerfileContent: string, tag: string, contextPath: string): Promise<string> {
  const base = join(tmpdir(), `worxpace-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  const dockerfilePath = `${base}.Dockerfile`
  const dockerignorePath = `${dockerfilePath}.dockerignore`

  await Promise.all([
    writeFile(dockerfilePath, dockerfileContent, 'utf-8'),
    writeFile(dockerignorePath, DEFAULT_DOCKERIGNORE, 'utf-8'),
  ])
  try {
    await runCommand('docker', ['buildx', 'build', '-t', tag, '-f', dockerfilePath, contextPath])
    return tag
  } finally {
    await Promise.all([
      unlink(dockerfilePath).catch(() => undefined),
      unlink(dockerignorePath).catch(() => undefined),
    ])
  }
}

function runCommand(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: 'inherit' })
    proc.on('close', code => {
      if (code === 0) resolve()
      else reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`))
    })
    proc.on('error', reject)
  })
}
