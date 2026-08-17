import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { renderDockerfile } from './dockerfile-renderer.js'

describe('renderDockerfile', () => {
  it('renders FROM', () => {
    const result = renderDockerfile({ FROM: 'node:22-alpine', steps: [] })
    assert.equal(result, 'FROM node:22-alpine\n')
  })

  it('renders RUN step', () => {
    const result = renderDockerfile({
      FROM: 'alpine',
      steps: [{ RUN: 'echo hello' }]
    })
    assert.match(result, /^FROM alpine\nRUN echo hello\n$/)
  })

  it('renders COPY from host', () => {
    const result = renderDockerfile({
      FROM: 'alpine',
      steps: [{ COPY: { src: '.', dest: '/app' } }]
    })
    assert.match(result, /^COPY \. \/app$/m)
  })

  it('renders COPY --from with image tag', () => {
    const result = renderDockerfile({
      FROM: 'alpine',
      steps: [{ COPY: { from: 'sha256:abc123', src: '/out/file', dest: '/dest/file' } }]
    })
    assert.match(result, /^COPY --from=sha256:abc123 \/out\/file \/dest\/file$/m)
  })

  it('renders WORKDIR step', () => {
    const result = renderDockerfile({
      FROM: 'alpine',
      steps: [{ WORKDIR: '/app' }]
    })
    assert.match(result, /WORKDIR \/app/)
  })

  it('renders ENV step', () => {
    const result = renderDockerfile({
      FROM: 'alpine',
      steps: [{ ENV: { NODE_ENV: 'production' } }]
    })
    assert.match(result, /ENV NODE_ENV=production/)
  })

  it('renders ENTRYPOINT step as JSON', () => {
    const result = renderDockerfile({
      FROM: 'alpine',
      steps: [{ ENTRYPOINT: ['node', 'index.js'] }]
    })
    assert.match(result, /ENTRYPOINT \["node","index\.js"\]/)
  })
})
