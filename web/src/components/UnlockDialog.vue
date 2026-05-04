<script setup>
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '@/stores/auth';

const props = defineProps({ visible: Boolean });
const emit = defineEmits(['update:visible']);

const auth = useAuthStore();
const pwd = ref('');
const loading = ref(false);

watch(() => props.visible, v => { if (v) pwd.value = ''; });

async function submit() {
  if (!pwd.value) return;
  loading.value = true;
  const ok = await auth.unlock(pwd.value);
  loading.value = false;
  if (ok) {
    ElMessage.success('已解锁，现在可以编辑了');
    emit('update:visible', false);
  } else {
    ElMessage.error('口令不正确');
  }
}

function close() {
  emit('update:visible', false);
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="emit('update:visible', $event)"
    title="🔒 解锁编辑"
    width="380px"
    :close-on-click-modal="false"
    align-center
  >
    <p class="text-sm text-slate-500 mb-3">
      这个站启用了密码保护。输入站长设的口令后才能添加/修改追番记录。
    </p>
    <el-input
      v-model="pwd"
      type="password"
      placeholder="输入口令"
      show-password
      autofocus
      @keyup.enter="submit"
    />
    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :loading="loading" @click="submit">解锁</el-button>
    </template>
  </el-dialog>
</template>
