import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { ContractRouterClient } from '@orpc/contract'
import { contract } from '@caeus/common'

export type Client = ContractRouterClient<typeof contract>

export function createClient(baseUrl: string): Client {
  return createORPCClient<Client>(
    new RPCLink({ url: `${baseUrl}/rpc` })
  )
}
