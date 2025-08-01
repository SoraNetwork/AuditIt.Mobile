<template>
  <div>
    <a-page-header title="物品操作" />
    <div class="page-container">
      <a-radio-group v-model:value="inputMode" button-style="solid" style="margin-bottom: 16px; width: 100%;">
        <a-radio-button value="scan" style="width: 50%; text-align: center;">扫码输入</a-radio-button>
        <a-radio-button value="manual" style="width: 50%; text-align: center;">手动输入</a-radio-button>
      </a-radio-group>

      <!-- Scan Mode -->
      <div v-if="inputMode === 'scan'">
        <div v-show="!selectedItem && !scanError" id="reader" ref="readerRef"></div>
        <div class="controls" v-if="!selectedItem">
          <a-button @click="startScan" :disabled="isScanning">开始扫描</a-button>
          <a-button @click="stopScan" :disabled="!isScanning" danger>停止扫描</a-button>
        </div>
      </div>

      <!-- Manual Mode -->
      <div v-if="inputMode === 'manual' && !selectedItem">
        <a-form>
          <a-form-item label="通过物品ID查找">
            <a-input-search
              v-model:value="manualId"
              placeholder="输入物品短ID"
              enter-button="查找"
              @search="onManualSearch"
            />
          </a-form-item>
        </a-form>
      </div>

      <!-- Feedback Area (Loading, Error) -->
      <div v-if="itemStore.loading" class="feedback-container">
        <a-spin size="large" tip="正在获取物品信息..." />
      </div>
      <div v-if="scanError && !itemStore.loading" class="feedback-container">
        <a-alert message="错误" :description="scanError" type="error" show-icon>
          <template #action>
            <a-button size="small" type="primary" @click="reset">重试</a-button>
          </template>
        </a-alert>
      </div>

      <!-- Selected Item Details and Actions -->
      <div v-if="selectedItem && !itemStore.loading" class="item-details">
        <a-card :title="selectedItem.itemDefinition?.name || '未知物品'">
          <a-descriptions bordered :column="1">
            <a-descriptions-item label="短ID">{{ selectedItem.shortId }}</a-descriptions-item>
            <a-descriptions-item label="状态">
              <a-badge :status="getStatusColor(selectedItem.status)" :text="getStatusText(selectedItem.status)" />
            </a-descriptions-item>
            <a-descriptions-item label="仓库">{{ selectedItem.warehouse?.name }}</a-descriptions-item>
          </a-descriptions>
          
          <div class="action-buttons">
            <h3>待操作列表</h3>
            <a-button v-if="selectedItem.status === 'InStock'" @click="handleAction('outbound')" block>借出</a-button>
            <a-button v-if="selectedItem.status === 'LoanedOut'" @click="handleAction('return')" block>归还</a-button>
            <a-button @click="handleAction('check')" block>盘点</a-button>
            <a-button v-if="selectedItem.status !== 'Disposed'" @click="handleAction('dispose')" danger block>处置</a-button>
            <a-divider />
            <a-button @click="reset" block>查找下一个</a-button>
          </div>
        </a-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { Html5Qrcode } from 'html5-qrcode';
import { useItemStore, type Item, type ItemStatus } from '../stores/itemStore';
import { message } from 'ant-design-vue';

const itemStore = useItemStore();
let html5Qrcode: Html5Qrcode | null = null;

const inputMode = ref<'scan' | 'manual'>('scan');
const manualId = ref('');
const isScanning = ref(false);
const selectedItem = ref<Item | null>(null);
const scanError = ref<string | null>(null);
const readerRef = ref<HTMLElement | null>(null);

const startScan = () => {
  if (!readerRef.value) {
    // Defer to next tick if element not ready
    setTimeout(startScan, 100);
    return;
  }
  if (!html5Qrcode) {
    html5Qrcode = new Html5Qrcode(readerRef.value.id);
  }
  
  reset();

  const config = { fps: 10, qrbox: { width: 250, height: 250 } };
  const onScanSuccess = async (decodedText: string) => {
    stopScan();
    await fetchItemByShortId(decodedText);
  };

  html5Qrcode.start({ facingMode: "environment" }, config, onScanSuccess, undefined)
    .then(() => { isScanning.value = true; })
    .catch(_err => { scanError.value = "无法启动摄像头。请检查权限。"; });
};

const stopScan = () => {
  if (html5Qrcode && isScanning.value) {
    html5Qrcode.stop().then(() => { isScanning.value = false; });
  }
};

const onManualSearch = (searchValue: string) => {
  if (!searchValue) return;
  fetchItemByShortId(searchValue);
};

const fetchItemByShortId = async (shortId: string) => {
  await itemStore.fetchItems({ shortId });
  if (itemStore.items.length > 0) {
    selectedItem.value = itemStore.items[0];
  } else {
    scanError.value = `未找到ID为 "${shortId}" 的物品。`;
  }
};

const handleAction = async (action: 'outbound' | 'return' | 'check' | 'dispose') => {
  if (!selectedItem.value) return;
  try {
    await itemStore.updateItemStatus(selectedItem.value.id, action);
    message.success(`操作成功: ${action}`);
    await fetchItemByShortId(selectedItem.value.shortId); // Refresh data
  } catch (error) {
    message.error('操作失败');
  }
};

const reset = () => {
  selectedItem.value = null;
  scanError.value = null;
  manualId.value = '';
  itemStore.items = [];
};

watch(inputMode, (newMode) => {
  if (newMode === 'scan') {
    startScan();
  } else {
    stopScan();
  }
});

onMounted(() => {
  if (inputMode.value === 'scan') {
    startScan();
  }
});

onBeforeUnmount(() => {
  stopScan();
});

// Helper functions for status display
const getStatusColor = (status: ItemStatus) => {
  switch (status) {
    case 'InStock': return 'success';
    case 'LoanedOut': return 'warning';
    case 'Disposed': return 'error';
    default: return 'default';
  }
};
const getStatusText = (status: ItemStatus) => {
  switch (status) {
    case 'InStock': return '在库';
    case 'LoanedOut': return '已借出';
    case 'Disposed': return '已处置';
    default: return '未知';
  }
};
</script>

<style scoped>
.page-container { padding: 16px; }
#reader { width: 100%; border: 1px solid #f0f0f0; border-radius: 8px; }
.controls { display: flex; gap: 16px; margin-top: 16px; justify-content: center; }
.feedback-container { margin-top: 24px; text-align: center; }
.item-details { margin-top: 16px; }
.action-buttons { margin-top: 24px; display: flex; flex-direction: column; gap: 8px; }
</style>