<script setup>
import { computed } from 'vue';
import { STATUS_LIST } from '@/api';

const props = defineProps({ status: String, size: { type: String, default: 'sm' } });

const cfg = computed(() => STATUS_LIST.find(s => s.value === props.status));

const colorClass = computed(() => {
  const c = cfg.value?.color || 'gray';
  return {
    sakura: 'bg-sakura-100 text-sakura-700 ring-sakura-300/50',
    sea:    'bg-sea-100 text-sea-700 ring-sea-300/50',
    green:  'bg-emerald-100 text-emerald-700 ring-emerald-300/50',
    amber:  'bg-amber-100 text-amber-700 ring-amber-300/50',
    gray:   'bg-slate-100 text-slate-600 ring-slate-300/50',
  }[c];
});
</script>

<template>
  <span
    v-if="cfg"
    class="inline-flex items-center gap-1 rounded-full ring-1 font-medium"
    :class="[colorClass, size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1']"
  >
    <span>{{ cfg.icon }}</span>{{ cfg.label }}
  </span>
</template>
