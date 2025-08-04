<template>
  <div class="item-creation-container">
    <a-page-header title="快速入库" sub-title="扫描或输入已有条码" @back="router.back()" />
    <a-form :model="formState" layout="vertical" class="form-container">
      <a-form-item label="外部条码 (ShortId)" name="shortId">
        <a-input-group compact>
          <a-input v-model:value="formState.shortId" placeholder="扫描或输入外部条码" style="width: calc(100% - 150px)" />
          <a-button @click="generateId" style="width: 60px">生成</a-button>
          <a-button type="primary" @click="toggleScanner" style="width: 90px">
            {{ isScannerActive ? '关闭' : '扫码' }}
          </a-button>
        </a-input-group>
      </a-form-item>

      <div v-show="isScannerActive">
        <div id="qr-code-reader" ref="readerRef"></div>
        <a-select
          v-if="cameras.length > 1 && isScannerActive"
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

      <a-form-item label="物品定义" name="itemDefinitionId">
         <a-space-compact style="width: 100%">
            <a-select
              v-model:value="formState.itemDefinitionId"
              show-search
              placeholder="搜索或选择物品定义"
              :options="itemDefinitionStore.itemDefinitions.map(d => ({ value: d.id, label: d.name }))"
              style="width: calc(100% - 60px)"
            ></a-select>
            <a-button @click="isNewItemDefVisible = true">新建</a-button>
          </a-space-compact>
      </a-form-item>

      <a-form-item label="存放仓库" name="warehouseId">
        <a-select
          v-model:value="formState.warehouseId"
          placeholder="选择仓库"
          :options="warehouseStore.warehouses.map(w => ({ value: w.id, label: w.name }))"
        ></a-select>
      </a-form-item>

      <a-form-item label="备注">
        <a-textarea v-model:value="formState.remarks" />
      </a-form-item>

      <a-form-item label="照片">
        <a-upload
          v-model:file-list="fileList"
          list-type="picture-card"
          :before-upload="() => false"
          @change="handleFileChange"
        >
          <div v-if="!fileList || fileList.length < 1">
            <plus-outlined />
            <div style="margin-top: 8px">上传</div>
          </div>
        </a-upload>
      </a-form-item>

      <a-form-item>
        <a-button type="default" @click="handleAddItemToList" :disabled="!isFormValid" block size="large">
          添加到列表
        </a-button>
      </a-form-item>
    </a-form>

    <!-- Inbound List -->
    <div class="list-container">
      <a-list
        item-layout="horizontal"
        :data-source="inboundList"
        :locale="{ emptyText: '暂无待入库物品' }"
      >
        <template #header>
          <div class="list-header">
            <h3>待入库列表 ({{ inboundList.length }})</h3>
            <a-button
              type="primary"
              @click="handleSaveAndExport"
              :loading="isSaving || isCompressing"
              :disabled="inboundList.length === 0"
            >
              保存并导出
            </a-button>
          </div>
        </template>
        <template #renderItem="{ item, index }">
          <a-list-item>
            <template #actions>
              <a key="list-remove" @click="handleRemoveFromList(index)" style="color: red">移除</a>
            </template>
            <a-list-item-meta>
              <template #title>
                <a>{{ item.definitionName }}</a>
              </template>
              <template #description>
                <span class="description-text">条码: {{ item.shortId }}</span>
                <span class="description-text" v-if="item.remarks">备注: {{ item.remarks }}</span>
              </template>
               <template #avatar>
                <a-image v-if="item.photoPreview" :width="50" :src="item.photoPreview" />
              </template>
            </a-list-item-meta>
          </a-list-item>
        </template>
      </a-list>
    </div>
    
    <a-drawer title="新建物品定义" :width="'90%'" :open="isNewItemDefVisible" @close="isNewItemDefVisible = false">
      <ItemDefinitionForm ref="newItemDefFormRef" @submitted="handleNewItemDefSubmitted"/>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useItemDefinitionStore } from '../stores/itemDefinitionStore';
import { useWarehouseStore } from '../stores/warehouseStore';
import { message, type UploadProps } from 'ant-design-vue';
import { PlusOutlined } from '@ant-design/icons-vue';
import { Html5Qrcode, type CameraDevice } from 'html5-qrcode';
import apiClient from '../services/api';
import ItemDefinitionForm from './ItemDefinitionForm.vue';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import imageCompression from 'browser-image-compression';

// Stores & Router
const router = useRouter();
const itemDefinitionStore = useItemDefinitionStore();
const warehouseStore = useWarehouseStore();

// Inbound List
const inboundList = ref<any[]>([]);

// Form State
const formState = reactive({
  id: null as string | null,
  shortId: '',
  itemDefinitionId: null as number | null,
  warehouseId: null as number | null,
  remarks: '',
  photo: null as File | null,
  photoPreview: null as string | null,
});
const fileList = ref<UploadProps['fileList']>([]);
const isSaving = ref(false);
const isCompressing = ref(false);

// Scanner State
const readerRef = ref<HTMLElement | null>(null);
const isScannerActive = ref(false);
let html5QrCode: Html5Qrcode | null = null;
const cameras = ref<CameraDevice[]>([]);
const selectedCameraId = ref<string | null>(null);

// Modal/Drawer State
const isNewItemDefVisible = ref(false);
const newItemDefFormRef = ref<InstanceType<typeof ItemDefinitionForm> | null>(null);

// Computed
const isFormValid = computed(() => formState.shortId && formState.itemDefinitionId && formState.warehouseId);

