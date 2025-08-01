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
        <a-form-item label="物品名称" name="name">
          <a-input v-model:value="formState.name" placeholder="请输入物品名称" />
        </a-form-item>
        <a-form-item label="分类" name="categoryId">
          <a-select
            v-model:value="formState.categoryId"
            placeholder="请选择一个分类"
            :loading="categoryStore.loading"
          >
            <a-select-option v-for="cat in categoryStore.categories" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="单位" name="unit">
          <a-input v-model:value="formState.unit" placeholder="例如: 个, 箱, 千克" />
        </a-form-item>
        <a-form-item label="描述" name="description">
          <a-textarea v-model:value="formState.description" placeholder="请输入描述" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" html-type="submit" :loading="itemDefStore.loading" block>
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
import { useItemDefinitionStore, type ItemDefinition } from '../stores/itemDefinitionStore';
import { useCategoryStore } from '../stores/categoryStore';
import { message } from 'ant-design-vue';
import type { FormInstance } from 'ant-design-vue';

const route = useRoute();
const router = useRouter();
const itemDefStore = useItemDefinitionStore();
const categoryStore = useCategoryStore();

const formRef = ref<FormInstance>();
const formState = reactive<Partial<ItemDefinition>>({
  name: '',
  categoryId: undefined,
  unit: '',
  description: '',
});

const editingId = ref<string | null>(null);
const pageTitle = computed(() => (editingId.value ? '编辑物品定义' : '添加物品定义'));

const rules = {
  name: [{ required: true, message: '请输入物品名称！' }],
  categoryId: [{ required: true, message: '请选择一个分类！' }],
  unit: [{ required: true, message: '请输入单位！' }],
};

onMounted(() => {
  if (categoryStore.categories.length === 0) {
    categoryStore.fetchCategories();
  }
  const id = route.params.id;
  if (id && typeof id === 'string') {
    editingId.value = id;
    const numericId = Number(id);
    const existingItemDef = itemDefStore.itemDefinitions.find(i => i.id === numericId);
    if (existingItemDef) {
      Object.assign(formState, existingItemDef);
    }
  }
});

const onFinish = async (values: any) => {
  try {
    if (editingId.value) {
      await itemDefStore.updateItemDefinition({ id: Number(editingId.value), ...values });
      message.success('物品定义更新成功');
    } else {
      await itemDefStore.addItemDefinition(values);
      message.success('物品定义添加成功');
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