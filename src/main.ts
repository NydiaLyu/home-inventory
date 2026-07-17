import './style.css'
import {
  addItem,
  addAttachment,
  deleteAttachment,
  deleteItem,
  getAttachmentDataUrl,
  listAttachments,
  listItems,
  listItemCustomFieldValues,
  setItemCustomFieldValues,
  updateItem,
} from './api'
import { setupCustomFields } from './custom-fields'
import { renderDetailsPanel, renderItems } from './render'
import { clearStatus, getErrorMessage, showStatus } from './status'
import type {
  Attachment,
  CustomField,
  CustomFieldValueInput,
  CustomFieldValueMap,
  Item,
  SelectedDetail,
} from './types'

let allItems: Item[] = []
let customFields: CustomField[] = []
let customFieldValues: CustomFieldValueMap = {}
let searchTerm = ''
let selectedDetail: SelectedDetail = null
let customFieldControls: { render: () => void } | undefined

// Detail panel state
let detailEditMode = false
let itemAttachments: Attachment[] = []
let attachmentUrls: Map<number, string> = new Map()

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
  renderItems(list, getVisibleItems(), selectedDetail, customFields, customFieldValues)
  renderSelectedDetail()
}

function renderSelectedDetail() {
  renderDetailsPanel(
    detailsPanelContent,
    selectedDetail,
    allItems,
    customFields,
    customFieldValues,
    detailEditMode,
    itemAttachments,
    attachmentUrls,
  )
}

function normalizeSelectedDetail() {
  if (selectedDetail?.type === 'item' && !allItems.some((item) => item.id === selectedDetail?.id)) {
    selectedDetail = null
    detailEditMode = false
    itemAttachments = []
    attachmentUrls.clear()
  }

  if (
    selectedDetail?.type === 'customField' &&
    !customFields.some((field) => field.id === selectedDetail?.id)
  ) {
    selectedDetail = null
  }
}

function toggleSelectedDetail(nextDetail: Exclude<SelectedDetail, null>) {
  if (
    selectedDetail?.type === nextDetail.type &&
    selectedDetail.id === nextDetail.id
  ) {
    selectedDetail = null
    detailEditMode = false
    itemAttachments = []
    attachmentUrls.clear()
  } else {
    selectedDetail = nextDetail
    detailEditMode = false
  }
  renderVisibleItems()
  customFieldControls?.render()
}

async function loadAttachments(itemId: number) {
  try {
    itemAttachments = await listAttachments(itemId)
    attachmentUrls.clear()
    for (const att of itemAttachments) {
      if (att.mime_type.startsWith('image/')) {
        const url = await getAttachmentDataUrl(att.id)
        attachmentUrls.set(att.id, url)
      }
    }
  } catch {
    itemAttachments = []
    attachmentUrls.clear()
  }
}

async function refresh() {
  try {
    allItems = await listItems()
    customFieldValues = buildCustomFieldValueMap(await listItemCustomFieldValues())

    // Reload attachments if an item is selected
    if (selectedDetail?.type === 'item') {
      await loadAttachments(selectedDetail.id)
    }

    renderVisibleItems()
    customFieldControls?.render()
  } catch (error) {
    showStatus(statusMessage, getErrorMessage(error), 'error')
  }
}

function getEditedCustomFieldValues(): CustomFieldValueInput[] {
  const inputs = detailsPanelContent.querySelectorAll<HTMLInputElement>(
    '.custom-field-value-input',
  )
  return [...inputs].flatMap((input) => {
    const fieldId = Number(input.dataset.fieldId)
    if (!Number.isFinite(fieldId)) return []
    return [{ field_id: fieldId, value: input.value.trim() }]
  })
}

function getEditedItemName(): string {
  const nameInput = detailsPanelContent.querySelector<HTMLInputElement>('.detail-name-input')
  return nameInput?.value.trim() ?? ''
}

// ── Add item ──

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

// ── Search ──

