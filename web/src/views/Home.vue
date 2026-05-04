<script setup>
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useLibraryStore } from '@/stores/library';
import { STATUS_LIST } from '@/api';
import SubjectCard from '@/components/SubjectCard.vue';

const router = useRouter();
const lib = useLibraryStore();
onMounted(() => { lib.fetchStats(); lib.fetchAll(); });

function bySection(status) {
  return lib.items.filter(i => i.status === status).slice(0, 8).map(i => ({ ...i.subject, library: i }));
}

const sections = computed(() => [
  { key: 'doing',   title: '在追', color: 'sea',    items: bySection('doing') },
  { key: 'wish',    title: '想看', color: 'sakura', items: bySection('wish') },
  { key: 'done',    title: '看过', color: 'green',  items: bySection('done') },
  { key: 'on_hold', title: '搁置', color: 'amber',  items: bySection('on_hold') },
]);

const total = computed(() => lib.stats?.totals?.total || 0);
const watchedEps = computed(() => lib.stats?.totals?.watched_episodes || 0);
const avgRating = computed(() => lib.stats?.totals?.avg_rating || '—');
const counts = computed(() => lib.stats?.counts || {});
</script>

<template>
  <div class="space-y-8">
    <!-- 欢迎条 -->
    <div class="card p-6 sm:p-8 bg-gradient-to-br from-sakura-100 via-white to-sea-100 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800">
      <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">追番时刻 ✦</h1>
          <p class="text-sm text-slate-500 mt-1">
            收录 <b class="text-ink-900 dark:text-ink-100">{{ total }}</b> 部番剧 · 共看了
            <b class="text-ink-900 dark:text-ink-100">{{ watchedEps }}</b> 话 ·
            平均评分 <b class="text-amber-600">{{ avgRating }}</b>
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="s in STATUS_LIST"
            :key="s.value"
            class="px-3 py-1.5 rounded-md text-xs bg-white dark:bg-ink-900 shadow-card transition hover:scale-105"
            @click="router.push(`/library?status=${s.value}`)"
          >
            <span class="text-slate-500">{{ s.label }}</span>
            <b class="ml-1.5">{{ counts[s.value] || 0 }}</b>
          </button>
        </div>
      </div>
      <div class="mt-5 flex gap-2">
        <el-input
          placeholder="想找什么番？《鬼灭》《SAO》《命运石之门》…"
          @keyup.enter="e => router.push({ path: '/search', query: { q: e.target.value }})"
        >
          <template #prefix>🔍</template>
          <template #append>
            <el-button @click="router.push('/search')">去搜索</el-button>
          </template>
        </el-input>
      </div>
    </div>

    <!-- 各分组预览 -->
    <section v-for="sec in sections" :key="sec.key" class="space-y-3">
      <div class="flex items-baseline gap-3">
        <h2 class="text-lg font-semibold">{{ sec.title }}</h2>
        <span class="text-xs text-slate-400">{{ counts[sec.key] || 0 }} 部</span>
        <button
          v-if="(counts[sec.key] || 0) > sec.items.length"
          class="ml-auto text-xs text-sea-700 hover:underline"
          @click="router.push(`/library?status=${sec.key}`)"
        >全部 →</button>
      </div>
      <div v-if="!sec.items.length" class="text-sm text-slate-400 py-6 text-center bg-white dark:bg-ink-900 rounded-xl">
        暂无 · <RouterLink to="/search" class="text-sakura-700 hover:underline">去搜索一部</RouterLink>
      </div>
      <div v-else class="grid gap-3" style="grid-template-columns: repeat(auto-fill, minmax(150px, 1fr))">
        <SubjectCard v-for="s in sec.items" :key="s.id" :subject="s" />
      </div>
    </section>
  </div>
</template>
