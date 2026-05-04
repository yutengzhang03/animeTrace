<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '@/stores/auth';
import { useLibraryStore } from '@/stores/library';

const router = useRouter();
const auth = useAuthStore();
const lib = useLibraryStore();

const isRegister = ref(false);
const username = ref('');
const password = ref('');
const loading = ref(false);

async function submit() {
  if (!username.value || !password.value) {
    return ElMessage.warning('请输入用户名和密码');
  }
  loading.value = true;
  try {
    if (isRegister.value) {
      await auth.register(username.value, password.value);
      ElMessage.success('注册成功，已自动登录');
    } else {
      await auth.login(username.value, password.value);
      ElMessage.success(`欢迎回来，${auth.user.username}`);
    }
    // 登录成功后加载数据
    await Promise.all([lib.fetchAll(), lib.fetchStats()]);
    router.push('/');
  } catch (e) {
    ElMessage.error(e.message || '操作失败');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-[60vh] flex items-center justify-center">
    <div class="card p-8 w-full max-w-sm space-y-6">
      <div class="text-center space-y-2">
        <div class="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-sakura-500 to-sea-500 grid place-items-center text-white text-2xl font-bold shadow-card">番</div>
        <h1 class="text-xl font-bold">{{ isRegister ? '注册账号' : '登录番迹' }}</h1>
        <p class="text-sm text-slate-500">{{ isRegister ? '选个喜欢的用户名就行' : '登录后管理你的追番记录' }}</p>
      </div>

      <div class="space-y-4">
        <el-input
          v-model="username"
          placeholder="用户名"
          size="large"
          :prefix-icon="''"
          @keyup.enter="submit"
        >
          <template #prefix><span class="text-base">👤</span></template>
        </el-input>
        <el-input
          v-model="password"
          type="password"
          placeholder="密码"
          size="large"
          show-password
          @keyup.enter="submit"
        >
          <template #prefix><span class="text-base">🔑</span></template>
        </el-input>
        <el-button
          type="primary"
          size="large"
          class="w-full"
          :loading="loading"
          @click="submit"
        >
          {{ isRegister ? '注册' : '登录' }}
        </el-button>
      </div>

      <div class="text-center text-sm text-slate-500">
        <template v-if="isRegister">
          已有账号？
          <button class="text-sakura-700 hover:underline" @click="isRegister = false">去登录</button>
        </template>
        <template v-else>
          还没有账号？
          <button class="text-sakura-700 hover:underline" @click="isRegister = true">注册一个</button>
        </template>
      </div>
    </div>
  </div>
</template>
