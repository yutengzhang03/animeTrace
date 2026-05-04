<script setup>
import { computed } from 'vue';
import { useLibraryStore } from '@/stores/library';
import { useRouter } from 'vue-router';
import StatusBadge from './StatusBadge.vue';
import LibraryEditor from './LibraryEditor.vue';

const props = defineProps({
  subject: { type: Object, required: true },
  /** 是否带"详情"链接（默认开） */
  linkable: { type: Boolean, default: true },
  /** 简版：横向小卡 */
  compact: { type: Boolean, default: false },
  /** 卡片底部是否显示"加入番库/改状态"按钮（默认开） */
  showEditor: { type: Boolean, default: true },
});

const router = useRouter();
const lib = useLibraryStore();
const libRow = computed(() => lib.map[props.subject.id] || props.subject.library || null);

const cover = computed(
  () => props.subject.image || props.subject.images?.large || props.subject.images?.common || ''
);

const title = computed(
  () => props.subject.name_cn?.trim() || props.subject.name || '未命名',
);
const subtitle = computed(() =>
  props.subject.name_cn?.trim() && props.subject.name && props.subject.name_cn !== props.subject.name
    ? props.subject.name
    : '',
);

function goDetail() {
  if (!props.linkable) return;
  router.push(`/subject/${props.subject.id}`);
}
</script>

<template>
  <div
    class="card flex transition hover:shadow-md cursor-pointer"
    :class="compact ? 'flex-row gap-3 p-2' : 'flex-col'"
    @click="goDetail"
  >
    <div
      class="cover-placeholder relative flex-none overflow-hidden"
      :class="compact ? 'w-16 aspect-[3/4] rounded-md' : 'aspect-[3/4] rounded-t-xl'"
    >
      <img
        v-if="cover"
        :src="cover"
        :alt="title"
        class="w-full h-full object-cover"
        loading="lazy"
        referrerpolicy="no-referrer"
      />
      <div v-if="libRow" class="absolute top-1 left-1">
        <StatusBadge :status="libRow.status" />
      </div>
      <div
        v-if="subject.platform && !compact"
        class="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-black/50 text-white backdrop-blur"
      >
        {{ subject.platform }}
      </div>
    </div>
    <div :class="compact ? 'flex-1 min-w-0' : 'p-3'">
      <h3 class="font-medium text-sm leading-snug line-clamp-2" :title="title">{{ title }}</h3>
      <p v-if="subtitle" class="text-xs text-slate-500 mt-0.5 line-clamp-1" :title="subtitle">{{ subtitle }}</p>
      <div class="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
        <span v-if="subject.air_year">{{ subject.air_year }}</span>
        <span v-if="subject.eps">· {{ subject.eps }}话</span>
        <span v-if="subject.rating?.score || subject.rating_score" class="ml-auto text-amber-600 font-medium">
          ★ {{ (subject.rating?.score || subject.rating_score).toFixed(1) }}
        </span>
      </div>
      <div v-if="libRow && libRow.status === 'doing' && libRow.progress != null" class="mt-1.5 text-xs text-sea-700">
        进度 {{ libRow.progress }}{{ subject.eps || subject.total_episodes ? ` / ${subject.eps || subject.total_episodes}` : '' }}
      </div>
      <div v-if="showEditor && !compact" class="mt-2" @click.stop>
        <LibraryEditor
          :subject-id="subject.id"
          :total-eps="subject.total_episodes || subject.eps"
          variant="card"
        />
      </div>
    </div>
  </div>
</template>
