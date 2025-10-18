<template>
  <div>
    <a-page-header title="物品操作" />
    <div class="page-container">
      <a-radio-group v-model:value="inputMode" button-style="solid" style="margin-bottom: 16px; width: 100%;">
        <a-radio-button value="scan" style="width: 50%; text-align: center;">扫码输入</a-radio-button>
        <a-radio-button value="manual" style="width: 50%; text-align: center;">手动输入</a-radio-button>
      </a-radio-group>

      <a-form-item label="连续盘点模式" v-if="inputMode === 'scan' && !selectedItem">
        <a-switch v-model:checked="continuousCheck" />
        <span style="margin-left: 8px; color: #666; font-size: 12px;">
          开启后将自动盘点扫描到的物品
        </span>
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
            {{ isScanning ? '停止扫码' : '开始扫码' }}
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
            <a-button v-if="selectedItem.status !== 'Disposed'" @click="showTransferModal" block>转移库房</a-button>
            <a-button v-if="selectedItem.status !== 'Disposed'" @click="handleAction('dispose')" danger block>处置</a-button>
            <a-divider />
            <a-button @click="reset" block>查找下一个</a-button>
          </div>
        </a-card>
      </div>
    </div>

    <!-- Transfer Warehouse Modal -->
    <a-modal
      v-model:open="transferModalVisible"
      title="转移库房"
      ok-text="确认转移"
      cancel-text="取消"
      :confirm-loading="itemStore.loading"
      @ok="handleTransfer"
    >
      <a-form layout="vertical">
        <a-form-item label="当前库房">
          <a-input :value="selectedItem?.warehouse?.name" disabled />
        </a-form-item>
        
        <a-form-item label="目标库房" required>
          <a-select 
            v-model:value="transferForm.targetWarehouseId" 
            placeholder="请选择目标库房"
            style="width: 100%"
          >
            <a-select-option 
              v-for="wh in availableTargetWarehouses" 
              :key="wh.id" 
              :value="wh.id"
            >
              {{ wh.name }}
            </a-select-option>
          </a-select>
        </a-form-item>
        
        <a-form-item label="备注（可选）">
          <a-textarea 
            v-model:value="transferForm.remarks" 
            placeholder="输入转移原因或备注"
            :rows="3"
            :maxlength="500"
            show-count
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, watch, computed, h, nextTick } from 'vue';
import { Html5Qrcode, type CameraDevice } from 'html5-qrcode';
import { useItemStore, type Item, type ItemStatus } from '../stores/itemStore';
import { useWarehouseStore } from '../stores/warehouseStore';
import { message, Modal, Input } from 'ant-design-vue';

const itemStore = useItemStore();
const warehouseStore = useWarehouseStore();
let html5Qrcode: Html5Qrcode | null = null;

const inputMode = ref<'scan' | 'manual'>('scan');
const manualId = ref('');
const isScanning = ref(false);
const selectedItem = ref<Item | null>(null);
const scanError = ref<string | null>(null);
const readerRef = ref<HTMLElement | null>(null);
const manualInputRef = ref<any>(null);
const continuousCheck = ref(false);

// 防抖：记录最近扫描的物品和时间
const lastScannedId = ref<string | null>(null);
const lastScanTime = ref<number>(0);
const SCAN_DEBOUNCE_MS = 1500; // 1.5秒内不重复扫描同一物品

// Camera state
const cameras = ref<CameraDevice[]>([]);
const selectedCameraId = ref<string | null>(null);

// Transfer modal state
const transferModalVisible = ref(false);
const transferForm = reactive({
  targetWarehouseId: undefined as number | undefined,
  remarks: ''
});

