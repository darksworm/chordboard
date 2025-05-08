<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <header>
    <h1>ChordBoard</h1>
    <p>Create custom boards with guitar chords of your choosing</p>
  </header>

  <RouterView />
</template>

<style scoped>
header {
  text-align: center;
  margin: 2rem 0;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

p {
  color: #666;
}
</style>
