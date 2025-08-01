<template>
  <div class="login-container">
    <a-spin :tip="tip" size="large">
      <div class="content">
        <img src="/vite.svg" alt="logo" class="logo" />
        <h1>SoraAuditIt 盘点系统</h1>
        <p v-if="error" class="error-message">{{ error }}</p>
      </div>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore';
import { message } from 'ant-design-vue';

const router = useRouter();
const authStore = useAuthStore();
const error = ref<string | null>(null);
const tip = ref("正在初始化登录流程...");

onMounted(async () => {
  if (authStore.isAuthenticated) {
    router.push('/');
    return;
  }
  
  try {
    await authStore.login();
    // 如果是H5登录，此时已经拿到token
    if (authStore.isAuthenticated) {
      message.success(`登录成功, 欢迎您 ${authStore.user?.name}!`);
      router.push('/');
    }
    // 如果是OAuth重定向，页面会跳转，这里的代码不会执行
  } catch (err: any) {
    error.value = err.message;
    tip.value = "登录失败";
    message.error(err.message);
  }
});
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  height: 100vh;
  background-color: #f0f2f5;
}
.content { padding: 2rem; }
.logo { height: 64px; margin-bottom: 1.5rem; }
.error-message { color: #ff4d4f; margin-top: 1rem; }
</style>