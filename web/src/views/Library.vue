<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useLibraryStore } from '@/stores/library';
import { STATUS_LIST } from '@/api';
import SubjectCard from '@/components/SubjectCard.vue';

const route = useRoute();
const router = useRouter();
const lib = useLibraryStore();

const status = ref(route.query.status?.toString() || 'all');
const year = ref(route.query.year?.toString() || '');
const sort = ref(route.query.sort?.toString() || 'updated');
const q = ref(route.query.q?.toString() || '');

watch([status, year, sort, q], () => {
  router.replace({
    query: {
      ...(status.value !== 'all' ? { status: status.value } : {}),
      ...(year.value ? { year: year.value } : {}),
      ...(sort.value !== 'updated' ? { sort: sort.value } : {}),
      ...(q.value ? { q: q.value } : {}),
    },
  });
});

onMounted(() => lib.fetchAll());

const filtered = computed(() => {
  let arr = lib.items;
  if (status.value !== 'all') arr = arr.filter(i => i.status === status.value);
  if (year.value) arr = arr.filter(i => i.subject.air_year === Number(year.value));
  if (q.value.trim()) {
    const k = q.value.trim().toLowerCase();
    arr = arr.filter(i =>
      (i.subject.name || '').toLowerCase().includes(k) ||
      (i.subject.name_cn || '').toLowerCase().includes(k),
    );
  }
  // 排序
  const cmp = {
    updated: (a, b) => b.updated_at - a.updated_at,
    rating:  (a, b) => (b.rating || 0) - (a.rating || 0) || (b.updated_at - a.updated_at),
    score:   (a, b) => (b.subject.rating_score || 0) - (a.subject.rating_score || 0),
    year:    (a, b) => (b.subject.air_year || 0) - (a.subject.air_year || 0),
    name:    (a, b) => (a.subject.name_cn || a.subject.name || '').localeCompare(b.subject.name_cn || b.subject.name || ''),
  }[sort.value] || ((a, b) => b.updated_at - a.updated_at);
  return [...arr].sort(cmp);
});

const years = computed(() => {
  const set = new Set(lib.items.map(i => i.subject.air_year).filter(Boolean));
  return Array.from(set).sort((a, b) => b - a);
});

const counts = computed(() => {
  const c = { all: lib.items.length };
  for (const s of STATUS_LIST) c[s.value] = lib.items.filter(i => i.status === s.value).length;
  return c;
});
</script>

<template>
  <div class="space-y-5">
    <h1 class="text-2xl font-bold">我的番库</h1>

    <!-- 状态切换 tabs -->
    <div class="card p-3 flex flex-wrap gap-2 items-center">
      <button
        class="px-3 py-1.5 rounded-md text-sm transition"
        :class="status === 'all' ? 'bg-sakura-500 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'"
        @click="status = 'all'"
      >全部 <span class="opacity-70">{{ counts.all }}</span></button>
      <button
        v-for="s in STATUS_LIST"
        :key="s.value"
        class="px-3 py-1.5 rounded-md text-sm transition"
        :class="status === s.value ? 'bg-sakura-500 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'"
        @click="status = s.value"
      >
        {{ s.label }} <span class="opacity-70">{{ counts[s.value] || 0 }}</span>
      </button>
      <div class="flex-1"></div>
      <el-input v-model="q" size="small" placeholder="按名称搜索" clearable style="width: 200px" />
      <el-select v-model="year" size="small" placeholder="全部年份" clearable style="width: 110px">
        <el-option v-for="y in years" :key="y" :label="y + ' 年'" :value="String(y)" />
      </el-select>
      <el-select v-model="sort" size="small" style="width: 130px">
        <el-option label="最近更新" value="updated" />
        <el-option label="我的评分" value="rating" />
        <el-option label="番组评分" value="score" />
        <el-option label="放送年份" value="year" />
        <el-option label="名称排序" value="name" />
      </el-select>
    </div>

    <!-- 列表 -->
    <div v-if="!filtered.length" class="text-center py-16 text-slate-400 card">
      此分类暂无番剧 · <RouterLink to="/search" class="text-sakura-700 hover:underline">去搜索添加</RouterLink>
    </div>
    <div v-else class="grid gap-3" style="grid-template-columns: repeat(auto-fill, minmax(170px, 1fr))">
      <SubjectCard
        v-for="it in filtered"
        :key="it.subject_id"
        :subject="{ ...it.subject, library: it }"
      />
    </div>
  </div>
</template>
