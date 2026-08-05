export interface ArticleSample {
  readonly id: string
  readonly title: string
  readonly url: string
  readonly readable_publish_date: string
  readonly reading_time_minutes: number
  readonly tag_list: readonly string[]
}

export interface DevtoClient {
  articles(username: string, per_page?: number, page?: number): Promise<ArticleSample[]>
}

export class DefaultDevtoClient implements DevtoClient {
  constructor(private readonly baseUrl: string) {}

  articles(username: string, per_page?: number, page?: number): Promise<ArticleSample[]> {
    const params = new URLSearchParams()
    if (per_page != undefined) params.append('per_page', String(per_page))
    if (page != undefined) params.append('page', String(page))
    // duplicate param trick to bust a mysterious cache
    params.append('username', (+new Date()).toString())
    params.append('username', username)

    return fetch(`${this.baseUrl}/articles?${params}`).then((r) => {
      if (r.ok) return r.json()
      return r.json().then((body) => Promise.reject(body))
    })
  }
}
