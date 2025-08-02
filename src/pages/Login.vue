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
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/authStore';
import { message } from 'ant-design-vue';
import * as dd from 'dingtalk-jsapi';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const error = ref<string | null>(null);
const tip = ref("正在初始化登录流程...");

// 判断是否在钉钉环境
const isDingtalkEnvironment = /DingTalk/.test(navigator.userAgent);

const handleLogin = async () => {
  if (authStore.isAuthenticated) {
    router.push('/');
    return;
  }

  try {
    // 优先处理 SSO 回调，尽管在移动端不常见
    const { code } = route.query;
    if (typeof code === 'string' && code) {
      tip.value = "检测到授权信息，正在登录...";
      await authStore.loginWithSsoCode(code);
      message.success(`欢迎回来, ${authStore.user?.name}!`);
      return;
    }

    // 主要逻辑：钉钉客户端内免登
    if (isDingtalkEnvironment) {
      tip.value = "检测到钉钉环境，正在自动登录...";
      const corpId = import.meta.env.VITE_DINGTALK_CORP_ID;
      if (!corpId) throw new Error('钉钉 CorpId 未在 .env.local 中配置');
      
      dd.ready(async () => {
        const result = await dd.runtime.permission.requestAuthCode({ corpId });
        await authStore.loginWithLegacyCode(result.code);
        message.success(`欢迎回来, ${authStore.user?.name}!`);
      });
      dd.error((err: any) => {
        throw new Error(`钉钉JSAPI配置错误: ${JSON.stringify(err)}`);
      });
    } else {
      // 在移动端，如果不在钉钉环境，则显示错误，因为我们不期望用户从外部浏览器访问
      throw new Error("请在钉钉客户端内打开此应用。");
    }
  } catch (err: any) {
    error.value = err.message;
    tip.value = "登录失败";
    message.error(err.message);
  }
};

onMounted(() => {
  handleLogin();
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
