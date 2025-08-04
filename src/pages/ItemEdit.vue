<template>
  <div>
    <a-page-header :title="`编辑: ${item?.shortId}`" @back="() => router.back()" />
    <div class="page-container">
      <a-card v-if="!itemStore.loading && item">
        <a-form :model="formState" @finish="handleSave" layout="vertical">
          <a-form-item label="去向 (可选)">
            <a-input v-model:value="formState.currentDestination" />
          </a-form-item>
          <a-form-item label="备注">
            <a-textarea v-model:value="formState.remarks" :rows="4" />
          </a-form-item>
          <a-form-item label="更换照片">
            <a-upload
              v-model:file-list="fileList"
              :before-upload="() => false"
              @change="handleFileChange"
              list-type="picture-card"
              :max-count="1"
              accept="image/*"
            >
              <div v-if="!fileList || fileList.length < 1">
                <plus-outlined />
                <div style="margin-top: 8px">上传</div>
              </div>
            </a-upload>
            <div v-if="currentPhotoUrl && !isPhotoDeleted">
              <p>当前照片:</p>
              <a-image :width="100" :src="currentPhotoUrl" />
              <a-button type="link" danger @click="handleDeletePhoto">删除照片</a-button>
            </div>
             <a-empty v-if="!currentPhotoUrl && !fileList?.length" description="暂无照片" />
          </a-form-item>
          <a-form-item>
            <a-button type="primary" block html-type="submit" :loading="itemStore.loading || isCompressing">
              保存更改
            </a-button>
          </a-form-item>
        </a-form>
      </a-card>
      <a-skeleton v-else active />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useItemStore, type Item } from '../stores/itemStore';
import { message, type UploadProps } from 'ant-design-vue';
import { PlusOutlined } from '@ant-design/icons-vue';
import apiClient from '../services/api';
import imageCompression from 'browser-image-compression';

const route = useRoute();
const router = useRouter();
const itemStore = useItemStore();

const item = ref<Item | null>(null);
const formState = reactive({
  remarks: '',
  currentDestination: '',
  photo: undefined as File | undefined,
});
const fileList = ref<UploadProps['fileList']>([]);
const isPhotoDeleted = ref(false);
const isCompressing = ref(false);

const currentPhotoUrl  = computed(() => {
  if (!item.value?.photoUrl) return null;
  const baseUrl = (apiClient.defaults.baseURL || '').replace(/\/api$/, '');
  return `${baseUrl}${item.value.photoUrl}`;
});

onMounted(async () => {
  const itemId = route.params.id as string;
  let foundItem = itemStore.items.find(i => i.id === itemId);
  if (!foundItem) {
      await itemStore.fetchItems({ id: itemId });
      foundItem = itemStore.items.find(i => i.id === itemId);
  }

  if (foundItem) {
    item.value = foundItem;
    formState.remarks = foundItem.remarks || '';
    formState.currentDestination = foundItem.currentDestination || '';
  } else {
    message.error('未找到物品');
    router.back();
  }
});

const handleFileChange = async (info: any) => {
  fileList.value = info.fileList.slice(-1);
  
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
      isPhotoDeleted.value = false;
      message.success({ content: '图片压缩成功!', key: 'compressing', duration: 2 });
    } catch (error) {
      message.error({ content: '图片压缩失败!', key: 'compressing', duration: 2 });
      console.error(error);
      formState.photo = undefined;
      fileList.value = [];
    } finally {
      isCompressing.value = false;
    }
  } else {
    formState.photo = undefined;
  }
};

const handleDeletePhoto = () => {
  isPhotoDeleted.value = true;
  fileList.value = [];
  formState.photo = undefined;
  message.info('照片已标记为删除。保存后生效。');
};

const handleSave = async () => {
  if (!item.value) return;
  
  try {
    await itemStore.updateItem(item.value.id, {
      remarks: formState.remarks,
      currentDestination: formState.currentDestination,
      photo: formState.photo,
      deletePhoto: isPhotoDeleted.value,
    });
    message.success('物品信息已更新');
    router.back();
  } catch (error) {
    message.error('更新失败');
  }
};
</script>

<style scoped>
.page-container {
  padding: 16px;
}
</style>