import { defineStore } from 'pinia';
import apiClient from '../services/api';
import router from '../router';

interface User {
  id: string;
  name: string;
  dingTalkId: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: localStorage.getItem('token'),
    user: JSON.parse(localStorage.getItem('user') || 'null'),
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
  },
  actions: {
    /**
     * 使用钉钉客户端内免登授权码登录
     * @param code - dd.runtime.permission.requestAuthCode 获取的免登码
     */
    async loginWithLegacyCode(code: string) {
      try {
        const response = await apiClient.post('/auth/dingtalk-login', { code });
        this.setAuthData(response.data.token, response.data.user);
        router.push('/');
      } catch (error) {
        console.error('钉钉免登登录失败:', error);
        this.clearAuthData();
        throw error;
      }
    },

    /**
     * 使用钉钉 SSO 扫码或账号密码登录的授权码登录
     * @param code - SSO 回调 URL 中的授权码
     */
    async loginWithSsoCode(code: string) {
      try {
        const response = await apiClient.post('/auth/dingtalk-sso-login', { code });
        this.setAuthData(response.data.token, response.data.user);
        router.push('/');
      } catch (error) {
        console.error('钉钉 SSO 登录失败:', error);
        this.clearAuthData();
        throw error;
      }
    },

    /**
     * 设置并持久化认证信息
     */
    setAuthData(token: string, user: User) {
      this.token = token;
      this.user = user;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    },

    /**
     * 清除认证信息
     */
    clearAuthData() {
      this.token = null;
      this.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },

    /**
     * 登出
     * @param redirect - 是否重定向到登录页
     */
    logout(redirect = true) {
      this.clearAuthData();
      if (redirect) {
        router.push('/login');
      }
    },
  },
});
