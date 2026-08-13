import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { renderDockerfile } from './dockerfile-renderer.js'

describe('renderDockerfile', () => {
  it('renders FROM image', () => {
    const result = renderDockerfile({ FROM: { image: 'node:22-alpine' }, steps: [] }, [])
    assert.equal(result, 'FROM node:22-alpine\n')
  })

  it('renders FROM target using dep imageId', () => {
    const result = renderDockerfile(
      { FROM: { target: 'install' }, steps: [] },
      [{ fqt: 'pkg#ci#install', imageTag: 'pkg-ci-install', imageDigest: 'sha256:abc' }]
    )
    assert.equal(result, 'FROM pkg-ci-install\n')
  })

  it('throws if dep target not found', () => {
    assert.throws(
      () => renderDockerfile({ FROM: { target: 'missing' }, steps: [] }, []),
      /No dep result found for target: missing/
    )
  })

  it('renders RUN step', () => {
    const result = renderDockerfile(
      { FROM: { image: 'alpine' }, steps: [{ RUN: 'echo hello' }] },
      []
    )
    assert.match(result, /^FROM alpine\nRUN echo hello\n$/)
  })

  it('renders COPY step from host', () => {
    const result = renderDockerfile(
      { FROM: { image: 'alpine' }, steps: [{ COPY: { src: '.', dest: '/app' } }] },
      []
    )
    assert.match(result, /^COPY \. \/app$/m)
  })

  it('renders COPY step from target', () => {
    const result = renderDockerfile(
      { FROM: { image: 'alpine' }, steps: [{ COPY: { from: 'install', src: '/repo/node_modules', dest: '/repo/node_modules' } }] },
      [{ fqt: 'pkg#ci#install', imageTag: 'pkg-ci-install', imageDigest: 'sha256:abc' }]
    )
    assert.match(result, /^COPY --from=pkg-ci-install \/repo\/node_modules \/repo\/node_modules$/m)
  })

  it('renders WORKDIR step', () => {
    const result = renderDockerfile(
      { FROM: { image: 'alpine' }, steps: [{ WORKDIR: '/app' }] },
      []
    )
    assert.match(result, /WORKDIR \/app/)
  })

  it('renders ENV step', () => {
    const result = renderDockerfile(
      { FROM: { image: 'alpine' }, steps: [{ ENV: { NODE_ENV: 'production' } }] },
      []
    )
    assert.match(result, /ENV NODE_ENV=production/)
  })

  it('renders ENTRYPOINT step as JSON', () => {
    const result = renderDockerfile(
      { FROM: { image: 'alpine' }, steps: [{ ENTRYPOINT: ['node', 'index.js'] }] },
      []
    )
    assert.match(result, /ENTRYPOINT \["node","index\.js"\]/)
  })
})
