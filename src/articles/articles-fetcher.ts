import { RootConf } from '@/config'
import { DevtoClient } from '@/devto/devto-client'
import type { InjectionKey } from 'vue'
import { Wyr, type BindingKey, type Creator } from 'wyr-ts'
import { z } from 'zod'

export type ArticleSample = import('@/devto/devto-client').ArticleSample
export interface ArticleFetcher {
  fetch(): Promise<ArticleSample[]>
}
export namespace ArticleFetcher {
  export const key: BindingKey<ArticleFetcher> & InjectionKey<ArticleFetcher> =
    Symbol('ArticleFetcher')
}

export class DefaultArticleFetcher implements ArticleFetcher {
  constructor(
    private client: DevtoClient,
    private config: DefaultArticleFetcher.Config
  ) {}
  fetch(): Promise<ArticleSample[]> {
    return this.client.articles(this.config.username, this.config.per_page)
  }
}

export namespace DefaultArticleFetcher {
  export namespace Config {
    export const schema = z.object({
      username: z.string(),
      per_page: z.number().optional()
    })
    export const key: BindingKey<Config> = Symbol('DefaultArticleFetcher.Config')
    export function fromAny(any: any): Config {
      return schema.parse(any)
    }
    export const creator = Wyr.creator(RootConf.key)(async (c) => fromAny(c.article_fetcher))
  }
  export type Config = z.infer<typeof Config.schema>
  export const creator: Creator<ArticleFetcher> = Wyr.creator(
    DevtoClient.key,
    Config.key
  )((client, config) => Promise.resolve(new DefaultArticleFetcher(client, config)))
  export const module = Wyr.module()
    .bind(ArticleFetcher.key)
    .to(DefaultArticleFetcher.creator)
    .bind(DefaultArticleFetcher.Config.key)
    .to(DefaultArticleFetcher.Config.creator)
}
