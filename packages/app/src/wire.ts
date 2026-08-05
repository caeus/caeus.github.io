import { RPCHandler } from '@orpc/server/fetch'
import { Module, toFactory, toValue } from 'wyr-ts'
import { os } from '#orpc/index.js'
import { pingController } from '#controllers/ping.js'

const appModule = Module({
  os: toValue(os),
  pingController: toFactory(['os'], pingController),
  router: toFactory(['os', 'pingController'], (o: typeof os, ping: ReturnType<typeof pingController>) => o.router({ ...ping })),
  handler: toFactory(['router'], (r: ReturnType<typeof os.router>) => new RPCHandler(r)),
})

export async function wire(): Promise<ExportedHandler> {
  const container = await appModule.shake(['handler']).compile()
  const handler = container.get('handler')

  return {
    async fetch(request: Request): Promise<Response> {
      const { matched, response } = await handler.handle(request, {
        prefix: '/rpc',
      })
      if (matched) return response
      return new Response('Not found', { status: 404 })
    },
  }
}
