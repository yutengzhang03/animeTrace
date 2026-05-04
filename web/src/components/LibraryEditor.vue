<script setup>
/**
 * 标记/编辑一个番在库里的状态、进度、评分、备注
 * 用 Element Plus 的 Popover 触发
 *
 * 未登录时：按钮跳转到登录页
 */
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useLibraryStore } from '@/stores/library';
import { useAuthStore } from '@/stores/auth';
import { STATUS_LIST } from '@/api';
import StatusBadge from './StatusBadge.vue';

const props = defineProps({
  subjectId: { type: Number, required: true },
  totalEps: Number,
  /** 触发器变体：'button' | 'card' */
  variant: { type: String, default: 'button' },
});

const router = useRouter();
const lib = useLibraryStore();
const auth = useAuthStore();
const row = computed(() => lib.map[props.subjectId] || null);

const open = ref(false);
const form = ref({ status: 'wish', progress: 0, rating: null, comment: '' });

function reset() {
  if (row.value) {
    form.value = {
      status: row.value.status,
      progress: row.value.progress ?? 0,
      rating: row.value.rating ?? null,
      comment: row.value.comment ?? '',
    };
  } else {
    form.value = { status: 'wish', progress: 0, rating: null, comment: '' };
  }
}

watch(open, v => { if (v) reset(); });

function trigger() {
  if (!auth.loggedIn) {
    router.push('/login');
    return;
  }
  open.value = !open.value;
}

const saving = ref(false);
async function save() {
  saving.value = true;
  try {
    await lib.upsert(props.subjectId, { ...form.value });
    ElMessage.success('已保存');
    open.value = false;
  } catch (e) {
    if (e.status === 401) {
      ElMessage.warning('登录已过期，请重新登录');
      auth.logout();
      router.push('/login');
    } else {
      ElMessage.error(e.message);
    }
  } finally {
    saving.value = false;
  }
}

async function remove() {
  saving.value = true;
  try {
    await lib.remove(props.subjectId);
    ElMessage.success('已从番库移除');
    open.value = false;
  } catch (e) {
    if (e.status === 401) {
      auth.logout();
      router.push('/login');
    } else {
      ElMessage.error(e.message);
    }
  } finally {
    saving.value = false;
  }
}

const epsHint = computed(() =>
  props.totalEps ? `共 ${props.totalEps} 话` : '',
);
</script>

<template>
  <el-popover :visible="open" placement="bottom-end" trigger="manual" :width="320" @hide="open=false">
    <template #reference>
      <button
        class="rounded-md transition border inline-flex items-center justify-center gap-1.5"
        :class="[
          variant === 'card'
            ? 'w-full px-2 py-1 text-xs'
            : 'px-3 py-1.5 text-sm',
          !auth.loggedIn
            ? 'bg-slate-50 text-slate-500 border-slate-300 hover:bg-slate-100 dark:bg-ink-900 dark:border-slate-600'
            : row
              ? 'bg-white text-ink-700 border-slate-200 hover:bg-slate-50 dark:bg-ink-900 dark:border-slate-600 dark:text-ink-100'
              : 'bg-gradient-to-r from-sakura-500 to-sea-500 text-white border-transparent hover:opacity-90',
        ]"
        @click.stop="trigger"
      >
        <template v-if="!auth.loggedIn">登录后收藏</template>
        <template v-else-if="row">
          <StatusBadge :status="row.status" />
          <span v-if="row.status==='doing'" class="text-slate-500">第 {{ row.progress || 0 }} 话</span>
        </template>
        <template v-else>+ 加入番库</template>
      </button>
    </template>

    <div class="space-y-3" @click.stop>
      <div>
        <div class="text-xs text-slate-500 mb-1.5">状态</div>
        <div class="grid grid-cols-5 gap-1.5">
          <button
            v-for="s in STATUS_LIST"
            :key="s.value"
            type="button"
            class="text-xs py-1.5 rounded border transition"
            :class="form.status === s.value
              ? 'bg-sakura-500 text-white border-sakura-500'
              : 'bg-white border-slate-200 hover:bg-slate-50 dark:bg-ink-900 dark:border-slate-600'"
            @click="form.status = s.value"
          >
            {{ s.label }}
          </button>
        </div>
      </div>

      <div>
        <div class="text-xs text-slate-500 mb-1 flex justify-between">
          <span>看到第几话</span><span class="text-slate-400">{{ epsHint }}</span>
        </div>
        <el-input-number
          v-model="form.progress"
          :min="0"
          :max="totalEps || 9999"
          controls-position="right"
          size="small"
          class="!w-full"
        />
      </div>

      <div>
        <div class="text-xs text-slate-500 mb-1">个人评分（1-10）</div>
        <div class="flex items-center gap-2">
          <el-rate
            v-model="form.rating"
            :max="10"
            show-score
            :colors="['#ffd64f','#ff7aa2','#e64f7c']"
            :allow-half="false"
          />
          <button
            v-if="form.rating"
            type="button"
            class="text-xs text-slate-400 hover:text-slate-600"
            @click="form.rating = null"
          >清除</button>
        </div>
      </div>

      <div>
        <div class="text-xs text-slate-500 mb-1">备注</div>
        <el-input v-model="form.comment" type="textarea" :rows="2" placeholder="一句话感想 / 复习计划 …" />
      </div>

      <div class="flex justify-between pt-1">
        <el-button v-if="row" size="small" type="danger" link :loading="saving" @click="remove">从番库移除</el-button>
        <span v-else></span>
        <div class="flex gap-2">
          <el-button size="small" @click="open = false">取消</el-button>
          <el-button size="small" type="primary" :loading="saving" @click="save">保存</el-button>
        </div>
      </div>
    </div>
  </el-popover>
</template>
