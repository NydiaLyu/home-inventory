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
import { renderDetailsPanel, renderItems } from './render'
import { clearStatus, getErrorMessage, showStatus } from './status'
import type {
  CustomField,
  CustomFieldValueInput,
  CustomFieldValueMap,
  Item,
  SelectedDetail,
} from './types'

let editingId: number | null = null
let allItems: Item[] = []
let customFields: CustomField[] = []
let customFieldValues: CustomFieldValueMap = {}
let searchTerm = ''
let selectedDetail: SelectedDetail = null
let customFieldControls: { render: () => void } | undefined

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) {
  throw new Error('Missing #app element')
}

app.innerHTML = `
  <main class="container">
    <header class="app-header">
      <h1>Home Inventory</h1>
      <p>Browse, find, and update household items</p>
      <section class="top-search" aria-label="Search items">
        <input id="search-input" type="search" placeholder="Search items" />
      </section>
    </header>
    <div id="status-message" class="status-message" hidden></div>
    <div class="inventory-layout">
      <div class="module-stack">
        <details class="module-section items-section" open>
          <summary>
            <span>Items</span>
            <small>Add, browse, and edit household items</small>
          </summary>
          <div class="module-content">
            <section class="quick-add" aria-label="Add item">
              <input id="item-input" type="text" placeholder="Add an item name" />
              <button id="add-btn" type="button">Add</button>
            </section>
            <ul id="items"></ul>
          </div>
        </details>
        <details class="module-section spaces-section" open>
          <summary>
            <span>Spaces</span>
            <small>Prepare room and storage hierarchy</small>
          </summary>
          <div class="module-content">
            <p class="module-placeholder">Space hierarchy will be managed here.</p>
            <button class="placeholder-action" type="button" disabled>All spaces</button>
          </div>
        </details>
        <details class="module-section custom-fields" open>
          <summary>
            <span>Custom Fields</span>
            <small>Control extra item information</small>
          </summary>
          <div class="module-content">
            <div class="custom-field-controls">
              <input id="field-input" type="text" placeholder="Add a field name" />
              <button id="field-add-btn" type="button">Add</button>
            </div>
            <label class="field-sort-control">
              <span>Sort by:</span>
              <select id="field-sort-select" class="field-sort-select">
                <option value="most_used">Most used</option>
                <option value="recently_added">Recently added</option>
                <option value="earliest_added">Earliest added</option>
              </select>
            </label>
            <ul id="custom-fields"></ul>
          </div>
        </details>
      </div>
      <aside class="details-panel">
        <h2>Details</h2>
        <div id="details-panel-content"></div>
      </aside>
    </div>
  </main>
`

const input = document.querySelector<HTMLInputElement>('#item-input')!
const searchInput = document.querySelector<HTMLInputElement>('#search-input')!
const fieldInput = document.querySelector<HTMLInputElement>('#field-input')!
const fieldSortSelect = document.querySelector<HTMLSelectElement>('#field-sort-select')!
const statusMessage = document.querySelector<HTMLDivElement>('#status-message')!
const addBtn = document.querySelector<HTMLButtonElement>('#add-btn')!
const fieldAddBtn = document.querySelector<HTMLButtonElement>('#field-add-btn')!
const list = document.querySelector<HTMLUListElement>('#items')!
const detailsPanelContent = document.querySelector<HTMLElement>('#details-panel-content')!
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
  normalizeSelectedDetail()
  renderItems(list, getVisibleItems(), editingId, selectedDetail, customFields, customFieldValues)
  renderSelectedDetail()
}

function renderSelectedDetail() {
  renderDetailsPanel(
    detailsPanelContent,
    selectedDetail,
    allItems,
    customFields,
    customFieldValues,
  )
}

function normalizeSelectedDetail() {
  if (selectedDetail?.type === 'item' && !allItems.some((item) => item.id === selectedDetail?.id)) {
    selectedDetail = null
  }

  if (
    selectedDetail?.type === 'customField' &&
    !customFields.some((field) => field.id === selectedDetail?.id)
  ) {
    selectedDetail = null
  }
}

function toggleSelectedDetail(nextDetail: Exclude<SelectedDetail, null>) {
  selectedDetail =
    selectedDetail?.type === nextDetail.type && selectedDetail.id === nextDetail.id
      ? null
      : nextDetail
  renderVisibleItems()
  customFieldControls?.render()
}

async function refresh() {
  try {
    allItems = await listItems()
    customFieldValues = buildCustomFieldValueMap(await listItemCustomFieldValues())
    renderVisibleItems()
    customFieldControls?.render()
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

  if (target.matches('.edit-btn')) {
    if (!Number.isFinite(id)) return
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
    if (!Number.isFinite(id)) return
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

  if (target.matches('.delete-btn')) {
    if (!Number.isFinite(id)) return

    clearStatus(statusMessage)
    try {
      await deleteItem(id)
      if (editingId === id) {
        editingId = null
      }
      if (selectedDetail?.type === 'item' && selectedDetail.id === id) {
        selectedDetail = null
      }
      await refresh()
      showStatus(statusMessage, 'Item deleted', 'success')
    } catch (error) {
      showStatus(statusMessage, getErrorMessage(error), 'error')
    }
    return
  }

  const row = target.closest<HTMLLIElement>('.item-row')
  const rowId = Number(row?.dataset.itemId)
  if (Number.isFinite(rowId)) {
    clearStatus(statusMessage)
    toggleSelectedDetail({ type: 'item', id: rowId })
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
customFieldControls = setupCustomFields({
  input: fieldInput,
  button: fieldAddBtn,
  list: customFieldsList,
  sortSelect: fieldSortSelect,
  status: statusMessage,
  getCustomFieldValues: () => customFieldValues,
  getSelectedFieldId: () =>
    selectedDetail?.type === 'customField' ? selectedDetail.id : null,
  onSelectField: (id) => {
    toggleSelectedDetail({ type: 'customField', id })
  },
  onChange: (fields) => {
    customFields = fields
    renderVisibleItems()
  },
})

