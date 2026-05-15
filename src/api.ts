import { invoke } from '@tauri-apps/api/core'
import type { CustomField, Item } from './types'

export function listItems() {
  return invoke<Item[]>('list_items')
}

export function addItem(name: string, location: string) {
  return invoke<Item>('add_item', { name, location })
}

export function updateItem(id: number, name: string, location: string) {
  return invoke('update_item', { id, name, location })
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
