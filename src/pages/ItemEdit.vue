<template>
  <div>
    <a-page-header :title="`编辑: ${item?.shortId}`" @back="() => router.back()" />
    <div class="page-container">
      <a-card v-if="!itemStore.loading && item">
        <a-form :model="formState" @finish="handleSave" layout="vertical">
          <a-form-item label="备注">
            <a-textarea v-model:value="formState.remarks" :rows="4" />
          </a-form-item>
          <a-form-item label="更换照片">
            <a-upload
              v-model:file-list="fileList"
              :before-upload="() => false"
              @change="handleFileChange"
              list-type="picture"
              accept="image/*"
            >
              <a-button>
                <upload-outlined />
                选择新照片
              </a-button>
            </a-upload>
            <div style="margin-top: 16px;">
              <p>当前照片:</p>
              <a-image v-if="item.photoUrl" :width="100" :src="photoFullUrl" />
              <a-empty v-else description="暂无照片" />
            </div>
          </a-form-item>
          <a-form-item>
            <a-button type="primary" html-type="submit" :loading="itemStore.loading" block>
              保存更改
            </a-button>
          </a-form-item>
        </a-form>
      </a-card>
      <div v-else class="loading-container">
        <a-spin size="large" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useItemStore, type Item } from '../stores/itemStore';
import { message, type UploadProps } from 'ant-design-vue';
import { UploadOutlined } from '@ant-design/icons-vue';
import apiClient from '../services/api';

const route = useRoute();
const router = useRouter();
const itemStore = useItemStore();

const item = ref<Item | null>(null);
const formState = reactive<{ remarks: string; photo?: File }>({
  remarks: '',
});
const fileList = ref<UploadProps['fileList']>([]);

const photoFullUrl = computed(() => {
  if (!item.value?.photoUrl) return '';
  const baseUrl = (apiClient.defaults.baseURL || '').replace('/api', '');
  return `${baseUrl}${item.value.photoUrl}`;
});

onMounted(async () => {
  const itemId = route.params.id as string;
  await itemStore.fetchItems({ id: itemId });
  const foundItem = itemStore.items.find(i => i.id === itemId);
  if (foundItem) {
    item.value = foundItem;
    formState.remarks = foundItem.remarks || '';
  } else {
    message.error('未找到物品');
    router.back();
  }
});

const handleFileChange = (info: any) => {
  if (info.fileList.length > 0) {
    fileList.value = [info.fileList[info.fileList.length - 1]];
    formState.photo = info.file.originFileObj;
  } else {
    fileList.value = [];
    delete formState.photo;
  }
};

const handleSave = async () => {
  if (!item.value) return;
  try {
    await itemStore.updateItem(item.value.id, {
      remarks: formState.remarks,
      photo: formState.photo,
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
.loading-container {
  text-align: center;
  padding-top: 50px;
}
</style>
