import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { Layout } from './Layout'
import type { ArticlesPage } from './ArticlesPage'
import type { OssPage } from './OssPage'
import type { ResumePage } from '#resume/ResumePage'

export const connectApp = (Layout: Layout, ArticlesPage: ArticlesPage, OssPage: OssPage, ResumePage: ResumePage) => () => (
  <HashRouter>
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/articles" replace />} />
        <Route path="articles" element={<ArticlesPage />} />
        <Route path="oss" element={<OssPage />} />
        <Route path="resume" element={<ResumePage />} />
      </Route>
    </Routes>
  </HashRouter>
)
