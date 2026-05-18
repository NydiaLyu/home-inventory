import { invoke } from '@tauri-apps/api/core'
import type { CustomField, CustomFieldValueInput, Item, ItemCustomFieldValue } from './types'

export function listItems() {
  return invoke<Item[]>('list_items')
}

export function addItem(name: string) {
  return invoke<Item>('add_item', { name })
}

export function updateItem(id: number, name: string) {
  return invoke('update_item', { id, name })
}

export function deleteItem(id: number) {
  return invoke('delete_item', { id })
}

export function listCustomFields() {
  return invoke<CustomField[]>('list_custom_fields')
}

export function addCustomField(name: string) {
  return invoke<CustomField>('add_custom_field', { name })
}

export function listItemCustomFieldValues() {
  return invoke<ItemCustomFieldValue[]>('list_item_custom_field_values')
}

export function setItemCustomFieldValues(itemId: number, values: CustomFieldValueInput[]) {
  return invoke('set_item_custom_field_values', { itemId, values })
}
