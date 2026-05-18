import { addCustomField, listCustomFields } from './api'
import { renderCustomFields } from './render'
import type { CustomField } from './types'

type CustomFieldElements = {
  input: HTMLInputElement
  button: HTMLButtonElement
  list: HTMLUListElement
  onChange?: (fields: CustomField[]) => void
}

export function setupCustomFields({ input, button, list, onChange }: CustomFieldElements) {
  async function refreshCustomFields() {
    const fields = await listCustomFields()
    renderCustomFields(list, fields)
    onChange?.(fields)
  }

  async function submitCustomField() {
    const name = input.value.trim()
    if (!name) return

    await addCustomField(name)
    input.value = ''
    await refreshCustomFields()
  }

  button.addEventListener('click', submitCustomField)
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return
    submitCustomField()
  })

  refreshCustomFields()
}
