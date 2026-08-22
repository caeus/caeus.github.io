import { StrictMode, type ComponentType, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Module, toFactory, toValue, type ValidModule } from '@caeus/wyr'
import { createArticleFetcher } from '#articles/articles-fetcher'
import { connectApp } from '#app/index'
import { connectLayout } from '#app/Layout'
import { connectArticlesPage } from '#app/ArticlesPage'
import { connectOssPage } from '#app/OssPage'
import { connectResumePage } from '#resume/ResumePage'
import resumeContent from '#resume/resume.md?raw'
import './assets/main.css'
import { connectArticles } from '#articles/Articles'
import { raise } from '#utils/index'
import { connectProfile } from '#profile/index'
import { profileConfig } from '#profile/config'
import { connectProjects } from '#projects/index'
import { projectsConfig } from '#projects/config'
import type { ArticleFetcher } from '#articles/articles-fetcher'

export interface UiEnvironment {
  readonly document: Pick<Document, 'getElementById'>
}

export interface UiRoot {
  render(children: ReactNode): void
}

export interface WiredUi {
  readonly App: ComponentType
  readonly root: UiRoot
}

export type ModuleFactory = (env: UiEnvironment) => ValidModule<WiredUi>

export function defaultModule(env: UiEnvironment) {
  return Module({
    fetcher: toValue<ArticleFetcher>(createArticleFetcher('caeus', 10)),
    Profile: toValue(connectProfile(profileConfig)),
    Projects: toValue(connectProjects(projectsConfig)),
    Articles: toFactory(['fetcher'], connectArticles),
    Layout: toFactory(['Profile'], connectLayout),
    ArticlesPage: toFactory(['Articles'], connectArticlesPage),
    OssPage: toFactory(['Projects'], connectOssPage),
    ResumePage: toValue(connectResumePage(resumeContent)),
    App: toFactory(['Layout', 'ArticlesPage', 'OssPage', 'ResumePage'], connectApp),
    mountNode: toValue(env.document.getElementById('app') ?? raise(new Error('Mount node not found'))),
    root: toFactory(['mountNode'], (mountNode: HTMLElement): Root => createRoot(mountNode))
  }).shake(['App', 'root'])
}

export async function wire(
  env: UiEnvironment = window,
  module: ModuleFactory = defaultModule
): Promise<void> {
  const container = await module(env).compile()
  const App = container.get('App')
  const root = container.get('root')
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}
