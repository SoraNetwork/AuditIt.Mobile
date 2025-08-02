import { defineStore } from 'pinia';
import apiClient from '../services/api';

export interface ItemDefinition {
  id: number;
  name: string;
  categoryId: number;
  unit: string;
  description: string;
  createdAt: string;
  category?: { id: number; name: string; };
}

// For creating a new definition, we don't need id, createdAt, or category
export type CreateItemDefinitionPayload = Omit<ItemDefinition, 'id' | 'createdAt' | 'category'>;

interface ItemDefinitionState {
  itemDefinitions: ItemDefinition[];
  loading: boolean;
  error: string | null;
}

export const useItemDefinitionStore = defineStore('itemDefinition', {
  state: (): ItemDefinitionState => ({
    itemDefinitions: [],
    loading: false,
    error: null,
  }),
  actions: {
    async fetchItemDefinitions() {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.get<ItemDefinition[]>('/itemDefinitions');
        // Sort by ID descending (newest first)
        this.itemDefinitions = response.data.sort((a, b) => b.id - a.id);
      } catch (err: any) {
        this.error = 'Failed to fetch item definitions: ' + (err.response?.data?.message || err.message);
        console.error(err);
      } finally {
        this.loading = false;
      }
    },
    async addItemDefinition(itemDefPayload: CreateItemDefinitionPayload): Promise<ItemDefinition> {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.post<ItemDefinition>('/itemDefinitions', itemDefPayload);
        // Add the new definition to the top of the list
        this.itemDefinitions.unshift(response.data);
        return response.data; // Return the new item
      } catch (err: any) {
        this.error = 'Failed to add item definition: ' + (err.response?.data?.message || err.message);
        console.error(err);
        throw err; // Re-throw to allow the form component to handle it
      } finally {
        this.loading = false;
      }
    },
    async updateItemDefinition(itemDef: Pick<ItemDefinition, 'id'> & Partial<ItemDefinition>) {
      this.loading = true;
      this.error = null;
      try {
        await apiClient.put(`/itemDefinitions/${itemDef.id}`, itemDef);
        // For simplicity, we'll refetch here, but a better implementation
        // would be to update the item in the list directly.
        await this.fetchItemDefinitions();
      } catch (err: any) {
        this.error = 'Failed to update item definition: ' + (err.response?.data?.message || err.message);
        console.error(err);
        throw err;
      } finally {
        this.loading = false;
      }
    },
    async deleteItemDefinition(id: number) {
      this.loading = true;
      this.error = null;
      try {
        await apiClient.delete(`/itemDefinitions/${id}`);
        // Remove the item from the list
        this.itemDefinitions = this.itemDefinitions.filter(def => def.id !== id);
      } catch (err: any) {
        this.error = 'Failed to delete item definition: ' + (err.response?.data?.message || err.message);
        console.error(err);
        throw err;
      } finally {
        this.loading = false;
      }
    },
  },
});
