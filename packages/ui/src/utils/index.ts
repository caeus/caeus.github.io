export function run<T>(fn: () => Promise<T>): Promise<T> {
  return fn()
}

export function raise(e: Error): never {
  throw e
}
