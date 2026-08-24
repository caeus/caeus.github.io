// Internal packages share one scope, distinct from the published @caeus one, so an import
// says at a glance whether it resolves to a workspace tarball or to the registry. Nothing
// under this scope is ever published.
export const INTERNAL_SCOPE = 'internal'
