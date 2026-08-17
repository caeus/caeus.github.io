import type { Run } from '../project/schema.js'

export function renderDockerfile([{ FROM }, ...steps]: Run): string {
  return [
    `FROM ${FROM}`,
    ...steps.flatMap(step => {
      
      if ('RUN' in step) return [`RUN ${step.RUN}`]
      if ('COPY' in step) {
        const copy = step.COPY
        return ['from' in copy
          ? `COPY --from=${copy.from} ${copy.src} ${copy.dest}`
          : `COPY ${copy.src} ${copy.dest}`]
      }
      if ('WORKDIR' in step) return [`WORKDIR ${step.WORKDIR}`]
      if ('ARG' in step) return [`ARG ${step.ARG}`]
      if ('ENV' in step) return Object.entries(step.ENV).map(([k, v]) => `ENV ${k}=${v}`)
      if ('ENTRYPOINT' in step) return [`ENTRYPOINT ${JSON.stringify(step.ENTRYPOINT)}`]
      if ('CMD' in step) return [`CMD ${JSON.stringify(step.CMD)}`]
      return []
    })
  ].join('\n') + '\n'
}
