import type { Articles } from '@/articles/Articles'
import type { Profile } from '@/profile/index'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export const connectApp = (Articles: Articles, Profile: Profile) => () => (
  <div className="min-h-screen bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
    <main className="max-w-2xl mx-auto px-6 py-16 space-y-6">
      <Card>
        <CardContent className="pt-6">
          <Profile />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Articles
          </h2>
        </CardHeader>
        <Separator />
        <CardContent>
          <Articles />
        </CardContent>
      </Card>
    </main>
  </div>
)
