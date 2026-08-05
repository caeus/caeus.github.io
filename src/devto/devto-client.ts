import { z } from 'zod'

export const ArticleSample = z
  .object({
    id: z.number().transform(String),
    title: z.string(),
    url: z.string(),
    readable_publish_date: z.string(),
    reading_time_minutes: z.number(),
    tag_list: z.array(z.string()).readonly()
  })
  .readonly()

export interface ArticleSample extends z.infer<typeof ArticleSample> {}

export interface DevtoClient {
  articles(username: string, per_page?: number, page?: number): Promise<readonly ArticleSample[]>
}

export class DefaultDevtoClient implements DevtoClient {
  constructor(private readonly baseUrl: string) {}

  async articles(
    username: string,
    per_page?: number,
    page?: number
  ): Promise<readonly ArticleSample[]> {
    const params = new URLSearchParams()
    if (per_page != undefined) params.append('per_page', String(per_page))
    if (page != undefined) params.append('page', String(page))
    // duplicate param trick to bust a mysterious cache
    params.append('username', (+new Date()).toString())
    params.append('username', username)

    const r = await fetch(`${this.baseUrl}/articles?${params}`)
    if (r.ok)
      return z
        .array(ArticleSample)
        .readonly()
        .parse(await r.json())
    throw await r.json()
  }
}
