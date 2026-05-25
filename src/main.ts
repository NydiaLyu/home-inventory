import './style.css'
import {
  addItem,
  deleteItem,
  listItems,
  listItemCustomFieldValues,
  setItemCustomFieldValues,
  updateItem,
} from './api'
import { setupCustomFields } from './custom-fields'
import { renderItems } from './render'
import { clearStatus, getErrorMessage, showStatus } from './status'
import type { CustomField, CustomFieldValueInput, CustomFieldValueMap, Item } from './types'

let editingId: number | null = null
let allItems: Item[] = []
let customFields: CustomField[] = []
let customFieldValues: CustomFieldValueMap = {}
let searchTerm = ''

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) {
  throw new Error('Missing #app element')
}

app.innerHTML = `
  <main class="container">
    <header class="header">
      <h1>Home Inventory</h1>
      <p>Minimal local items list</p>
    </header>
    <div id="status-message" class="status-message" hidden></div>
    <section class="controls">
      <input id="item-input" type="text" placeholder="Add an item name" />
      <button id="add-btn" type="button">Add</button>
    </section>
    <section class="search">
      <input id="search-input" type="search" placeholder="Search items" />
    </section>
    <section class="list">
      <h2>Items</h2>
      <ul id="items"></ul>
    </section>
    <section class="custom-fields">
      <h2>Custom Fields</h2>
      <div class="custom-field-controls">
        <input id="field-input" type="text" placeholder="Add a field name" />
        <button id="field-add-btn" type="button">Add Field</button>
      </div>
      <ul id="custom-fields"></ul>
    </section>
  </main>
`

const input = document.querySelector<HTMLInputElement>('#item-input')!
const searchInput = document.querySelector<HTMLInputElement>('#search-input')!
const fieldInput = document.querySelector<HTMLInputElement>('#field-input')!
const statusMessage = document.querySelector<HTMLDivElement>('#status-message')!
const addBtn = document.querySelector<HTMLButtonElement>('#add-btn')!
const fieldAddBtn = document.querySelector<HTMLButtonElement>('#field-add-btn')!
const list = document.querySelector<HTMLUListElement>('#items')!
const customFieldsList = document.querySelector<HTMLUListElement>('#custom-fields')!

function getVisibleItems() {
  const normalizedSearch = searchTerm.trim().toLowerCase()
  if (!normalizedSearch) return allItems

  return allItems.filter((item) =>
    [
      item.name,
      ...Object.values(customFieldValues[item.id] ?? {}),
    ].some((value) =>
      value.toLowerCase().includes(normalizedSearch),
    ),
  )
}

function buildCustomFieldValueMap(values: Awaited<ReturnType<typeof listItemCustomFieldValues>>) {
  return values.reduce<CustomFieldValueMap>((map, value) => {
    map[value.item_id] ??= {}
    map[value.item_id][value.field_id] = value.value
    return map
  }, {})
}

function renderVisibleItems() {
  renderItems(list, getVisibleItems(), editingId, customFields, customFieldValues)
}

async function refresh() {
  try {
    allItems = await listItems()
    customFieldValues = buildCustomFieldValueMap(await listItemCustomFieldValues())
    renderVisibleItems()
  } catch (error) {
    showStatus(statusMessage, getErrorMessage(error), 'error')
  }
}

function getEditedCustomFieldValues(id: number): CustomFieldValueInput[] {
  const inputs = document.querySelectorAll<HTMLInputElement>(
    `.custom-field-value-input[data-id="${id}"]`,
  )
  return [...inputs].flatMap((input) => {
    const fieldId = Number(input.dataset.fieldId)
    if (!Number.isFinite(fieldId)) return []
    return [{ field_id: fieldId, value: input.value.trim() }]
  })
}

addBtn.addEventListener('click', async () => {
  const name = input.value.trim()
  if (!name) return
  clearStatus(statusMessage)
  try {
    await addItem(name)
    input.value = ''
    await refresh()
    showStatus(statusMessage, 'Item added', 'success')
  } catch (error) {
    showStatus(statusMessage, getErrorMessage(error), 'error')
  }
})

input.addEventListener('keydown', async (event) => {
  if (event.key !== 'Enter') return
  addBtn.click()
})

searchInput.addEventListener('input', () => {
  searchTerm = searchInput.value
  if (editingId !== null) {
    editingId = null
  }
  renderVisibleItems()
})

list.addEventListener('click', async (event) => {
  const target = event.target as HTMLElement
  const id = Number(target.getAttribute('data-id'))
  if (!Number.isFinite(id)) return

  if (target.matches('.edit-btn')) {
    clearStatus(statusMessage)
    editingId = id
    await refresh()
    const editInput = document.querySelector<HTMLInputElement>(
      `.name-edit-input[data-id="${id}"]`,
    )
    editInput?.focus()
    editInput?.select()
    return
  }

  if (target.matches('.cancel-btn')) {
    clearStatus(statusMessage)
    editingId = null
    await refresh()
    return
  }

  if (target.matches('.save-btn')) {
    const nameInput = document.querySelector<HTMLInputElement>(
      `.name-edit-input[data-id="${id}"]`,
    )
    const name = nameInput?.value.trim() ?? ''
    if (!name) return
    clearStatus(statusMessage)
    try {
      await updateItem(id, name)
      await setItemCustomFieldValues(id, getEditedCustomFieldValues(id))
      editingId = null
      await refresh()
      showStatus(statusMessage, 'Item saved', 'success')
    } catch (error) {
      showStatus(statusMessage, getErrorMessage(error), 'error')
    }
    return
  }

  if (!target.matches('.delete-btn')) return

  clearStatus(statusMessage)
  try {
    await deleteItem(id)
    if (editingId === id) {
      editingId = null
    }
    await refresh()
    showStatus(statusMessage, 'Item deleted', 'success')
  } catch (error) {
    showStatus(statusMessage, getErrorMessage(error), 'error')
  }
})

list.addEventListener('keydown', async (event) => {
  const target = event.target as HTMLInputElement
  if (!target.matches('.edit-input')) return

  const id = Number(target.getAttribute('data-id'))
  if (!Number.isFinite(id)) return

  if (event.key === 'Enter') {
    const nameInput = document.querySelector<HTMLInputElement>(
      `.name-edit-input[data-id="${id}"]`,
    )
    const name = nameInput?.value.trim() ?? ''
    if (!name) return
    clearStatus(statusMessage)
    try {
      await updateItem(id, name)
      await setItemCustomFieldValues(id, getEditedCustomFieldValues(id))
      editingId = null
      await refresh()
      showStatus(statusMessage, 'Item saved', 'success')
    } catch (error) {
      showStatus(statusMessage, getErrorMessage(error), 'error')
    }
  }

  if (event.key === 'Escape') {
    editingId = null
    await refresh()
  }
})

refresh()
setupCustomFields({
  input: fieldInput,
  button: fieldAddBtn,
  list: customFieldsList,
  status: statusMessage,
  onChange: (fields) => {
    customFields = fields
    refresh()
  },
})
