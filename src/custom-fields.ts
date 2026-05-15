import { addCustomField, listCustomFields } from './api'
import { renderCustomFields } from './render'

type CustomFieldElements = {
  input: HTMLInputElement
  button: HTMLButtonElement
  list: HTMLUListElement
}

export function setupCustomFields({ input, button, list }: CustomFieldElements) {
  async function refreshCustomFields() {
    const fields = await listCustomFields()
    renderCustomFields(list, fields)
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
