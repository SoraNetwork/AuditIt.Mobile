<template>
  <div>
    <a-page-header title="入库操作" @back="router.back()" />
    <div class="page-container">
      <a-steps :current="currentStep">
        <a-step title="生成标签" />
        <a-step title="确认入库" />
      </a-steps>

      <div class="steps-content">
        <!-- Step 1: Generate Labels -->
        <div v-if="currentStep === 0">
          <a-form ref="form1Ref" :model="form1State" :rules="rules1" layout="vertical">
            <a-form-item label="入库物品" name="itemDefinitionId">
              <a-select v-model:value="form1State.itemDefinitionId" placeholder="请选择或新建物品" show-search>
                <template #dropdownRender="{ menuNode: menu }">
                  <component :is="menu" />
                  <a-divider style="margin: 4px 0" />
                  <a-space style="padding: 4px 8px"><a-button type="link" @click="isNewItemDefVisible = true">新建物品定义</a-button></a-space>
                </template>
                <a-select-option v-for="idef in itemDefStore.itemDefinitions" :key="idef.id" :value="idef.id">{{ idef.name }}</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="数量" name="quantity">
              <a-input-number v-model:value="form1State.quantity" :min="1" style="width: 100%" />
            </a-form-item>
            <a-form-item>
              <a-button type="primary" @click="handleGenerateLabels" block size="large">生成并打印标签</a-button>
            </a-form-item>
          </a-form>
        </div>

        <!-- Step 2: Confirm Inbound -->
        <div v-if="currentStep === 1">
          <a-alert :message="`已生成 ${itemStore.preInboundItems.length} 个待入库物品标签`" type="info" show-icon style="margin-bottom: 16px;" />
          <a-form ref="form2Ref" :model="form2State" :rules="rules2" layout="vertical">
            <a-form-item label="目标仓库" name="warehouseId">
              <a-select v-model:value="form2State.warehouseId" placeholder="请选择一个仓库" show-search>
                <a-select-option v-for="wh in warehouseStore.warehouses" :key="wh.id" :value="wh.id">{{ wh.name }}</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item>
              <a-space>
                <a-button @click="currentStep = 0">上一步</a-button>
                <a-button type="primary" @click="handleConfirmInbound" :loading="itemStore.loading" size="large">确认入库</a-button>
              </a-space>
            </a-form-item>
          </a-form>
        </div>
      </div>
    </div>

    <!-- Modals & Drawers -->
    <a-drawer title="新建物品定义" :width="'90%'" :open="isNewItemDefVisible" @close="isNewItemDefVisible = false">
      <ItemDefinitionForm ref="newItemDefFormRef" />
      <template #footer><a-button @click="isNewItemDefVisible = false">关闭</a-button></template>
    </a-drawer>
    <a-modal v-model:open="isPrintModalVisible" title="打印入库标签" width="95%" footer-null>
      <div class="print-controls"><a-button type="primary" @click="handlePrint">打印</a-button></div>
      <div id="print-area-mobile" class="label-grid">
        <div v-for="item in itemStore.preInboundItems" :key="item.id" class="label">
          <p class="item-name">{{ getItemDefName(item.itemDefinitionId) }}</p>
          <canvas :id="'qr-mobile-' + item.id" class="qrcode"></canvas>
          <p class="item-id">{{ item.shortId }}</p>
          <p class="date">{{ new Date().toLocaleDateString() }}</p>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useWarehouseStore } from '../stores/warehouseStore';
import { useItemDefinitionStore } from '../stores/itemDefinitionStore';
import { useItemStore } from '../stores/itemStore';
import ItemDefinitionForm from '../pages/ItemDefinitionForm.vue';
import { message } from 'ant-design-vue';
import type { FormInstance } from 'ant-design-vue';
import QRCode from 'qrcode';

const router = useRouter();
const warehouseStore = useWarehouseStore();
const itemDefStore = useItemDefinitionStore();
const itemStore = useItemStore();

const currentStep = ref(0);
const form1Ref = ref<FormInstance>();
const form2Ref = ref<FormInstance>();
const isNewItemDefVisible = ref(false);
const isPrintModalVisible = ref(false);

const form1State = reactive({ itemDefinitionId: undefined, quantity: 1 });
const form2State = reactive({ warehouseId: undefined });

const rules1 = { /* ... */ };
const rules2 = { /* ... */ };

onMounted(() => {
  warehouseStore.fetchWarehouses();
  itemDefStore.fetchItemDefinitions();
  itemStore.preInboundItems = [];
});

const handleGenerateLabels = async () => {
  try {
    await form1Ref.value?.validate();
    itemStore.preInbound(form1State.itemDefinitionId!, form1State.quantity);
    isPrintModalVisible.value = true;
    await nextTick();
    generateQRCodes();
  } catch { message.error('请选择物品和数量'); }
};

const handleConfirmInbound = async () => {
  try {
    await form2Ref.value?.validate();
    await itemStore.confirmInbound(form2State.warehouseId!);
    message.success('确认入库成功！');
    currentStep.value = 0;
    form1Ref.value?.resetFields();
    form2Ref.value?.resetFields();
  } catch { message.error('请选择目标仓库'); }
};

const generateQRCodes = () => {
  itemStore.preInboundItems.forEach(item => {
    const canvas = document.getElementById(`qr-mobile-${item.id}`);
    if (canvas) QRCode.toCanvas(canvas, item.shortId, { width: 60, margin: 1 }, e => e && console.error(e));
  });
};

const getItemDefName = (id: number) => itemDefStore.itemDefinitions.find(def => def.id === id)?.name || '未知';

const handlePrint = () => {
  const printContents = document.getElementById('print-area-mobile')?.innerHTML;
  if (printContents) {
    const printWindow = window.open('', '_blank');
    printWindow?.document.write('<html><head><title>打印标签</title><style>.label-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; } .label { border: 1px solid #000; padding: 5px; text-align: center; font-family: sans-serif; page-break-inside: avoid; } .item-name { font-weight: bold; font-size: 12px; } .qrcode { margin: 5px 0; } .item-id { font-size: 8px; } .date { font-size: 8px; }</style></head><body>');
    printWindow?.document.write(printContents);
    printWindow?.document.write('</body></html>');
    printWindow?.document.close();
    printWindow?.print();
  }
};
</script>

<style scoped>
.page-container { padding: 16px; }
.steps-content { margin-top: 24px; }
.print-controls { margin-bottom: 16px; text-align: right; }
.label-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; }
.label { border: 1px solid #ccc; padding: 5px; text-align: center; }
.item-name { font-weight: bold; font-size: 12px; }
.qrcode { margin: 5px 0; }
.item-id { font-size: 8px; }
.date { font-size: 8px; }
</style>