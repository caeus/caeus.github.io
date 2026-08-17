import type { Run } from '../project/schema.js'

export function renderDockerfile(run: Run): string {
  const lines: string[] = [`FROM ${run.FROM}`]

  for (const step of run.steps) {
    if ('RUN' in step) lines.push(`RUN ${step.RUN}`)
    else if ('COPY' in step) {
      const { from, src, dest } = step.COPY
      lines.push(from ? `COPY --from=${from} ${src} ${dest}` : `COPY ${src} ${dest}`)
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
