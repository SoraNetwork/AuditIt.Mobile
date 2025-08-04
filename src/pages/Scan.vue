<template>
  <div>
    <a-page-header title="物品操作" />
    <div class="page-container">
      <a-radio-group v-model:value="inputMode" button-style="solid" style="margin-bottom: 16px; width: 100%;">
        <a-radio-button value="scan" style="width: 50%; text-align: center;">扫码输入</a-radio-button>
        <a-radio-button value="manual" style="width: 50%; text-align: center;">手动输入</a-radio-button>
      </a-radio-group>

      <a-form-item label="连续盘点模式" v-if="selectedItem?.status !== 'Disposed'">
        <a-switch v-model:checked="continuousCheck" />
      </a-form-item>

      <!-- Scan Mode -->
      <div v-if="inputMode === 'scan'">
        <div v-show="!selectedItem && !scanError">
          <div id="reader" ref="readerRef"></div>
           <a-select
            v-if="cameras.length > 1 && isScanning"
            v-model:value="selectedCameraId"
            placeholder="选择摄像头"
            style="margin-top: 8px; width: 100%"
            @change="handleCameraChange"
          >
            <a-select-option v-for="camera in cameras" :key="camera.id" :value="camera.id">
              {{ camera.label }}
            </a-select-option>
          </a-select>
        </div>
        <div class="controls" v-if="!selectedItem">
          <a-button @click="toggleScan" :danger="isScanning" block size="large">
            {{ isScanning ? '停止扫描' : '开始扫描' }}
          </a-button>
        </div>
      </div>

      <!-- Manual Mode -->
      <div v-if="inputMode === 'manual' && !selectedItem">
        <a-form>
          <a-form-item label="通过物品ID查找">
            <a-input-search
              ref="manualInputRef"
              v-model:value="manualId"
              placeholder="输入物品短ID"
              enter-button="查找"
              @search="onManualSearch"
              @keydown.enter.prevent="onManualSearch(manualId)"
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
            <a-button v-if="selectedItem.status === 'LoanedOut' || selectedItem.status === 'SuspectedMissing'" @click="handleAction('return')" block>归还</a-button>
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
import { ref, onMounted, onBeforeUnmount, watch, h, nextTick } from 'vue';
import { Html5Qrcode, type CameraDevice } from 'html5-qrcode';
import { useItemStore, type Item, type ItemStatus } from '../stores/itemStore';
import { message, Modal, Input } from 'ant-design-vue';

const itemStore = useItemStore();
let html5Qrcode: Html5Qrcode | null = null;

const inputMode = ref<'scan' | 'manual'>('scan');
const manualId = ref('');
const isScanning = ref(false);
const selectedItem = ref<Item | null>(null);
const scanError = ref<string | null>(null);
const readerRef = ref<HTMLElement | null>(null);
const manualInputRef = ref<any>(null);
const continuousCheck = ref(false);

// Camera state
const cameras = ref<CameraDevice[]>([]);
const selectedCameraId = ref<string | null>(null);

const initScanner = async () => {
  if (!readerRef.value) return;
  if (!html5Qrcode) {
    html5Qrcode = new Html5Qrcode(readerRef.value.id, { verbose: false });
  }

  if (cameras.value.length === 0) {
    try {
      const availableCameras = await Html5Qrcode.getCameras();
      if (availableCameras && availableCameras.length) {
        cameras.value = availableCameras;
        let preferredCamera = availableCameras.find(c => c.label.toLowerCase().includes('back')) || 
                              availableCameras.find(c => c.label.toLowerCase().includes('后置')) || 
                              availableCameras.find(c => c.label.toLowerCase().includes('rear')) ||
                              availableCameras[0];
        selectedCameraId.value = preferredCamera.id;
      } else {
        scanError.value = "未找到摄像头设备。";
      }
    } catch (err) {
      scanError.value = "获取摄像头列表失败，请检查权限。";
    }
  }
};

const startScan = (deviceId: string) => {
  if (!html5Qrcode) return;
  
  reset();
  const config = { fps: 10, qrbox: { width: 250, height: 250 } };
  const onScanSuccess = async (decodedText: string) => {
    await stopScan();
    await fetchItemByShortId(decodedText);
  };

  html5Qrcode.start(deviceId, config, onScanSuccess, undefined)
    .then(() => { isScanning.value = true; })
    .catch(_err => { scanError.value = "无法启动摄像头。"; });
};

const stopScan = async () => {
  if (html5Qrcode && isScanning.value) {
    try {
      await html5Qrcode.stop();
    } catch (err) {
      console.error("Error stopping scanner:", err);
    } finally {
      isScanning.value = false;
    }
  }
};

const toggleScan = async () => {
  if (isScanning.value) {
    await stopScan();
  } else {
    if (selectedCameraId.value) {
      startScan(selectedCameraId.value);
    } else {
      scanError.value = "没有可用的摄像头。";
    }
  }
};

const handleCameraChange = async (newCameraId: string) => {
  await stopScan();
  selectedCameraId.value = newCameraId;
  startScan(newCameraId);
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

  const performAction = async (destination?: string) => {
    if (!selectedItem.value) return;
    try {
      await itemStore.updateItemStatus(selectedItem.value.id, action, destination);
      message.success(`操作成功: ${action}`);

      if (action === 'check' && continuousCheck.value) {
        reset();
        if (inputMode.value === 'scan' && selectedCameraId.value) {
          startScan(selectedCameraId.value);
        } else if (inputMode.value === 'manual') {
          await nextTick(); // Wait for the DOM to update
          manualInputRef.value?.focus();
        }
      } else {
        await fetchItemByShortId(selectedItem.value.shortId); // Refresh data
      }
    } catch (error) {
      message.error('操作失败');
    }
  };

  if (action === 'outbound' || action === 'dispose') {
    let destination: string | undefined;
    const actionText = action === 'outbound' ? '借出' : '处置';
    Modal.confirm({
      title: `确认${actionText}`,
      content: h('div', [
        h('p', `请输入目的地或原因：`),
        h(Input, {
          placeholder: '例如：借给张三，或处置原因',
          onChange: (e) => { destination = e.target.value; },
        }),
      ]),
      onOk: () => {
        if (!destination) {
          message.error('目的地/原因不能为空');
          return Promise.reject();
        }
        performAction(destination);
      },
    });
  } else {
    performAction();
  }
};

const reset = () => {
  selectedItem.value = null;
  scanError.value = null;
  manualId.value = '';
  itemStore.items = [];
};

watch(inputMode, async (newMode) => {
  if (newMode === 'scan') {
    await initScanner();
    if (selectedCameraId.value) {
      startScan(selectedCameraId.value);
    }
  } else {
    await stopScan();
    await nextTick();
    manualInputRef.value?.focus();
  }
});

onMounted(async () => {
  await initScanner();
  if (inputMode.value === 'scan' && selectedCameraId.value) {
    startScan(selectedCameraId.value);
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
    case 'SuspectedMissing': return 'purple';
    default: return 'default';
  }
};
const getStatusText = (status: ItemStatus) => {
  switch (status) {
    case 'InStock': return '在库';
    case 'LoanedOut': return '已借出';
    case 'Disposed': return '已处置';
    case 'SuspectedMissing': return '疑似丢失';
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
