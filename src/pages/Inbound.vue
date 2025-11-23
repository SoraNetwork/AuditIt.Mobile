<template>
  <div>
    <a-page-header title="手动入庫" sub-title="生成新物品和条码" @back="router.back()" />
    <div class="page-container">
      <a-tabs v-model:activeKey="activeTab">
        <!-- Tab 1: Entry Form -->
        <a-tab-pane key="form" tab="录入信息">
          <a-form ref="manualFormRef" :model="manualFormState" :rules="manualFormRules" layout="vertical">
            <a-form-item label="物品定义" name="itemDefinitionId">
              <a-space-compact style="width: 100%">
                <a-select
                  v-model:value="manualFormState.itemDefinitionId"
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
                v-model:value="manualFormState.warehouseId"
                placeholder="选择仓库"
                :options="warehouseStore.warehouses.map(w => ({ value: w.id, label: w.name }))"
              ></a-select>
            </a-form-item>
            <a-form-item label="数量" name="quantity">
              <a-input-number v-model:value="manualFormState.quantity" :min="1" style="width: 100%" />
            </a-form-item>
            <a-form-item label="备注">
              <a-space-compact style="width:100%">
                <a-textarea v-model:value="manualFormState.remarks" style="width: calc(100% - 180px)" />
                <a-select
                  v-model:value="selectedQuickRemarkId"
                  :options="quickRemarks.map(r => ({ value: r.id, label: r.text }))"
                  placeholder="快捷备注"
                  allowClear
                  @change="applyQuickRemark"
                  style="width: 120px"
                />
                <a-button @click="isManageQuickRemarksVisible = true">管理</a-button>
              </a-space-compact>
            </a-form-item>
            <a-form-item>
              <a-button type="primary" @click="handleAddToPrintList" block>添加到待打印列表</a-button>
            </a-form-item>
          </a-form>
        </a-tab-pane>

        <!-- Tab 2: Print List -->
        <a-tab-pane key="list" :tab="`待打印列表 (${printList.length})`">
           <a-button 
              type="primary" 
              @click="handleSaveAndPrint" 
              :loading="isSaving" 
              :disabled="!printList.length"
              block
              size="large"
              style="margin-bottom: 16px;"
            >
              全部保存并打印
            </a-button>
          <a-list item-layout="horizontal" :data-source="printList">
            <template #renderItem="{ item, index }">
              <a-list-item>
                <template #actions>
                  <a key="list-loadmore-edit" @click="handleRemoveFromPrintList(index)" style="color: red">移除</a>
                </template>
                <a-list-item-meta
                  :description="`仓库: ${item.warehouseName}`"
                >
                  <template #title>
                    {{ item.definitionName }}
                  </template>
                </a-list-item-meta>
                 <div>{{ item.remarks }}</div>
              </a-list-item>
            </template>
          </a-list>
        </a-tab-pane>
      </a-tabs>
    </div>

     <!-- New Item Definition Drawer -->
    <a-drawer title="新建物品定义" :width="'90%'" :open="isNewItemDefVisible" @close="isNewItemDefVisible = false">
      <ItemDefinitionForm ref="newItemDefFormRef" @submitted="handleNewItemDefSubmitted"/>
    </a-drawer>
 
      <!-- Manage Quick Remarks Drawer -->
      <a-drawer title="管理快捷备注" :width="'90%'" :open="isManageQuickRemarksVisible" @close="isManageQuickRemarksVisible = false">
        <div>
          <a-space style="width: 100%; margin-bottom: 12px;">
            <a-input v-model:value="newQuickRemarkText" placeholder="请输入新快捷备注" />
            <a-button type="primary" @click="createQuickRemark" :loading="quickRemarksLoading">添加</a-button>
          </a-space>
          <a-divider />
          <div v-if="!quickRemarks.length" style="color:#888">暂无快捷备注</div>
          <div v-for="r in quickRemarks" :key="r.id" style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom: 1px solid #f0f0f0">
            <div>{{ r.text }}</div>
            <a-button type="text" danger @click="deleteQuickRemark(r.id)">删除</a-button>
          </div>
        </div>
      </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useItemDefinitionStore } from '../stores/itemDefinitionStore';
import { useWarehouseStore } from '../stores/warehouseStore';
import { message, type FormInstance } from 'ant-design-vue';
import apiClient from '../services/api';
import ItemDefinitionForm from './ItemDefinitionForm.vue';
interface QuickRemarkDto { id: number; text: string }
const quickRemarks = ref<QuickRemarkDto[]>([]);
const quickRemarksLoading = ref(false);
const isManageQuickRemarksVisible = ref(false);
const newQuickRemarkText = ref('');
const selectedQuickRemarkId = ref<number | null>(null);

