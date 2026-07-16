<script setup lang="ts">
import { data as posts } from '../posts.data'
import PostRows from './PostRows.vue'
</script>

<template>
  <PostRows :posts="posts" />
</template>