searchInput.addEventListener('input', () => {
  searchTerm = searchInput.value
  renderVisibleItems()
})

// ── Item list events ──

list.addEventListener('click', async (event) => {
  const target = event.target as HTMLElement

  if (target.matches('.delete-btn')) {
    const id = Number(target.dataset.id)
    if (!Number.isFinite(id)) return

    clearStatus(statusMessage)
    try {
      await deleteItem(id)
      if (selectedDetail?.type === 'item' && selectedDetail.id === id) {
        selectedDetail = null
        detailEditMode = false
        itemAttachments = []
        attachmentUrls.clear()
      }
      await refresh()
      showStatus(statusMessage, 'Item deleted', 'success')
    } catch (error) {
      showStatus(statusMessage, getErrorMessage(error), 'error')
    }
    return
  }

  // Click on item row to select/deselect
  const row = target.closest<HTMLLIElement>('.item-row')
  const rowId = Number(row?.dataset.itemId)
  if (Number.isFinite(rowId)) {
    clearStatus(statusMessage)
    toggleSelectedDetail({ type: 'item', id: rowId })
    // Load attachments for the selected item
    if (selectedDetail?.type === 'item') {
      await loadAttachments(selectedDetail.id)
      renderSelectedDetail()
    }
  }
})

// ── Detail panel events ──

detailsPanelContent.addEventListener('click', async (event) => {
  const target = event.target as HTMLElement

  // Edit button in detail view
  if (target.matches('.detail-edit-btn')) {
    detailEditMode = true
    renderSelectedDetail()
    return
  }

  // Save button in detail edit mode
  if (target.matches('.detail-save-btn')) {
    const id = Number(target.dataset.id)
    if (!Number.isFinite(id)) return

    const name = getEditedItemName()
    if (!name) {
      showStatus(statusMessage, 'Name cannot be empty', 'error')
      return
    }

    clearStatus(statusMessage)
    try {
      await updateItem(id, name)
      await setItemCustomFieldValues(id, getEditedCustomFieldValues())
      detailEditMode = false
      await refresh()
      showStatus(statusMessage, 'Item saved', 'success')
    } catch (error) {
      showStatus(statusMessage, getErrorMessage(error), 'error')
    }
    return
  }

  // Cancel button in detail edit mode
  if (target.matches('.detail-cancel-btn')) {
    detailEditMode = false
    renderSelectedDetail()
    return
  }

  // Delete attachment button
  if (target.matches('.attachment-delete-btn')) {
    const attId = Number(target.dataset.attachmentId)
    if (!Number.isFinite(attId)) return

    clearStatus(statusMessage)
    try {
      await deleteAttachment(attId)
      if (selectedDetail?.type === 'item') {
        await loadAttachments(selectedDetail.id)
      }
      renderSelectedDetail()
      showStatus(statusMessage, 'Attachment removed', 'success')
    } catch (error) {
      showStatus(statusMessage, getErrorMessage(error), 'error')
    }
    return
  }
})

// ── Attachment upload ──

detailsPanelContent.addEventListener('change', async (event) => {
  const target = event.target as HTMLInputElement
  if (!target.matches('.attachment-upload-input')) return

  if (selectedDetail?.type !== 'item') return
  const itemId = selectedDetail.id

  const files = target.files
  if (!files || files.length === 0) return

  clearStatus(statusMessage)
  for (const file of Array.from(files)) {
    try {
      const buffer = await file.arrayBuffer()
      const fileData = Array.from(new Uint8Array(buffer))
      await addAttachment(itemId, file.name, file.type, fileData)
    } catch (error) {
      showStatus(statusMessage, getErrorMessage(error), 'error')
      target.value = ''
      return
    }
  }

  target.value = ''
  await loadAttachments(itemId)
  renderSelectedDetail()
  showStatus(statusMessage, 'Attachment(s) added', 'success')
})

// ── Custom fields ──

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

// Initial load
refresh()
