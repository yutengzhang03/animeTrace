<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { apiSearch } from '@/api';
import SubjectCard from '@/components/SubjectCard.vue';

const route = useRoute();
const router = useRouter();

const q = ref(route.query.q?.toString() || '');
const loading = ref(false);
const results = ref([]);
const total = ref(0);
const searched = ref(false);

async function doSearch() {
  if (!q.value.trim()) return;
  loading.value = true;
  try {
    router.replace({ query: { q: q.value } });
    const r = await apiSearch(q.value, { limit: 30 });
    results.value = r.data;
    total.value = r.total;
    searched.value = true;
  } catch (e) {
    ElMessage.error(e.message);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (q.value) doSearch();
});

watch(() => route.query.q, v => {
  if (v && v !== q.value) {
    q.value = v.toString();
    doSearch();
  }
});
</script>

<template>
  <div class="space-y-6">
    <div class="card p-4 sm:p-6">
      <h1 class="text-xl font-semibold mb-3">搜索番剧</h1>
      <el-input
        v-model="q"
        placeholder="番名、关键字（中/日/英都行）"
        size="large"
        clearable
        @keyup.enter="doSearch"
      >
        <template #prefix>🔍</template>
        <template #append>
          <el-button type="primary" :loading="loading" @click="doSearch">搜索</el-button>
        </template>
      </el-input>
      <p class="text-xs text-slate-400 mt-2">来源：Bangumi 番组计划 · 仅返回动画类目</p>
    </div>

    <div v-if="loading" class="text-center py-10 text-slate-500">
      <span class="inline-block w-4 h-4 mr-2 border-2 border-sakura-500 border-t-transparent rounded-full animate-spin align-middle"></span>
      搜索中…
    </div>

    <div v-else-if="searched">
      <div class="text-sm text-slate-500 mb-3">命中 <b class="text-ink-900 dark:text-ink-100">{{ total }}</b> 部，展示前 {{ results.length }} 部</div>
      <div v-if="!results.length" class="text-center py-12 text-slate-400">
        没找到匹配的番，换个关键词试试？
      </div>
      <div v-else class="grid gap-3" style="grid-template-columns: repeat(auto-fill, minmax(150px, 1fr))">
        <SubjectCard v-for="s in results" :key="s.id" :subject="s" />
      </div>
    </div>

    <div v-else class="text-center py-16 text-slate-400">
      输入番名开始搜索 · 例如《Re：从零开始的异世界生活》《刀剑神域》《鬼灭之刃》
    </div>
  </div>
</template>
