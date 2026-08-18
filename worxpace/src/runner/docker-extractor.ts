import { spawn } from 'node:child_process'

export async function extractFromImage(imageTag: string, exportMap: Readonly<Record<string, string>>, destDir: string): Promise<void> {
  for (const [src, dest] of Object.entries(exportMap)) {
    const hostDest = dest === '.' ? '/host-out' : `/host-out/${dest}`
    await runCommand('docker', [
      'run', '--rm', '-v', `${destDir}:/host-out`, imageTag,
      'sh', '-c', `mkdir -p ${hostDest} && cp -r ${src}/. ${hostDest}/`
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
