import { Outlet } from 'react-router-dom'
import type { Profile } from '#profile/index'
import { Card, CardContent } from '#components/ui/card'
import { Nav } from './Nav'

export const connectLayout = (Profile: Profile) => () => (
  <div className="min-h-screen bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
    <main className="max-w-2xl mx-auto px-6 py-16 space-y-6">
      <Card>
        <CardContent className="pt-6">
          <Profile />
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
            <Nav />
          </div>
        </CardContent>
      </Card>
      <Outlet />
    </main>
  </div>
)

export type Layout = ReturnType<typeof connectLayout>
