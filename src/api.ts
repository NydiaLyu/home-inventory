import { invoke } from '@tauri-apps/api/core'
import type { Item } from './types'

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
