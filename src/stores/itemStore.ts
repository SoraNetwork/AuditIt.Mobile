import { defineStore } from 'pinia';
import apiClient from '../services/api';
import { v4 as uuidv4 } from 'uuid';

export type ItemStatus = 'InStock' | 'LoanedOut' | 'Disposed';

export interface Item {
  id: string; // Changed to string for UUID
  shortId: string;
  itemDefinitionId: number;
  warehouseId: number;
  status: ItemStatus;
  lastUpdated: string;
  entryDate: string;
  itemDefinition?: { id: number; name: string; };
  warehouse?: { id: number; name: string; };
}

export interface PreInboundItem {
  id: string;
  shortId: string;
  itemDefinitionId: number;
}

interface ItemState {
  items: Item[];
  preInboundItems: PreInboundItem[];
  loading: boolean;
  error: string | null;
}

const generateShortId = (id: string): string => {
  return id.substring(0, 8).toUpperCase();
};

export const useItemStore = defineStore('item', {
  state: (): ItemState => ({
    items: [],
    preInboundItems: [],
    loading: false,
    error: null,
  }),
  actions: {
    async fetchItems(filters: { warehouseId?: number; status?: ItemStatus; id?: string; shortId?: string } = {}) {
      this.loading = true;
      this.error = null;
      try {
        const params = new URLSearchParams();
        if (filters.warehouseId) params.append('warehouseId', filters.warehouseId.toString());
        if (filters.status) params.append('status', filters.status);
        if (filters.id) params.append('id', filters.id);
        if (filters.shortId) params.append('shortId', filters.shortId);
        
        const response = await apiClient.get<Item[]>(`/items?${params.toString()}`);
        this.items = response.data;
      } catch (err: any) {
        this.error = '获取库存物品失败: ' + (err.response?.data?.message || err.message);
      } finally {
        this.loading = false;
      }
    },

    preInbound(itemDefinitionId: number, quantity: number) {
      this.preInboundItems = [];
      for (let i = 0; i < quantity; i++) {
        const newId = uuidv4();
        this.preInboundItems.push({
          id: newId, 
          shortId: generateShortId(newId),
          itemDefinitionId: itemDefinitionId,
        });
      }
    },

    async confirmInbound(warehouseId: number) {
      if (this.preInboundItems.length === 0) return;
      this.loading = true;
      this.error = null;
      try {
        const inboundPromises = this.preInboundItems.map(item => 
          apiClient.post<Item>('/items/inbound', { 
            itemDefinitionId: item.itemDefinitionId, 
            warehouseId: warehouseId 
          })
        );
        const responses = await Promise.all(inboundPromises);
        
        const newItems = responses.map(res => res.data);
        this.items.unshift(...newItems);

        this.preInboundItems = [];
      } catch (err: any) {
        this.error = '确认入库失败: ' + (err.response?.data?.message || err.message);
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async updateItemStatus(itemId: string, action: 'outbound' | 'check' | 'return' | 'dispose') {
        this.loading = true;
        this.error = null;
        try {
            const response = await apiClient.put<Item>(`/items/${itemId}/${action}`);
            const index = this.items.findIndex(item => item.id === itemId);
            if (index !== -1) {
              this.items[index] = response.data;
            }
        } catch (err: any) {
            this.error = `物品操作 '${action}' 失败: ` + (err.response?.data?.message || err.message);
            throw err;
        } finally {
            this.loading = false;
        }
    }
  },
});
