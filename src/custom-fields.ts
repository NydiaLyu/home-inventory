import { addCustomField, deleteCustomField, listCustomFields, updateCustomField } from './api'
import { renderCustomFields } from './render'
import { clearStatus, getErrorMessage, showStatus } from './status'
import type { CustomField } from './types'

type CustomFieldElements = {
  input: HTMLInputElement
  button: HTMLButtonElement
  list: HTMLUListElement
  status: HTMLElement
  onChange?: (fields: CustomField[]) => void
}

export function setupCustomFields({ input, button, list, status, onChange }: CustomFieldElements) {
  let fieldsCache: CustomField[] = []
  let editingFieldId: number | null = null

  function renderCurrentFields() {
    renderCustomFields(list, fieldsCache, editingFieldId)
    onChange?.(fieldsCache)
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
  list.addEventListener('click', (event) => {
    const target = event.target as HTMLElement
    const id = Number(target.dataset.id)
    if (!Number.isFinite(id)) return

    if (target.matches('.edit-field-btn')) {
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
      saveField(id)
      return
    }

    if (target.matches('.delete-field-btn')) {
      deleteField(id)
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
}
