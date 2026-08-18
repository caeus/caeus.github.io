import Markdown from 'react-markdown'
import { Card, CardContent, CardHeader } from '#components/ui/card'
import { Separator } from '#components/ui/separator'

export const connectResumePage = (content: string) => () => (
  <Card>
    <CardHeader>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
        Résumé
      </h2>
    </CardHeader>
    <Separator />
    <CardContent>
      <div className="text-sm leading-relaxed space-y-2">
        <Markdown>{content}</Markdown>
      </div>
    </CardContent>
  </Card>
)

export type ResumePage = ReturnType<typeof connectResumePage>
