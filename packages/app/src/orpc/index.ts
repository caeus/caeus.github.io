import { implement, type Router } from '@orpc/server'
import { contract } from '@caeus/common'

export { contract }
export const os = implement(contract)
export type Os = typeof os
export type PartialRouter = Router<typeof contract, Record<never, never>>
