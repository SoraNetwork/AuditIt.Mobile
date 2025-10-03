import { defineStore } from 'pinia';
import apiClient from '../services/api';

export type ItemStatus = 'InStock' | 'LoanedOut' | 'Disposed' | 'SuspectedMissing';

export interface Item {
  id: string;
  shortId: string;
  itemDefinitionId: number;
  warehouseId: number;
  status: ItemStatus;
  lastUpdated: string;
  entryDate: string;
  remarks?: string;
  photoUrl?: string;
  currentDestination?: string;
  itemDefinition?: { id: number; name: string; };
  warehouse?: { id: number; name: string; };
}

interface CreateItemPayload {
  itemDefinitionId: number;
  warehouseId: number;
  shortId?: string;
  remarks?: string;
  photo?: File | null;
}

interface UpdateItemPayload {
  remarks?: string;
  currentDestination?: string;
  photo?: File | null;
  deletePhoto?: boolean;
}

interface ItemState {
  items: Item[];
  loading: boolean;
  error: string | null;
}

export const useItemStore = defineStore('item', {
  state: (): ItemState => ({
    items: [],
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

    async createItem(payload: CreateItemPayload): Promise<Item> {
      this.loading = true;
      this.error = null;
      try {
        const formData = new FormData();
        formData.append('itemDefinitionId', String(payload.itemDefinitionId));
        formData.append('warehouseId', String(payload.warehouseId));
        if (payload.shortId) formData.append('shortId', payload.shortId);
        if (payload.remarks) formData.append('remarks', payload.remarks);
        if (payload.photo) formData.append('photo', payload.photo);

        const response = await apiClient.post<Item>('/items/create', formData);
        this.items.unshift(response.data);
        return response.data;
      } catch (err: any) {
        this.error = '创建物品失败: ' + (err.response?.data?.message || err.message);
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async updateItem(itemId: string, payload: UpdateItemPayload) {
      this.loading = true;
      this.error = null;
      try {
        const formData = new FormData();
        // Always send remarks, even if empty, to allow clearing it.
        formData.append('remarks', payload.remarks || '');
        if (payload.currentDestination) {
          formData.append('currentDestination', payload.currentDestination);
        }

        if (payload.photo) {
          formData.append('photo', payload.photo);
        } else if (payload.deletePhoto) {
          formData.append('deletePhoto', 'true');
        }

        await apiClient.put(`/items/${itemId}`, formData);
        
        // Refetch the single item to get the latest state from server (e.g., new photoUrl)
        await this.fetchItems({ id: itemId });

      } catch (err: any) {
        this.error = '更新物品失败: ' + (err.response?.data?.message || err.message);
        throw err;
      } finally {
        this.loading = false;
      }
    },
    
    async transferWarehouse(itemId: string, newWarehouseId: number, remarks?: string): Promise<Item> {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.put<Item>(`/items/${itemId}/transfer`, {
          newWarehouseId,
          remarks
        });
        
        const index = this.items.findIndex(item => item.id === itemId);
        if (index !== -1) {
          this.items[index] = response.data;
        }
        
        return response.data;
      } catch (err: any) {
        this.error = `转移库房失败: ` + (err.response?.data?.message || err.message);
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async transferWarehouseBatch(itemIds: string[], newWarehouseId: number, remarks?: string) {
      this.loading = true;
      this.error = null;
      try {
        const promises = itemIds.map(id => 
          apiClient.put<Item>(`/items/${id}/transfer`, {
            newWarehouseId,
            remarks
          })
        );
        
        const responses = await Promise.all(promises);
        
        responses.forEach(response => {
          const index = this.items.findIndex(item => item.id === response.data.id);
          if (index !== -1) {
            this.items[index] = response.data;
          }
        });
        
        return responses.map(r => r.data);
      } catch (err: any) {
        this.error = `批量转移库房失败: ` + (err.response?.data?.message || err.message);
        throw err;
      } finally {
        this.loading = false;
      }
    },
    async updateItemStatus(itemId: string, action: 'outbound' | 'check' | 'return' | 'dispose', destination?: string) {
        this.loading = true;
        this.error = null;
        try {
            const response = await apiClient.put<Item>(`/items/${itemId}/${action}`, { destination });
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
    },

    async updateStatusBatch(itemIds: string[], status: ItemStatus) {
      this.loading = true;
      this.error = null;
      try {
        await apiClient.post('/items/update-status/batch', { itemIds, status });
        this.items = this.items.map(item => {
          if (itemIds.includes(item.id)) {
            return { ...item, status };
          }
          return item;
        });
      } catch (err: any) {
        this.error = `批量更新状态失败: ` + (err.response?.data?.message || err.message);
        throw err;
      } finally {
        this.loading = false;
      }
    }
  },
});