import type { Impl } from '../project/schema.js'

export function renderDockerfile(impl: Impl): string {
  const lines: string[] = [`FROM ${impl.FROM}`]

  for (const step of impl.steps) {
    if ('RUN' in step) lines.push(`RUN ${step.RUN}`)
    else if ('COPY' in step) lines.push(`COPY ${step.COPY}`)
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
