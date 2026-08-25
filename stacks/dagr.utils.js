export const pnpmfile = (scope, localDeps) => `const localPackages = new Set(${JSON.stringify(localDeps.map(dep => `@${scope}/${dep.local}`))})

function readPackage(pkg) {
  for (const depField of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    const deps = pkg[depField]
    if (!deps) continue
    for (const name of Object.keys(deps)) {
      if (localPackages.has(name)) {
        const tarball = name.slice('@${scope}/'.length).replace(/\\//g, '-')
        deps[name] = \`file:./\${tarball}.tgz\`
      }
    }
  }
  return pkg
}

module.exports = { hooks: { readPackage } }
`

const KINDS = ['prod', 'dev']

export function buildPackageJson({ name, scope, version, deps = [], coreDeps = [], coreDevDeps = [], extra = {}, versions }) {
  // Without this a mistyped kind would drop the dependency from both manifest fields, leaving a
  // package that installs cleanly and fails at import time.
  for (const d of deps) {
    if (!KINDS.includes(d.kind)) {
      throw new Error(`${name}: dependency ${d.local ?? d.remote} needs kind ${KINDS.join(' or ')}, got ${JSON.stringify(d.kind)}`)
    }
  }

  const entry = (d) => 'local' in d
    ? [`@${scope}/${d.local}`, '>=0.0.0']
    : [d.remote, versions[d.remote]]
  const ofKind = (kind) => deps.filter(d => d.kind === kind).map(entry)

  const dependencies = Object.fromEntries([
    ...coreDeps.map(pkg => [pkg, versions[pkg]]),
    ...ofKind('prod'),
  ])
  const devDependencies = Object.fromEntries([
    ...coreDevDeps.map(pkg => [pkg, versions[pkg]]),
    ...ofKind('dev'),
  ])
  return {
    name: `@${scope}/${name}`,
    version,
    type: 'module',
    // The internal scope is not a real npm org, so a stray publish would either fail or
    // squat a name. pnpm pack still works, which is all ci:pack needs.
    private: true,
    ...extra,
    dependencies,
    devDependencies,
  }
}
