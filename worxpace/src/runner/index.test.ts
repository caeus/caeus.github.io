import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseFqt, fqtToString, buildRunner } from './index.js'
import type { TargetRunnerDeps } from './index.js'
import type { BuildResult } from './docker-builder.js'
import type { ProjectFile } from '../project/schema.js'

describe('parseFqt', () => {
  const ctx = { module: 'mod', suite: 'ci' }

  it('parses fully qualified module#suite#target', () => {
    assert.deepEqual(parseFqt('a#b#c', ctx), { module: 'a', suite: 'b', target: 'c' })
  })

  it('parses suite#target using context module', () => {
    assert.deepEqual(parseFqt('b#c', ctx), { module: 'mod', suite: 'b', target: 'c' })
  })

  it('parses target only using context module and suite', () => {
    assert.deepEqual(parseFqt('c', ctx), { module: 'mod', suite: 'ci', target: 'c' })
  })
})

describe('fqtToString', () => {
  it('joins module, suite, target with #', () => {
    assert.equal(fqtToString({ module: 'a', suite: 'b', target: 'c' }), 'a#b#c')
  })
})

describe('buildRunner', () => {
  const stubBuild = async (_content: string, tag: string): Promise<BuildResult> =>
    ({ tag, digest: `sha256:${tag}` })

  const stubDeps: TargetRunnerDeps = {
    renderDockerfile: () => 'FROM scratch\n',
    buildDockerImage: stubBuild,
    extractFromImage: async () => [],
  }

  const makeProject = (): Map<string, ProjectFile> =>
    new Map([['pkg', {
      ci: {
        a: { deps: [], run: (_deps) => ({ FROM: 'alpine', steps: [] }) },
        b: { deps: ['a'], run: (deps) => ({ FROM: deps['a']!, steps: [] }) },
      }
    }]])

  it('runs a target with no deps', async () => {
    const runner = buildRunner('/', makeProject(), stubDeps)
    const result = await runner('pkg#ci#a')
    assert.equal(result.fqt, 'pkg#ci#a')
    assert.equal(result.imageTag, 'pkg-ci-a')
    assert.equal(result.imageDigest, 'sha256:pkg-ci-a')
  })

  it('memoizes — same promise returned for same fqt', async () => {
    let calls = 0
    const countingDeps: TargetRunnerDeps = {
      ...stubDeps,
      buildDockerImage: async (_c, tag) => { calls++; return { tag, digest: `sha256:${tag}` } },
    }
    const runner = buildRunner('/', makeProject(), countingDeps)
    await Promise.all([runner('pkg#ci#a'), runner('pkg#ci#a')])
    assert.equal(calls, 1)
  })

  it('runs deps before the dependent target', async () => {
    const order: string[] = []
    const orderDeps: TargetRunnerDeps = {
      ...stubDeps,
      buildDockerImage: async (_c, tag) => { order.push(tag); return { tag, digest: `sha256:${tag}` } },
    }
    const runner = buildRunner('/', makeProject(), orderDeps)
    await runner('pkg#ci#b')
    assert.equal(order[0], 'pkg-ci-a')
    assert.equal(order[1], 'pkg-ci-b')
  })

  it('passes dep image tags to run function', async () => {
    let receivedDeps: Record<string, string> = {}
    const project = new Map<string, ProjectFile>([['pkg', {
      ci: {
        a: { deps: [], run: (_d) => ({ FROM: 'alpine', steps: [] }) },
        b: { deps: ['a'], run: (d) => { receivedDeps = {...d}; return { FROM: d['a']!, steps: [] } } },
      }
    }]])
    const runner = buildRunner('/', project, stubDeps)
    await runner('pkg#ci#b')
    assert.ok('a' in receivedDeps)
    assert.ok(receivedDeps['a']!.startsWith('pkg-ci-a'))
  })

  it('throws on unknown target', async () => {
    const runner = buildRunner('/', makeProject(), stubDeps)
    await assert.rejects(() => Promise.resolve().then(() => runner('pkg#ci#missing')), /Unknown target/)
  })

  it('detects circular dependencies', async () => {
    const circular = new Map<string, ProjectFile>([['pkg', {
      ci: {
        a: { deps: ['b'], run: (_d) => ({ FROM: 'alpine', steps: [] }) },
        b: { deps: ['a'], run: (_d) => ({ FROM: 'alpine', steps: [] }) },
      }
    }]])
    const runner = buildRunner('/', circular, stubDeps)
    await assert.rejects(() => Promise.resolve().then(() => runner('pkg#ci#a')), /Circular dependency/)
  })
})
