import type { Run } from '../project/schema.js'
import type { TaskResult } from './index.js'

export function renderDockerfile(run: Run, depResults: readonly TaskResult[]): string {
  const from = 'image' in run.FROM
    ? run.FROM.image
    : resolveDepImage(run.FROM.target, depResults)

  const lines: string[] = [`FROM ${from}`]

  for (const step of run.steps) {
    if ('RUN' in step) lines.push(`RUN ${step.RUN}`)
    else if ('COPY' in step) {
      const copy = step.COPY
      if ('from' in copy) {
        const fromImage = resolveDepImage(copy.from, depResults)
        lines.push(`COPY --from=${fromImage} ${copy.src} ${copy.dest}`)
      } else {
        lines.push(`COPY ${copy.src} ${copy.dest}`)
      }
    }
    else if ('WORKDIR' in step) lines.push(`WORKDIR ${step.WORKDIR}`)
    else if ('ARG' in step) lines.push(`ARG ${step.ARG}`)
    else if ('ENV' in step) {
      for (const [k, v] of Object.entries(step.ENV)) lines.push(`ENV ${k}=${v}`)
    }
    else if ('ENTRYPOINT' in step) lines.push(`ENTRYPOINT ${JSON.stringify(step.ENTRYPOINT)}`)
    else if ('CMD' in step) lines.push(`CMD ${JSON.stringify(step.CMD)}`)
  }

  return lines.join('\n') + '\n'
}

function resolveDepImage(targetName: string, depResults: readonly TaskResult[]): string {
  const dep = targetName.includes('#')
    ? depResults.find(d => d.fqt === targetName)
    : depResults.find(d => d.fqt.slice(d.fqt.lastIndexOf('#') + 1) === targetName)
  if (!dep) throw new Error(`No dep result found for target: ${targetName}`)
  return dep.imageTag
}
