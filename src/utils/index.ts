export function run<T>(fn: () => Promise<T>): Promise<T> {
  return fn()
}
