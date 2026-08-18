import { spawn } from 'node:child_process'
import type { ExportEntry } from '../project/schema.js'

export async function extractFromImage(imageTag: string, entry: ExportEntry, destDir: string): Promise<void> {
  const hostDest = entry.dest === '.' ? '/host-out' : `/host-out/${entry.dest}`
  await runCommand('docker', [
    'run', '--rm', '-v', `${destDir}:/host-out`, imageTag,
    'sh', '-c', `mkdir -p ${hostDest} && cp -r ${entry.src}/. ${hostDest}/`
  ])
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
