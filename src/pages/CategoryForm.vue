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
        <a-form-item label="分类名称" name="name">
          <a-input v-model:value="formState.name" placeholder="请输入分类名称" />
        </a-form-item>
        <a-form-item label="描述" name="description">
          <a-textarea v-model:value="formState.description" placeholder="请输入描述" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" html-type="submit" :loading="categoryStore.loading" block>
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
import { useCategoryStore, type Category } from '../stores/categoryStore';
import { message } from 'ant-design-vue';
import type { FormInstance } from 'ant-design-vue';

const route = useRoute();
const router = useRouter();
const categoryStore = useCategoryStore();

const formRef = ref<FormInstance>();
const formState = reactive<Partial<Category>>({
  name: '',
  description: '',
});

const editingId = ref<string | null>(null);
const pageTitle = computed(() => (editingId.value ? '编辑分类' : '添加分类'));

const rules = {
  name: [{ required: true, message: '请输入分类名称！' }],
};

onMounted(() => {
  const id = route.params.id;
  if (id && typeof id === 'string') {
    editingId.value = id;
    const numericId = Number(id);
    const existingCategory = categoryStore.categories.find(c => c.id === numericId);
    if (existingCategory) {
      Object.assign(formState, existingCategory);
    } else {
      // It's possible the store isn't populated yet. Let's assume it's a new item if not found.
      // Or we can fetch it directly, but for mobile, this might be enough.
    }
  }
});

const onFinish = async (values: any) => {
  try {
    if (editingId.value) {
      await categoryStore.updateCategory({ id: Number(editingId.value), ...values });
      message.success('分类更新成功');
    } else {
      await categoryStore.addCategory(values);
      message.success('分类添加成功');
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