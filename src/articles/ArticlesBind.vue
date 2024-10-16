<script setup lang="ts">
import { inject, ref } from 'vue'
import ArticlesView from './ArticlesView.vue'
import { ArticleFetcher, type ArticleSample } from './articles-fetcher'
const fetcher = inject(ArticleFetcher.key)
if (!fetcher) {
  throw `ArticleFetcher not provided`
}
const articles = ref<ArticleSample[]>([])
fetcher.fetch().then((as) => {
  articles.value = as
})
</script>

<template>
  <div>
    <ArticlesView :articles="articles"></ArticlesView>
  </div>
</template>

<style scoped></style>
