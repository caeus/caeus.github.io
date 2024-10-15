<script setup lang="ts">
import type { ArticleSample } from '@/articles/articles-fetcher'
defineProps<{
  articles: ArticleSample[]
}>()
</script>
<template>
  <ul>
    <li v-for="article in articles" :key="article.id">
      <a :href="article.url"><span v-text="article.title"></span></a>
    </li>
  </ul>
</template>
<style scoped></style>
