<template>
  <div class="callback-container">
    <a-spin :tip="tipMessage" size="large">
      <div class="spin-content">
        <a-alert v-if="error" :message="error" type="error" show-icon />
      </div>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore';
import { message } from 'ant-design-vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const error = ref<string | null>(null);
const tipMessage = ref("正在处理授权...");

onMounted(async () => {
  const { code } = route.query;

  if (typeof code !== 'string' || !code) {
    error.value = '无效的授权码，请返回重试。';
    tipMessage.value = "授权失败";
    return;
  }

  tipMessage.value = "授权成功, 正在登录...";
  
  try {
    await authStore.loginWithDingtalkCode(code);
    message.success(`欢迎回来, ${authStore.user?.name || '用户'}!`);
    router.push('/');
  } catch (err: any) {
    error.value = err.message || '登录时发生未知错误。';
    tipMessage.value = "登录失败";
    message.error(error.value);
  }
});
</script>

<style scoped>
.callback-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}
.spin-content {
  padding: 50px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  min-width: 200px;
  text-align: center;
}
</style>
