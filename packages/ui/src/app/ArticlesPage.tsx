import type { Articles } from '#articles/Articles'
import { Card, CardContent, CardHeader } from '#components/ui/card'
import { Separator } from '#components/ui/separator'

export const connectArticlesPage = (Articles: Articles) => () => (
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
)

export type ArticlesPage = ReturnType<typeof connectArticlesPage>
