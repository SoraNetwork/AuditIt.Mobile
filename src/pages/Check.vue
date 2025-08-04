<template>
  <div>
    <a-page-header title="连续盘点" @back="router.back()" />
    <div class="page-container">
      <a-form @submit.prevent="handleCheck">
        <a-form-item label="扫描或输入Short ID">
          <a-input
            ref="shortIdInputRef"
            v-model:value="shortId"
            placeholder="请扫描或输入ID后按回车"
            @press-enter="handleCheck"
            :disabled="itemStore.loading"
            allow-clear
          />
        </a-form-item>
      </a-form>

      <a-divider>最近盘点日志</a-divider>

      <div class="log-list-container">
        <a-list :data-source="checkLog" item-layout="horizontal" :locale="{ emptyText: '暂无盘点记录' }">
          <template #renderItem="{ item }">
            <a-list-item>
              <a-list-item-meta>
                <template #title>
                  <span :class="item.status === 'success' ? 'log-success' : 'log-error'">
                    {{ item.message }}
                  </span>
                </template>
                <template #description>
                  <span>ID: {{ item.shortId }} | 时间: {{ item.timestamp }}</span>
                </template>
              </a-list-item-meta>
            </a-list-item>
          </template>
        </a-list>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useItemStore } from '../stores/itemStore';
import { message } from 'ant-design-vue';
import { formatDateTime } from '../utils/formatters';

interface LogEntry {
  shortId: string;
  message: string;
  status: 'success' | 'error';
  timestamp: string;
}

const router = useRouter();
const itemStore = useItemStore();

const shortId = ref('');
const shortIdInputRef = ref<HTMLInputElement | null>(null);
const checkLog = ref<LogEntry[]>([]);

onMounted(() => {
  focusInput();
});

const focusInput = () => {
  nextTick(() => {
    shortIdInputRef.value?.focus();
  });
};

const addLog = (entry: Omit<LogEntry, 'timestamp'>) => {
  checkLog.value.unshift({
    ...entry,
    timestamp: formatDateTime(new Date().toISOString()),
  });
  // Keep the log list from growing too large
  if (checkLog.value.length > 50) {
    checkLog.value.pop();
  }
};

const handleCheck = async () => {
  if (!shortId.value || itemStore.loading) {
    return;
  }

  const currentShortId = shortId.value.trim();
  shortId.value = ''; // Clear input immediately for next scan

  try {
    // Fetch item by shortId to get its full Guid
    await itemStore.fetchItems({ shortId: currentShortId });
    const item = itemStore.items.find(i => i.shortId === currentShortId);

    if (!item) {
      const errorMessage = `物品 ${currentShortId} 未找到。`;
      message.error(errorMessage, 2);
      addLog({ shortId: currentShortId, message: errorMessage, status: 'error' });
      focusInput();
      return;
    }

    // Perform the 'check' operation
    await itemStore.updateItemStatus(item.id, 'check');
    const successMessage = `物品 ${item.itemDefinition?.name || currentShortId} 已盘点。`;
    message.success(successMessage, 2);
    addLog({ shortId: currentShortId, message: successMessage, status: 'success' });

  } catch (error: any) {
    const errorMessage = `盘点 ${currentShortId} 失败: ${error.message || '未知错误'}`;
    message.error(errorMessage, 3);
    addLog({ shortId: currentShortId, message: errorMessage, status: 'error' });
  } finally {
    focusInput();
  }
};
</script>

<style scoped>
.page-container {
  padding: 16px;
}
.log-list-container {
  max-height: calc(100vh - 250px); /* Adjust height as needed */
  overflow-y: auto;
}
.log-success {
  color: #52c41a;
}
.log-error {
  color: #ff4d4f;
}
</style>