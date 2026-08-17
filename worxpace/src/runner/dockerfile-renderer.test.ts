import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { renderDockerfile } from './dockerfile-renderer.js'

describe('renderDockerfile', () => {
  it('renders FROM from first tuple element', () => {
    const result = renderDockerfile([{ FROM: 'node:22-alpine' }])
    assert.equal(result, 'FROM node:22-alpine\n')
  })

  it('renders steps after FROM', () => {
    const result = renderDockerfile([
      { FROM: 'alpine' },
      { RUN: 'echo hello' },
    ])
    assert.equal(result, 'FROM alpine\nRUN echo hello\n')
  })

  it('renders COPY from host', () => {
    const result = renderDockerfile([
      { FROM: 'alpine' },
      { COPY: { src: '.', dest: '/app' } },
    ])
    assert.match(result, /^COPY \. \/app$/m)
  })

  it('renders COPY --from with image tag', () => {
    const result = renderDockerfile([
      { FROM: 'alpine' },
      { COPY: { from: 'sha256:abc123', src: '/out/file', dest: '/dest/file' } },
    ])
    assert.match(result, /^COPY --from=sha256:abc123 \/out\/file \/dest\/file$/m)
  })

  it('renders WORKDIR', () => {
    const result = renderDockerfile([{ FROM: 'alpine' }, { WORKDIR: '/app' }])
    assert.match(result, /WORKDIR \/app/)
  })

  it('renders ENV', () => {
    const result = renderDockerfile([{ FROM: 'alpine' }, { ENV: { NODE_ENV: 'production' } }])
    assert.match(result, /ENV NODE_ENV=production/)
  })

  it('renders ENTRYPOINT as JSON', () => {
    const result = renderDockerfile([{ FROM: 'alpine' }, { ENTRYPOINT: ['node', 'index.js'] }])
    assert.match(result, /ENTRYPOINT \["node","index\.js"\]/)
  })
})
