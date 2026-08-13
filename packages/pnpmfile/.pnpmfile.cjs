function readPackage(pkg) {
  for (const depField of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    const deps = pkg[depField]
    if (!deps) continue
    for (const [name, version] of Object.entries(deps)) {
      if (version.startsWith('workspace:')) {
        const tarball = name.replace(/^@[^/]+\//, '').replace(/\//g, '-')
        deps[name] = `file:./${tarball}.tgz`
      }
    }
  }
  return pkg
}

module.exports = { hooks: { readPackage } }
