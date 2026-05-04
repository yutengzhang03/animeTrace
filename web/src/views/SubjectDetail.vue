<script setup>
import { ref, watch, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { apiSubject, apiSeries } from '@/api';
import LibraryEditor from '@/components/LibraryEditor.vue';
import SeriesBucket from '@/components/SeriesBucket.vue';

const route = useRoute();
const id = computed(() => Number(route.params.id));

const subject = ref(null);
const series = ref(null);
const loading = ref(false);
const seriesLoading = ref(false);

async function load() {
  if (!id.value) return;
  loading.value = true;
  series.value = null;
  try {
    subject.value = await apiSubject(id.value);
  } catch (e) {
    ElMessage.error(e.message);
  } finally {
    loading.value = false;
  }
  // 系列归集走另一条请求，可能稍慢
  seriesLoading.value = true;
  try {
    series.value = await apiSeries(id.value);
  } catch (e) {
    // 系列归集失败不致命，静默
    console.warn('series fetch failed', e);
  } finally {
    seriesLoading.value = false;
  }
}

watch(() => id.value, load, { immediate: false });
onMounted(load);

const cover = computed(() => subject.value?.image || subject.value?.images?.large);
const title = computed(() => subject.value?.name_cn?.trim() || subject.value?.name);
const altTitle = computed(() =>
  subject.value?.name_cn?.trim() && subject.value.name_cn !== subject.value.name
    ? subject.value.name : '',
);
</script>

<template>
  <div v-if="loading" class="text-center py-20 text-slate-400">加载中…</div>

  <div v-else-if="subject" class="space-y-8">
    <!-- 头部 -->
    <div class="card p-4 sm:p-6 flex flex-col sm:flex-row gap-6">
      <div class="cover-placeholder w-40 sm:w-48 aspect-[3/4] flex-none rounded-lg overflow-hidden self-start mx-auto sm:mx-0 shadow-card">
        <img v-if="cover" :src="cover" class="w-full h-full object-cover" referrerpolicy="no-referrer"/>
      </div>
      <div class="flex-1 min-w-0 space-y-3">
        <div>
          <h1 class="text-2xl font-bold leading-tight">{{ title }}</h1>
          <p v-if="altTitle" class="text-slate-500 mt-0.5">{{ altTitle }}</p>
        </div>
        <div class="flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-300">
          <span v-if="subject.platform" class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">{{ subject.platform }}</span>
          <span v-if="subject.air_date">📅 {{ subject.air_date }}</span>
          <span v-if="subject.eps">▦ {{ subject.eps }} 话</span>
          <span v-if="subject.rating?.score" class="text-amber-600 font-medium">★ {{ subject.rating.score.toFixed(1) }}（{{ subject.rating.total }} 人评）</span>
          <span v-if="subject.rating?.rank">Bangumi #{{ subject.rating.rank }}</span>
        </div>
        <div v-if="subject.tags?.length" class="flex flex-wrap gap-1.5">
          <span
            v-for="t in subject.tags.slice(0, 12)"
            :key="t.name || t"
            class="text-xs px-2 py-0.5 rounded-full bg-sakura-100/60 text-sakura-700"
          >{{ t.name || t }}</span>
        </div>
        <p v-if="subject.summary" class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-6 whitespace-pre-line">
          {{ subject.summary }}
        </p>

        <div class="flex gap-3 pt-2">
          <LibraryEditor :subject-id="subject.id" :total-eps="subject.eps" />
          <a
            class="text-xs text-slate-500 self-center hover:underline"
            :href="`https://bgm.tv/subject/${subject.id}`"
            target="_blank" rel="noreferrer"
          >Bangumi 原页 ↗</a>
        </div>
      </div>
    </div>

    <!-- 系列归集 -->
    <div v-if="seriesLoading" class="text-center py-6 text-slate-400 text-sm">系列归集中…</div>
    <template v-else-if="series">
      <SeriesBucket title="TV / 主线" :items="series.buckets.main" subtitle="正篇与续集，按放送时间排序" />
      <SeriesBucket title="剧场版" :items="series.buckets.movie" />
      <SeriesBucket title="OVA / OAD" :items="series.buckets.ova" />
      <SeriesBucket title="特别篇 / 番外" :items="series.buckets.special" />
      <SeriesBucket title="其他衍生" :items="series.buckets.other" />
    </template>
  </div>

  <div v-else class="text-center py-20 text-slate-400">没找到这部番</div>
</template>
