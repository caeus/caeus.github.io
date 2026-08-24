import { implement, type Router } from '@orpc/server'
import { contract } from '@internal/common'

export { contract }
export const os = implement(contract)
export type Os = typeof os
export interface PartialRouter extends Router<typeof contract, Record<never, never>>{}
