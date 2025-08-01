import { defineStore } from 'pinia';
import * as dd from 'dingtalk-jsapi';
import apiClient from '../services/api';
import router from '../router';

interface AuthState {
  token: string | null;
  user: Record<string, any> | null;
}

// 可靠的环境判断
const isDingtalk = /DingTalk/.test(navigator.userAgent);

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: localStorage.getItem('token'),
    user: JSON.parse(localStorage.getItem('user') || 'null'),
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
  },
  actions: {
    // 统一的登录入口
    async login() {
      if (isDingtalk) {
        return this.loginWithDingtalkH5();
      } else {
        return this.redirectToDingtalkOAuth();
      }
    },

    // H5 免密登录 (钉钉环境内)
    async loginWithDingtalkH5() {
      return new Promise<void>((resolve, reject) => {
        dd.ready(() => {
          const corpId = import.meta.env.VITE_DINGTALK_CORP_ID;
          if (!corpId) return reject(new Error('钉钉 CorpId 未配置!'));

          dd.runtime.permission.requestAuthCode({
            corpId: corpId
          }).then((result: { code: string }) => {
            this.handleAuthSuccess(result.code).then(resolve).catch(reject);
          }).catch((err: any) => {
            reject(new Error(`钉钉H5授权失败: ${JSON.stringify(err)}`));
          });
        });
        dd.error((err: any) => {
            reject(new Error(`钉钉JSAPI配置错误: ${JSON.stringify(err)}`));
        });
      });
    },

    // OAuth 重定向 (钉钉环境外)
    redirectToDingtalkOAuth() {
      const clientId = import.meta.env.VITE_DINGTALK_APP_KEY;
      if (!clientId) {
        throw new Error('钉钉 AppKey 未配置!');
      }
      const redirectUri = encodeURIComponent(`${window.location.origin}/dingtalk-oauth`);
      const oauthUrl = `https://login.dingtalk.com/oauth2/auth?redirect_uri=${redirectUri}&response_type=code&client_id=${clientId}&scope=openid&state=STATE&prompt=consent`;
      window.location.href = oauthUrl;
    },
    
    // 调用后端验证并设置Token
    async handleAuthSuccess(code: string) {
      try {
        const response = await apiClient.post('/auth/dingtalk-login', { code });
        const { token, user } = response.data;

        this.token = token;
        this.user = user;

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
      } catch (error) {
        console.error('钉钉登录失败:', error);
        // 可选：在这里处理登录失败的逻辑
        throw error; // 抛出错误，以便调用者可以捕获它
      }
    },

    // 从回调页面调用
    async loginWithDingtalkCode(code: string) {
      await this.handleAuthSuccess(code);
      // 登录成功后，跳转到主页
      router.push('/');
    },

    logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/login');
    },
  },
});
