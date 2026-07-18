import { invoke } from '@tauri-apps/api/core'
import type { Attachment, CustomField, CustomFieldValueInput, Item, ItemCustomFieldValue } from './types'

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

export function deleteCustomField(id: number) {
  return invoke('delete_custom_field', { id })
}

export function updateCustomField(id: number, name: string) {
  return invoke('update_custom_field', { id, name })
}

export function listItemCustomFieldValues() {
  return invoke<ItemCustomFieldValue[]>('list_item_custom_field_values')
}

export function setItemCustomFieldValues(itemId: number, values: CustomFieldValueInput[]) {
  return invoke('set_item_custom_field_values', { itemId, values })
}

export function listAttachments(itemId: number) {
  return invoke<Attachment[]>('list_attachments', { itemId })
}

export function addAttachment(itemId: number, fileName: string, mimeType: string, fileData: number[]) {
  return invoke<Attachment>('add_attachment', { itemId, fileName, mimeType, fileData })
}

export function deleteAttachment(id: number) {
  return invoke('delete_attachment', { id })
}

export function getAttachmentDataUrl(id: number) {
  return invoke<string>('get_attachment_data_url', { id })
}

export function getThumbnailDataUrl(id: number) {
  return invoke<string>('get_thumbnail_data_url', { id })
}