// Methods
onMounted(() => {
  itemDefinitionStore.fetchItemDefinitions();
  warehouseStore.fetchWarehouses();
  initScanner();
});

onUnmounted(() => {
  stopScanner();
  // Revoke any object URLs to prevent memory leaks
  inboundList.value.forEach(item => {
    if (item.photoPreview) {
      URL.revokeObjectURL(item.photoPreview);
    }
  });
});

const handleFileChange = async (info: any) => {
  fileList.value = info.fileList.slice(-1);
  
  if (formState.photoPreview) {
      URL.revokeObjectURL(formState.photoPreview);
      formState.photoPreview = null;
  }

  if (fileList.value && fileList.value.length > 0 && fileList.value[0].originFileObj) {
    isCompressing.value = true;
    message.loading({ content: '正在压缩图片...', key: 'compressing' });
    try {
      const file = fileList.value[0].originFileObj;
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);
      formState.photo = compressedFile;
      formState.photoPreview = URL.createObjectURL(compressedFile);
      message.success({ content: '图片压缩成功!', key: 'compressing', duration: 2 });
    } catch (error) {
      message.error({ content: '图片压缩失败!', key: 'compressing', duration: 2 });
      console.error(error);
      formState.photo = null;
      fileList.value = [];
    } finally {
      isCompressing.value = false;
    }
  } else {
    formState.photo = null;
  }
};

const generateId = () => {
  const newId = uuidv4();
  formState.id = newId;
  formState.shortId = newId.substring(0, 8).toUpperCase();
};

const resetForm = () => {
  formState.id = null;
  formState.shortId = '';
  formState.remarks = '';
  if (formState.photoPreview) {
    URL.revokeObjectURL(formState.photoPreview);
  }
  formState.photo = null;
  formState.photoPreview = null;
  fileList.value = [];
};

const handleAddItemToList = () => {
  const definition = itemDefinitionStore.itemDefinitions.find(d => d.id === formState.itemDefinitionId);
  inboundList.value.push({
    ...formState,
    definitionName: definition?.name || '未知',
  });
  message.success(`物品 ${formState.shortId} 已添加到列表`);
  resetForm();
};

const handleRemoveFromList = (index: number) => {
  const item = inboundList.value[index];
  if (item.photoPreview) {
    URL.revokeObjectURL(item.photoPreview);
  }
  inboundList.value.splice(index, 1);
};

const handleSaveAndExport = async () => {
  isSaving.value = true;
  const savedItems = [];
  try {
    for (const item of inboundList.value) {
      const formData = new FormData();
      formData.append('shortId', item.shortId);
      formData.append('itemDefinitionId', String(item.itemDefinitionId!));
      formData.append('warehouseId', String(item.warehouseId!));
      if (item.remarks) formData.append('remarks', item.remarks);
      if (item.photo) formData.append('photo', item.photo);

      const response = await apiClient.post('/items/create', formData);
      savedItems.push(response.data);
    }
    
    message.success(`${inboundList.value.length}个物品已成功保存!`);

    const dataForExport = savedItems.map(item => ({
      '物品名称': item.itemDefinition?.name || '未知',
      '短ID': item.shortId,
      '备注': item.remarks || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataForExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '入库物品');
    XLSX.writeFile(workbook, `inbound_items_${Date.now()}.xlsx`);

    inboundList.value = []; // Clear the list
  } catch (error) {
    message.error('保存过程中发生错误。');
    console.error(error);
  } finally {
    isSaving.value = false;
  }
};

const handleNewItemDefSubmitted = (newItem: any) => {
  isNewItemDefVisible.value = false;
  formState.itemDefinitionId = newItem.id;
};

// --- Scanner Logic ---
const initScanner = async () => {
  if (!readerRef.value) return;
  if (!html5QrCode) {
    html5QrCode = new Html5Qrcode(readerRef.value.id, { verbose: false });
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
        message.error("未找到摄像头设备。");
      }
    } catch (err) {
      message.error("获取摄像头列表失败，请检查权限。");
    }
  }
};

const startScanner = (deviceId: string) => {
  if (!html5QrCode) return;
  
  const config = { fps: 10, qrbox: { width: 250, height: 250 } };
  const onScanSuccess = (decodedText: string) => {
    formState.shortId = decodedText;
    stopScanner();
  };

  html5QrCode.start(deviceId, config, onScanSuccess, undefined)
    .catch(_err => { 
      message.error("无法启动摄像头。");
      isScannerActive.value = false;
    });
};

const stopScanner = async () => {
  if (html5QrCode && isScannerActive.value) {
    try {
      await html5QrCode.stop();
    } catch (err) {
      console.error("Error stopping scanner:", err);
    } finally {
      isScannerActive.value = false;
    }
  }
};

const toggleScanner = async () => {
  if (isScannerActive.value) {
    await stopScanner();
  } else {
    isScannerActive.value = true;
    if (selectedCameraId.value) {
      startScanner(selectedCameraId.value);
    } else {
      message.error("没有可用的摄像头。");
      isScannerActive.value = false;
    }
  }
};

const handleCameraChange = async (newCameraId: string) => {
  await stopScanner();
  selectedCameraId.value = newCameraId;
  isScannerActive.value = true;
  startScanner(newCameraId);
};
</script>

<style scoped>
.item-creation-container {
  padding: 0;
}
.form-container {
  padding: 16px;
  padding-bottom: 0;
}
.list-container {
  padding: 0 16px;
}
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.description-text {
  margin-right: 8px;
}
#qr-code-reader {
  width: 100%;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  overflow: hidden;
  background: #eee;
}
</style>
