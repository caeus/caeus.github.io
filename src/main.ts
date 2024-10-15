import './assets/main.css'

import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import { ArticleFetcher, DefaultArticleFetcher } from './articles/articles-fetcher'
import { RootConf } from './config'
import { DefaultDevtoClient, DevtoClient } from './devto/devto-client'
import router from './router'
import { Wyr, type BindingKey } from 'wyr-ts'

async function wire() {
  const container = Wyr.module()
    .mergeWith(DefaultDevtoClient.module)
    .mergeWith(DefaultArticleFetcher.module)
    .mergeWith(RootConf.module)
    .asContainer()

  const toBind: BindingKey<unknown>[] = [DevtoClient.key, ArticleFetcher.key]
  await container.get(...toBind)
  const app = createApp(App)
  for (const b of toBind) {
    app.provide(b, await container.get(b).then((p) => p[0]))
  }
  app.use(createPinia())
  app.use(router)
  app.mount('#app')
}
wire()
