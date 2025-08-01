<template>
  <div>
    <a-page-header :title="pageTitle" @back="goBack" />
    <div class="form-container">
      <a-form
        ref="formRef"
        :model="formState"
        :rules="rules"
        layout="vertical"
        @finish="onFinish"
      >
        <a-form-item label="仓库名称" name="name">
          <a-input v-model:value="formState.name" placeholder="请输入仓库名称" />
        </a-form-item>
        <a-form-item label="位置" name="location">
          <a-input v-model:value="formState.location" placeholder="请输入位置" />
        </a-form-item>
        <a-form-item label="容量" name="capacity">
          <a-input-number v-model:value="formState.capacity" style="width: 100%" />
        </a-form-item>
        <a-form-item label="描述" name="description">
          <a-textarea v-model:value="formState.description" placeholder="请输入描述" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" html-type="submit" :loading="warehouseStore.loading" block>
            保存
          </a-button>
        </a-form-item>
      </a-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useWarehouseStore, type Warehouse } from '../stores/warehouseStore';
import { message } from 'ant-design-vue';
import type { FormInstance } from 'ant-design-vue';

const route = useRoute();
const router = useRouter();
const warehouseStore = useWarehouseStore();

const formRef = ref<FormInstance>();
const formState = reactive<Partial<Warehouse>>({
  name: '',
  location: '',
  capacity: 100,
  description: '',
});

const editingId = ref<string | null>(null);
const pageTitle = computed(() => (editingId.value ? '编辑仓库' : '添加仓库'));

const rules = {
  name: [{ required: true, message: '请输入仓库名称！' }],
  location: [{ required: true, message: '请输入位置！' }],
};

onMounted(() => {
  const id = route.params.id;
  if (id && typeof id === 'string') {
    editingId.value = id;
    const numericId = Number(id);
    const existingWarehouse = warehouseStore.warehouses.find(w => w.id === numericId);
    if (existingWarehouse) {
      Object.assign(formState, existingWarehouse);
    }
  }
});

const onFinish = async (values: any) => {
  try {
    if (editingId.value) {
      await warehouseStore.updateWarehouse({ id: Number(editingId.value), ...values });
      message.success('仓库更新成功');
    } else {
      await warehouseStore.addWarehouse(values);
      message.success('仓库添加成功');
    }
    router.back();
  } catch (error) {
    message.error('保存失败');
  }
};

const goBack = () => {
  router.back();
};
</script>

<style scoped>
.form-container {
  padding: 16px;
}
</style>