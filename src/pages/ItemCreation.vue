<template>
  <div class="item-creation-container">
    <a-page-header title="快速入库" sub-title="扫描或输入已有条码" @back="router.back()" />
    <a-form :model="formState" layout="vertical" class="form-container">
      <a-form-item label="外部条码 (ShortId)" name="shortId">
        <a-input-group compact>
          <a-input v-model:value="formState.shortId" placeholder="扫描或输入外部条码" style="width: calc(100% - 90px)" />
          <a-button type="primary" @click="toggleScanner">
            {{ isScannerActive ? '关闭扫描' : '扫码' }}
          </a-button>
        </a-input-group>
      </a-form-item>

      <div v-show="isScannerActive">
        <div id="qr-code-reader"></div>
        <a-select
          v-if="cameras.length > 1"
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
          @preview="handlePreview"
        >
          <div v-if="!fileList || fileList.length < 1">
            <plus-outlined />
            <div style="margin-top: 8px">上传</div>
          </div>
        </a-upload>
      </a-form-item>

      <a-form-item>
        <a-button type="primary" @click="handleSave" :loading="isSaving" :disabled="!isFormValid" block size="large">
          确认入库
        </a-button>
      </a-form-item>
    </a-form>

    <a-modal :open="previewVisible" :title="previewTitle" :footer="null" @cancel="handleCancelPreview">
      <img alt="example" style="width: 100%" :src="previewImage" />
    </a-modal>
    
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
import { Html5Qrcode, Html5QrcodeScannerState, type CameraDevice } from 'html5-qrcode';
import apiClient from '../services/api';
import ItemDefinitionForm from './ItemDefinitionForm.vue';

// Stores & Router
const router = useRouter();
const itemDefinitionStore = useItemDefinitionStore();
const warehouseStore = useWarehouseStore();

// Form State
const formState = reactive({
  shortId: '',
  itemDefinitionId: null,
  warehouseId: null,
  remarks: '',
  photo: null as File | null,
});
const fileList = ref<UploadProps['fileList']>([]);
const isSaving = ref(false);

// Scanner State
const isScannerActive = ref(false);
let html5QrCode: Html5Qrcode | null = null;
const cameras = ref<CameraDevice[]>([]);
const selectedCameraId = ref<string | null>(null);

// Modal/Drawer State
const previewVisible = ref(false);
const previewImage = ref('');
const previewTitle = ref('');
const isNewItemDefVisible = ref(false);
const newItemDefFormRef = ref<InstanceType<typeof ItemDefinitionForm> | null>(null);

// Computed
const isFormValid = computed(() => formState.shortId && formState.itemDefinitionId && formState.warehouseId);

// Methods
onMounted(() => {
  itemDefinitionStore.fetchItemDefinitions();
  warehouseStore.fetchWarehouses();
});

onUnmounted(() => {
  stopScanner();
});

const handleFileChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
  fileList.value = newFileList;
  if (newFileList.length > 0 && newFileList[0].originFileObj) {
    formState.photo = newFileList[0].originFileObj;
  } else {
    formState.photo = null;
  }
};

const handlePreview = async (file: any) => {
  if (!file.url && !file.preview) {
    file.preview = await getBase64(file.originFileObj);
  }
  previewImage.value = file.url || file.preview;
  previewVisible.value = true;
  previewTitle.value = file.name || file.url.substring(file.url.lastIndexOf('/') + 1);
};

const getBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });

const handleCancelPreview = () => {
  previewVisible.value = false;
};

const resetForm = () => {
  formState.shortId = '';
  formState.itemDefinitionId = null;
  formState.warehouseId = null;
  formState.remarks = '';
  formState.photo = null;
  fileList.value = [];
};

const handleSave = async () => {
  isSaving.value = true;
  const formData = new FormData();
  formData.append('shortId', formState.shortId);
  formData.append('itemDefinitionId', String(formState.itemDefinitionId!));
  formData.append('warehouseId', String(formState.warehouseId!));
  if (formState.remarks) formData.append('remarks', formState.remarks);
  if (formState.photo) formData.append('photo', formState.photo);

  try {
    await apiClient.post('/items/create', formData);
    message.success('物品已成功入库!');
    resetForm();
  } catch (error) {
    message.error('保存失败，请检查条码是否已存在。');
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
const startScanner = (deviceId: string) => {
  if (!html5QrCode) {
    html5QrCode = new Html5Qrcode('qr-code-reader', {
      verbose: false,
      experimentalFeatures: { useBarCodeDetectorIfSupported: true }
    });
  }
  html5QrCode.start(
    deviceId,
    { fps: 10, qrbox: { width: 250, height: 250 } },
    (decodedText, _decodedResult) => {
      formState.shortId = decodedText;
      stopScanner();
    },
    (_errorMessage) => {}
  ).catch((err) => {
    console.error("Scanner start error:", err);
    message.error("无法启动扫描仪。");
    isScannerActive.value = false;
  });
};

const stopScanner = async () => {
  try {
    if (html5QrCode && html5QrCode.getState() === Html5QrcodeScannerState.SCANNING) {
      await html5QrCode.stop();
    }
  } catch (err) {
    console.error("Error stopping scanner:", err);
  } finally {
    isScannerActive.value = false;
  }
};

const initAndStartScanner = async () => {
  isScannerActive.value = true;
  try {
    const availableCameras = await Html5Qrcode.getCameras();
    if (availableCameras && availableCameras.length) {
      cameras.value = availableCameras;
      let preferredCamera = availableCameras.find(c => c.label.toLowerCase().includes('back')) || 
                            availableCameras.find(c => c.label.toLowerCase().includes('rear')) ||
                            availableCameras.find(c => c.label.toLowerCase().includes('environment')) ||
                            availableCameras[0];
      selectedCameraId.value = preferredCamera.id;
      startScanner(preferredCamera.id);
    } else {
      message.error("未找到摄像头设备。");
      isScannerActive.value = false;
    }
  } catch (err) {
    message.error("获取摄像头列表失败，请检查权限。");
    isScannerActive.value = false;
  }
};

const handleCameraChange = async (newCameraId: string) => {
  await stopScanner();
  isScannerActive.value = true;
  startScanner(newCameraId);
};

const toggleScanner = async () => {
  if (isScannerActive.value) {
    await stopScanner();
  } else {
    await initAndStartScanner();
  }
};
</script>

<style scoped>
.item-creation-container {
  padding: 0;
}
.form-container {
  padding: 16px;
}
#qr-code-reader {
  width: 100%;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  overflow: hidden;
}
</style>