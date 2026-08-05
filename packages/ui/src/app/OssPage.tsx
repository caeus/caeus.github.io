import type { Projects } from '#projects/index'
import { Card, CardContent, CardHeader } from '#components/ui/card'
import { Separator } from '#components/ui/separator'

export const connectOssPage = (Projects: Projects) => () => (
  <Card>
    <CardHeader>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
        Open Source
      </h2>
    </CardHeader>
    <Separator />
    <CardContent>
      <Projects />
    </CardContent>
  </Card>
)

export type OssPage = ReturnType<typeof connectOssPage>
