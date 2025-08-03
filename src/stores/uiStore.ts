import { defineStore } from 'pinia';
import { ref, readonly } from 'vue';

interface Notification {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

export const useUiStore = defineStore('ui', () => {
  const isLoading = ref(false);
  const notification = ref<Notification | null>(null);

  function startLoading() {
    isLoading.value = true;
  }

  function stopLoading() {
    isLoading.value = false;
  }

  function showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
    notification.value = { show: true, message, type };
  }

  function hideNotification() {
    notification.value = null;
  }

  return { 
    isLoading: readonly(isLoading), 
    notification: readonly(notification),
    startLoading, 
    stopLoading, 
    showNotification, 
    hideNotification 
  };
});