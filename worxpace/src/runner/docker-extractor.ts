import { spawn } from 'node:child_process'
import { join } from 'node:path'

export async function extractFromImage(imageTag: string, outputGlobs: readonly string[], destDir: string): Promise<readonly string[]> {
  const written: string[] = []
  for (const glob of outputGlobs) {
    const dest = join(destDir, 'extracted')
    const src = glob.endsWith('/') ? `${glob}.` : glob
    await runCommand('docker', ['run', '--rm', '-v', `${destDir}:/host-out`, imageTag, 'sh', '-c', `cp -r ${src} /host-out/`])
    written.push(dest)
  }
  return written
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