const availableTargetWarehouses = computed(() => {
  if (!selectedItem.value) return warehouseStore.warehouses;
  return warehouseStore.warehouses.filter(w => w.id !== selectedItem.value?.warehouseId);
});

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
  const config = { 
    fps: 30, 
    qrbox: { width: 200, height: 200 },
    frameRate: { ideal: 15, max: 30 },
    autofocus: true,
    colorDark: '#0000ff',
    colorLight: '#ffffff',
    visualFeedback: true,
    halfSample: true,
    experimentalFeatures: {
      useBarCodeDetectorIfSupported: true
    },
  };
  const onScanSuccess = async (decodedText: string) => {
    // 连续盘点模式：直接执行盘点操作，不停止扫描
    if (continuousCheck.value) {
      // 防抖：检查是否在短时间内重复扫描同一物品
      const now = Date.now();
      if (lastScannedId.value === decodedText && (now - lastScanTime.value) < SCAN_DEBOUNCE_MS) {
        // 忽略重复扫描
        return;
      }
      
      // 更新最近扫描记录
      lastScannedId.value = decodedText;
      lastScanTime.value = now;
      
      await performContinuousCheck(decodedText);
    } else {
      // 普通模式：停止扫描并显示详情
      await stopScan();
      await fetchItemByShortId(decodedText);
    }
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

const performContinuousCheck = async (shortId: string) => {
  try {
    // 获取物品信息
    await itemStore.fetchItems({ shortId });
    
    if (itemStore.items.length === 0) {
      message.error(`未找到ID为 "${shortId}" 的物品`);
      return;
    }

    const item = itemStore.items[0];
    
    // 检查物品状态
    if (item.status === 'Disposed') {
      message.warning(`物品 ${shortId} 已处置，无法盘点`);
      return;
    }

    // 执行盘点操作
    await itemStore.updateItemStatus(item.id, 'check');
    
    // 显示成功提示（带物品名称）
    message.success({
      content: `✓ ${item.itemDefinition?.name || '物品'} (${shortId}) 盘点成功`,
      duration: 2,
    });
    
    // 清空items数组，准备下一次扫描
    itemStore.items = [];
  } catch (error) {
    message.error(`盘点失败: ${shortId}`);
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
          await nextTick();
          manualInputRef.value?.focus();
        }
      } else {
        await fetchItemByShortId(selectedItem.value.shortId);
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

const showTransferModal = () => {
  if (!selectedItem.value) return;
  transferForm.targetWarehouseId = undefined;
  transferForm.remarks = '';
  transferModalVisible.value = true;
};

const handleTransfer = async () => {
  if (!transferForm.targetWarehouseId) {
    message.error('请选择目标库房');
    return;
  }

  if (!selectedItem.value) return;

  if (transferForm.targetWarehouseId === selectedItem.value.warehouseId) {
    message.error('目标库房不能与当前库房相同');
    return;
  }

  try {
    await itemStore.transferWarehouse(
      selectedItem.value.id,
      transferForm.targetWarehouseId,
      transferForm.remarks || undefined
    );

    const targetWarehouse = warehouseStore.warehouses.find(
      w => w.id === transferForm.targetWarehouseId
    );
    
    message.success(`成功转移到 ${targetWarehouse?.name || '目标库房'}`);
    
    transferModalVisible.value = false;
    
    // Refresh item data
    await fetchItemByShortId(selectedItem.value.shortId);
  } catch (error) {
    message.error('转移失败，请重试');
  }
};

const reset = () => {
  selectedItem.value = null;
  scanError.value = null;
  manualId.value = '';
  itemStore.items = [];
  // 清除防抖记录
  lastScannedId.value = null;
  lastScanTime.value = 0;
};

watch(inputMode, async (newMode) => {
  // 清除防抖记录
  lastScannedId.value = null;
  lastScanTime.value = 0;
  
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

watch(continuousCheck, (newValue) => {
  // 清除防抖记录
  lastScannedId.value = null;
  lastScanTime.value = 0;
  
  if (newValue) {
    // 开启连续盘点模式时，如果有选中的物品，清除它以显示扫描界面
    if (selectedItem.value) {
      reset();
      if (inputMode.value === 'scan' && selectedCameraId.value && !isScanning.value) {
        startScan(selectedCameraId.value);
      }
    }
  }
});

onMounted(async () => {
  await warehouseStore.fetchWarehouses();
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