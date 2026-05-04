<script setup>
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';
import { useThemeStore } from '@/stores/theme';
import { useLibraryStore } from '@/stores/library';
import { useAuthStore } from '@/stores/auth';
import { apiLibraryUpsert } from '@/api';

const router = useRouter();
const theme = useThemeStore();
const lib = useLibraryStore();
const auth = useAuthStore();

const themeOptions = [
  { value: 'auto', label: '跟随系统' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '暗色' },
];

// 批量录入：每行一个 Bangumi subject_id（可选附 ":状态"）
const bulkText = ref('');
const bulkStatus = ref('wish');
const bulking = ref(false);

async function bulkImport() {
  const lines = bulkText.value.split('\n').map(s => s.trim()).filter(Boolean);
  if (!lines.length) return ElMessage.warning('请先粘贴 Bangumi subject_id');
  bulking.value = true;
  let ok = 0, fail = 0;
  for (const line of lines) {
    const m = line.match(/^(\d+)\s*[: ]?\s*(\w+)?/);
    if (!m) { fail++; continue; }
    const id = Number(m[1]);
    const status = m[2] || bulkStatus.value;
    try {
      await apiLibraryUpsert(id, { status });
      ok++;
    } catch {
      fail++;
    }
  }
  bulking.value = false;
  await lib.fetchAll();
  await lib.fetchStats();
  ElMessage.success(`完成：成功 ${ok} 条，失败 ${fail} 条`);
  bulkText.value = '';
}

// 导出 JSON
function exportJson() {
  const blob = new Blob([JSON.stringify(lib.items, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fanji-library-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function logout() {
  auth.logout();
  lib.$reset();
  router.push('/login');
  ElMessage.success('已退出登录');
}
</script>

<template>
  <div class="space-y-6 max-w-2xl">
    <h1 class="text-2xl font-bold">设置</h1>

    <!-- 当前账号 -->
    <section class="card p-5 space-y-3">
      <h2 class="font-semibold">账号</h2>
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm">当前用户：<b>{{ auth.user?.username }}</b></p>
        </div>
        <el-button size="small" @click="logout">退出登录</el-button>
      </div>
    </section>

    <section class="card p-5 space-y-3">
      <h2 class="font-semibold">主题</h2>
      <el-radio-group v-model="theme.mode" @change="theme.set(theme.mode)">
        <el-radio-button v-for="o in themeOptions" :key="o.value" :value="o.value">{{ o.label }}</el-radio-button>
      </el-radio-group>
    </section>

    <section class="card p-5 space-y-3">
      <h2 class="font-semibold">批量录入</h2>
      <p class="text-xs text-slate-500">
        每行一个 Bangumi subject_id（番剧详情页 URL 末尾的数字）。可附状态：<code>12345 doing</code> 或 <code>12345:done</code>。
      </p>
      <el-input
        v-model="bulkText"
        type="textarea"
        :rows="6"
        placeholder="例如：&#10;253&#10;9717 doing&#10;103272:done"
      />
      <div class="flex items-center gap-3">
        <span class="text-sm text-slate-500">默认状态：</span>
        <el-select v-model="bulkStatus" size="small" style="width: 120px">
          <el-option label="想看" value="wish" />
          <el-option label="在看" value="doing" />
          <el-option label="看过" value="done" />
          <el-option label="搁置" value="on_hold" />
          <el-option label="弃番" value="dropped" />
        </el-select>
        <el-button type="primary" :loading="bulking" @click="bulkImport">开始录入</el-button>
      </div>
    </section>

    <section class="card p-5 space-y-3">
      <h2 class="font-semibold">数据</h2>
      <div class="flex gap-3">
        <el-button @click="exportJson">导出番库为 JSON</el-button>
      </div>
    </section>

    <section class="card p-5 space-y-2 text-sm">
      <h2 class="font-semibold">关于</h2>
      <p class="text-slate-600 dark:text-slate-300">
        番迹 · 个人追番管理 v0.2。数据来源 Bangumi 番组计划，SQLite 存储，多用户支持。
      </p>
    </section>
  </div>
</template>
