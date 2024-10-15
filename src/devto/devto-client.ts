import { RootConf } from '@/config'
import { Wyr, type BindingKey, type Creator } from 'wyr-ts'
import { z } from 'zod'

export interface ArticleSample {
  readonly id: string
  readonly title: string
  readonly url: string
}
export interface DevtoClient {
  articles(username: string, per_page?: number, page?: number): Promise<ArticleSample[]>
}
export namespace DevtoClient {
  export const key: BindingKey<DevtoClient> = Symbol('DevtoClient')
}

export class DefaultDevtoClient implements DevtoClient {
  constructor(private readonly config: DefaultDevtoClient.Config) {}
  articles(username: string, per_page?: number, page?: number): Promise<ArticleSample[]> {
    const params: Record<string, string> = {
      username
    }
    if (per_page != undefined) {
      params.per_page = String(per_page)
    }
    if (page != undefined) {
      params.page = String(page)
    }
    return fetch(`${this.config.base_url}/articles?${new URLSearchParams(params)}`).then((r) => {
      if (r.ok) return r.json()
      return r.json().then((r) => Promise.reject(r))
    })
  }
}
export namespace DefaultDevtoClient {
  export namespace Config {
    export const schema = z.object({
      base_url: z.string()
    })
    export const key: BindingKey<Config> = Symbol('DefaultDevtoClient.Config')
    export function fromAny(any: any) {
      return schema.parse(any)
    }
    export const creator = Wyr.creator(RootConf.key)(async (c) => fromAny(c.devto.client))
    export type Schema = z.infer<typeof schema>
  }
  export type Config = Config.Schema
  export const creator: Creator<DevtoClient> = Wyr.creator(Config.key)((c) =>
    Promise.resolve(new DefaultDevtoClient(c))
  )
  export const module = Wyr.module()
    .bind(DevtoClient.key)
    .to(creator)
    .bind(Config.key)
    .to(Config.creator)
}
