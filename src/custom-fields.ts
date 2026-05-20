import { addCustomField, listCustomFields } from './api'
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
  async function refreshCustomFields() {
    try {
      const fields = await listCustomFields()
      renderCustomFields(list, fields)
      onChange?.(fields)
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

  button.addEventListener('click', submitCustomField)
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return
    submitCustomField()
  })

  refreshCustomFields()
}
