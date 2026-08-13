import { spawn } from 'node:child_process'
import { join } from 'node:path'

export async function extractFromImage(imageId: string, outputGlobs: readonly string[], destDir: string): Promise<readonly string[]> {
  const written: string[] = []
  for (const glob of outputGlobs) {
    const dest = join(destDir, 'extracted')
    await runCommand('docker', ['run', '--rm', '-v', `${destDir}:/out`, imageId, 'sh', '-c', `cp -r ${glob} /out/`])
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