const fetchQuickRemarks = async () => {
  quickRemarksLoading.value = true;
  try {
    const res = await apiClient.get('/QuickRemarks');
    quickRemarks.value = res.data || [];
  } catch (err) {
    console.error('fetchQuickRemarks', err);
  } finally {
    quickRemarksLoading.value = false;
  }
};

const applyQuickRemark = (id: number | null) => {
  if (!id) return;
  const r = quickRemarks.value.find(x => x.id === id);
  if (r) manualFormState.remarks = r.text;
};

const createQuickRemark = async () => {
  const text = newQuickRemarkText.value?.trim();
  if (!text) {
    message.warning('请输入备注内容');
    return;
  }
  quickRemarksLoading.value = true;
  try {
    const res = await apiClient.post('/QuickRemarks', { text });
    quickRemarks.value.unshift(res.data);
    newQuickRemarkText.value = '';
    message.success('添加成功');
  } catch (err) {
    console.error('createQuickRemark', err);
    message.error('添加失败');
  } finally {
    quickRemarksLoading.value = false;
  }
};

const deleteQuickRemark = async (id: number) => {
  quickRemarksLoading.value = true;
  try {
    await apiClient.delete(`/QuickRemarks/${id}`);
    quickRemarks.value = quickRemarks.value.filter(r => r.id !== id);
    message.success('已删除');
  } catch (err) {
    console.error('deleteQuickRemark', err);
    message.error('删除失败');
  } finally {
    quickRemarksLoading.value = false;
  }
};

// Stores & Router
const router = useRouter();
const itemDefinitionStore = useItemDefinitionStore();
const warehouseStore = useWarehouseStore();

// State
const activeTab = ref('form');
const isSaving = ref(false);

// Manual Form State
const manualFormRef = ref<FormInstance>();
const manualFormState = reactive({
  itemDefinitionId: null,
  warehouseId: null,
  quantity: 1,
  remarks: '',
});
const printList = ref<any[]>([]);

const manualFormRules = {
  itemDefinitionId: [{ required: true, message: '请选择物品定义' }],
  warehouseId: [{ required: true, message: '请选择仓库' }],
  quantity: [{ required: true, message: '请输入数量', type: 'number', min: 1 }],
};

// New Item Definition Drawer State
const isNewItemDefVisible = ref(false);
const newItemDefFormRef = ref<InstanceType<typeof ItemDefinitionForm> | null>(null);

// Lifecycle
onMounted(() => {
  itemDefinitionStore.fetchItemDefinitions();
  warehouseStore.fetchWarehouses();
  fetchQuickRemarks();
});

// Methods
const resetManualForm = () => {
  manualFormRef.value?.resetFields();
  manualFormState.remarks = '';
};

const handleAddToPrintList = async () => {
  try {
    await manualFormRef.value?.validate();
    const definition = itemDefinitionStore.itemDefinitions.find(d => d.id === manualFormState.itemDefinitionId);
    const warehouse = warehouseStore.warehouses.find(w => w.id === manualFormState.warehouseId);

    for (let i = 0; i < manualFormState.quantity; i++) {
      printList.value.push({
        tempId: Date.now() + i,
        itemDefinitionId: manualFormState.itemDefinitionId,
        warehouseId: manualFormState.warehouseId,
        remarks: manualFormState.remarks,
        definitionName: definition?.name,
        warehouseName: warehouse?.name,
      });
    }
    message.success(`${manualFormState.quantity}个物品已添加到待打印列表`);
    resetManualForm();
    activeTab.value = 'list'; // Switch to the list view
  } catch (error) {
    message.error('请填写所有必填项。');
  }
};

const handleRemoveFromPrintList = (index: number) => {
  printList.value.splice(index, 1);
};

const handleSaveAndPrint = async () => {
  isSaving.value = true;
  const savedItems = [];
  try {
    for (const item of printList.value) {
      const formData = new FormData();
      formData.append('itemDefinitionId', item.itemDefinitionId);
      formData.append('warehouseId', item.warehouseId);
      if (item.remarks) formData.append('remarks', item.remarks);
      const response = await apiClient.post('/items/create', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      savedItems.push(response.data);
    }
    message.success(`${printList.value.length}个新物品已成功保存!`);
    
    const idsToPrint = savedItems.map(item => item.id);
    // Mobile printing is complex, for now, we just clear the list
    // A proper implementation would require a dedicated print preview page or native printing capabilities
    console.log("IDs to print (mobile):", idsToPrint);
    message.info("请在电脑端进行打印操作。");
    
    printList.value = [];
    activeTab.value = 'form';
  } catch (error) {
    message.error('保存过程中发生错误。');
    console.error(error);
  } finally {
    isSaving.value = false;
  }
};

const handleNewItemDefSubmitted = (newItem: any) => {
  isNewItemDefVisible.value = false;
  manualFormState.itemDefinitionId = newItem.id;
};
</script>

<style scoped>
.page-container {
  padding: 16px;
}
</style>