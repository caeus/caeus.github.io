import { spawn } from 'node:child_process'
import type { ExportEntry } from '../project/schema.js'

export async function extractFromImage(imageTag: string, exports: readonly ExportEntry[], destDir: string): Promise<void> {
  for (const { from, to } of exports) {
    const hostDest = to === '.' ? '/host-out' : `/host-out/${to}`
    await runCommand('docker', [
      'run', '--rm', '-v', `${destDir}:/host-out`, imageTag,
      'sh', '-c', `mkdir -p ${hostDest} && cp -r ${from}/. ${hostDest}/`
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
