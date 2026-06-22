import { addCustomField, deleteCustomField, listCustomFields, updateCustomField } from './api'
import { renderCustomFields } from './render'
import { clearStatus, getErrorMessage, showStatus } from './status'
import type { CustomField, CustomFieldValueMap, FieldSortMode } from './types'

type CustomFieldElements = {
  input: HTMLInputElement
  button: HTMLButtonElement
  list: HTMLUListElement
  sortSelect: HTMLSelectElement
  status: HTMLElement
  getCustomFieldValues: () => CustomFieldValueMap
  getSelectedFieldId?: () => number | null
  onChange?: (fields: CustomField[]) => void
  onSelectField?: (id: number) => void
}

function countFieldUsage(values: CustomFieldValueMap, fieldId: number) {
  return Object.values(values).filter((itemValues) => itemValues[fieldId]?.trim()).length
}

function sortFields(
  fields: CustomField[],
  sortMode: FieldSortMode,
  customFieldValues: CustomFieldValueMap,
) {
  return [...fields].sort((left, right) => {
    if (sortMode === 'most_used') {
      const leftUsage = countFieldUsage(customFieldValues, left.id)
      const rightUsage = countFieldUsage(customFieldValues, right.id)
      return rightUsage - leftUsage || right.created_at - left.created_at || right.id - left.id
    }

    if (sortMode === 'earliest_added') {
      return left.created_at - right.created_at || left.id - right.id
    }

    return right.created_at - left.created_at || right.id - left.id
  })
}

export function setupCustomFields({
  input,
  button,
  list,
  sortSelect,
  status,
  getCustomFieldValues,
  getSelectedFieldId,
  onChange,
  onSelectField,
}: CustomFieldElements) {
  let fieldsCache: CustomField[] = []
  let editingFieldId: number | null = null
  let sortMode = sortSelect.value as FieldSortMode

  function renderCurrentFields() {
    const sortedFields = sortFields(fieldsCache, sortMode, getCustomFieldValues())
    renderCustomFields(list, sortedFields, editingFieldId, getSelectedFieldId?.() ?? null)
    onChange?.(sortedFields)
  }

  async function refreshCustomFields() {
    try {
      fieldsCache = await listCustomFields()
      renderCurrentFields()
    } catch (error) {
      showStatus(status, getErrorMessage(error), 'error')
    }
  }

  async function submitCustomField() {
    const name = input.value.trim()
    if (!name) return

    clearStatus(status)
    try {
      await addCustomField(name)
      input.value = ''
      await refreshCustomFields()
      showStatus(status, 'Custom field added', 'success')
    } catch (error) {
      showStatus(status, getErrorMessage(error), 'error')
    }
  }

  async function deleteField(id: number) {
    clearStatus(status)
    try {
      await deleteCustomField(id)
      if (editingFieldId === id) {
        editingFieldId = null
      }
      await refreshCustomFields()
      showStatus(status, 'Custom field deleted', 'success')
    } catch (error) {
      showStatus(status, getErrorMessage(error), 'error')
    }
  }

  async function saveField(id: number) {
    const editInput = list.querySelector<HTMLInputElement>(
      `.custom-field-edit-input[data-id="${id}"]`,
    )
    const name = editInput?.value.trim() ?? ''
    if (!name) return

    clearStatus(status)
    try {
      await updateCustomField(id, name)
      editingFieldId = null
      await refreshCustomFields()
      showStatus(status, 'Custom field saved', 'success')
    } catch (error) {
      showStatus(status, getErrorMessage(error), 'error')
    }
  }

  button.addEventListener('click', submitCustomField)
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return
    submitCustomField()
  })
  sortSelect.addEventListener('change', () => {
    sortMode = sortSelect.value as FieldSortMode
    editingFieldId = null
    renderCurrentFields()
  })
  list.addEventListener('click', (event) => {
    const target = event.target as HTMLElement
    const id = Number(target.dataset.id)

    if (target.matches('.edit-field-btn')) {
      if (!Number.isFinite(id)) return
      clearStatus(status)
      editingFieldId = id
      renderCurrentFields()
      const editInput = list.querySelector<HTMLInputElement>(
        `.custom-field-edit-input[data-id="${id}"]`,
      )
      editInput?.focus()
      editInput?.select()
      return
    }

    if (target.matches('.cancel-field-btn')) {
      clearStatus(status)
      editingFieldId = null
      renderCurrentFields()
      return
    }

    if (target.matches('.save-field-btn')) {
      if (!Number.isFinite(id)) return
      saveField(id)
      return
    }

    if (target.matches('.delete-field-btn')) {
      if (!Number.isFinite(id)) return
      deleteField(id)
      return
    }

    const row = target.closest<HTMLLIElement>('.custom-field-row')
    const rowId = Number(row?.dataset.id)
    if (Number.isFinite(rowId)) {
      clearStatus(status)
      onSelectField?.(rowId)
    }
  })
  list.addEventListener('keydown', (event) => {
    const target = event.target as HTMLInputElement
    if (!target.matches('.custom-field-edit-input')) return

    const id = Number(target.dataset.id)
    if (!Number.isFinite(id)) return

    if (event.key === 'Enter') {
      saveField(id)
    }

    if (event.key === 'Escape') {
      editingFieldId = null
      renderCurrentFields()
    }
  })

  refreshCustomFields()
  return {
    render: renderCurrentFields,
  }
}
