import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Module, toFactory, toValue } from 'wyr-ts'
import { createArticleFetcher } from '#articles/articles-fetcher'
import { connectApp } from '#app/index'
import { connectLayout } from '#app/Layout'
import { connectArticlesPage } from '#app/ArticlesPage'
import { connectOssPage } from '#app/OssPage'
import './assets/main.css'
import { connectArticles } from '#articles/Articles'
import { raise } from '#utils/index'
import { connectProfile } from '#profile/index'
import { profileConfig } from '#profile/config'
import { connectProjects } from '#projects/index'
import { projectsConfig } from '#projects/config'
import type { ArticleFetcher } from '#articles/articles-fetcher'

const appModule = Module({
  fetcher: toValue<ArticleFetcher>(createArticleFetcher('caeus', 10)),
  Profile: toValue(connectProfile(profileConfig)),
  Projects: toValue(connectProjects(projectsConfig)),
  Articles: toFactory(['fetcher'], connectArticles),
  Layout: toFactory(['Profile'], connectLayout),
  ArticlesPage: toFactory(['Articles'], connectArticlesPage),
  OssPage: toFactory(['Projects'], connectOssPage),
  App: toFactory(['Layout', 'ArticlesPage', 'OssPage'], connectApp),
  mountNode: toValue(document.getElementById('app') ?? raise(new Error('Mount node not found')))
})

export async function wire() {
  const container = await appModule.shake(['App', 'mountNode']).compile()
  const App = container.get('App')
  const mountNode = container.get('mountNode')
  createRoot(mountNode).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}
