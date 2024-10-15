import { Wyr, type BindingKey } from 'wyr-ts'

export const conf = {
  article_fetcher: {
    username: 'caeus',
    per_page: 10
  },
  devto: {
    client: {
      base_url: `https://dev.to/api`
    }
  }
}
export namespace RootConf {
  export const key: BindingKey<any> = Symbol('RootConf')
  export const creator = Wyr.creator()(async () => conf)
  export const module = Wyr.module().bind(key).to(creator)
}

