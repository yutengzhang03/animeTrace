<script setup>
import SubjectCard from './SubjectCard.vue';

defineProps({
  title: { type: String, required: true },
  subtitle: String,
  items: { type: Array, default: () => [] },
});
</script>

<template>
  <section v-if="items.length" class="space-y-3">
    <div class="flex items-baseline gap-3">
      <h2 class="text-lg font-semibold">
        <span class="bg-gradient-to-r from-sakura-700 to-sea-700 bg-clip-text text-transparent">{{ title }}</span>
      </h2>
      <span v-if="subtitle" class="text-xs text-slate-500">{{ subtitle }}</span>
      <span class="text-xs text-slate-400 ml-auto">{{ items.length }} 部</span>
    </div>
    <div class="grid gap-3" style="grid-template-columns: repeat(auto-fill, minmax(150px, 1fr))">
      <SubjectCard v-for="s in items" :key="s.id" :subject="s" />
    </div>
  </section>
</template>
