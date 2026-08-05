import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createArticleFetcher } from '@/articles/articles-fetcher'
import { connectApp } from '@/app/index'
import { connectLayout } from '@/app/Layout'
import { connectArticlesPage } from '@/app/ArticlesPage'
import { connectOssPage } from '@/app/OssPage'
import './assets/main.css'
import { ArticlesView, connectArticles } from '@/articles/Articles'
import { raise } from '@/utils/index'
import { connectProfile } from '@/profile/index'
import { profileConfig } from '@/profile/config'
import { connectProjects } from '@/projects/index'
import { projectsConfig } from '@/projects/config'

export function wire() {
  const fetcher = createArticleFetcher('caeus', 10)
  const Articles = connectArticles(ArticlesView, fetcher)
  const Profile = connectProfile(profileConfig)
  const Projects = connectProjects(projectsConfig)
  const Layout = connectLayout(Profile)
  const ArticlesPage = connectArticlesPage(Articles)
  const OssPage = connectOssPage(Projects)
  const App = connectApp(Layout, ArticlesPage, OssPage)
  const mountNode = document.getElementById('app') ?? raise(new Error('Mount node not found'))

  createRoot(mountNode).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}
