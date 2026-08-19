import { spawn } from 'node:child_process'

export async function extractFromImage(imageTag: string, exportMap: Readonly<Record<string, string>>, destDir: string): Promise<void> {
  for (const [src, dest] of Object.entries(exportMap)) {
    const isMountRoot = dest === '.'
    const hostDest = isMountRoot ? '/host-out' : `/host-out/${dest}`
    // A directory export replaces its destination so files no longer produced by the build
    // disappear. Skipped when dest is '.', because that is the bind-mount root itself and
    // removing it would wipe the whole package directory.
    const reset = isMountRoot ? '' : `rm -rf "${hostDest}" && `
    await runCommand('docker', [
      'run', '--rm', '-v', `${destDir}:/host-out`, imageTag,
      'sh', '-c',
      `if [ -d "${src}" ]; then ${reset}mkdir -p "${hostDest}" && cp -r "${src}"/. "${hostDest}"/; ` +
      `else mkdir -p "$(dirname "${hostDest}")" && cp "${src}" "${hostDest}"; fi`
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
