import type { Attachment, CustomField, CustomFieldValueMap, Item, SelectedDetail } from './types'

function createButton(label: string, className: string, id: number) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = className
  button.dataset.id = String(id)
  button.textContent = label
  return button
}

function createTextInput(className: string, id: number, value: string, placeholder?: string) {
  const input = document.createElement('input')
  input.type = 'text'
  input.className = className
  input.dataset.id = String(id)
  input.value = value
  if (placeholder) {
    input.placeholder = placeholder
  }
  return input
}

function createEmptyState(message: string) {
  const item = document.createElement('li')
  item.className = 'empty-state'
  item.textContent = message
  return item
}

function createActions(buttons: HTMLButtonElement[]) {
  const actions = document.createElement('div')
  actions.className = 'item-actions'
  actions.append(...buttons)
  return actions
}

// ── List items ──

function createDisplayItem(
  item: Item,
  customFields: CustomField[],
  customFieldValues: CustomFieldValueMap,
  selectedDetail: SelectedDetail,
) {
  const row = document.createElement('li')
  row.className = 'item-row'
  row.dataset.itemId = String(item.id)
  if (selectedDetail?.type === 'item' && selectedDetail.id === item.id) {
    row.classList.add('selected-row')
  }

  const summary = document.createElement('div')
  summary.className = 'item-summary'

  const main = document.createElement('div')
  main.className = 'item-main'

  const name = document.createElement('span')
  name.className = 'item-name'
  name.textContent = item.name

  main.append(name)

  const itemCustomValues = customFieldValues[item.id] ?? {}
  const filledCustomFields = customFields.filter((field) => itemCustomValues[field.id])
  if (filledCustomFields.length > 0) {
    const customValues = document.createElement('div')
    customValues.className = 'item-custom-values'
    customValues.append(
      ...filledCustomFields.map((field) => {
        const value = document.createElement('span')
        value.textContent = `${field.name}: ${itemCustomValues[field.id]}`
        return value
      }),
    )
    main.append(customValues)
  }

  summary.append(
    main,
    createActions([
      createButton('Delete', 'delete-btn', item.id),
    ]),
  )

  row.append(summary)
  return row
}

export function renderItems(
  list: HTMLUListElement,
  items: Item[],
  selectedDetail: SelectedDetail,
  customFields: CustomField[],
  customFieldValues: CustomFieldValueMap,
) {
  if (items.length === 0) {
    list.replaceChildren(createEmptyState('No items found'))
    return
  }

  list.replaceChildren(
    ...items.map((item) => createDisplayItem(item, customFields, customFieldValues, selectedDetail)),
  )
}

// ── Detail panel ──

function formatCreatedAt(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleString()
}

function createDetailRow(labelText: string, valueText: string) {
  const row = document.createElement('div')
  row.className = 'detail-row'

  const label = document.createElement('dt')
  label.textContent = labelText

  const value = document.createElement('dd')
  value.textContent = valueText

  row.append(label, value)
  return row
}

function createDetailHeader(title: string, actions: HTMLButtonElement[]) {
  const header = document.createElement('div')
  header.className = 'detail-header'

  const titleEl = document.createElement('h2')
  titleEl.textContent = title

  const actionsEl = document.createElement('div')
  actionsEl.className = 'detail-header-actions'
  actionsEl.append(...actions)

  header.append(titleEl, actionsEl)
  return header
}

// ── Item detail: view mode ──

export function renderItemDetailView(
  container: HTMLElement,
  item: Item,
  customFields: CustomField[],
  customFieldValues: CustomFieldValueMap,
  attachments: Attachment[],
  attachmentUrls: Map<number, string>,
  onImageClick?: (id: number) => void,
) {
  container.replaceChildren()

  const header = createDetailHeader(item.name, [
    createButton('Edit', 'edit-btn detail-edit-btn', item.id),
  ])
  container.append(header)

  const details = document.createElement('dl')
  details.className = 'detail-list'
  details.append(
    createDetailRow('Name', item.name),
    createDetailRow('Created', formatCreatedAt(item.created_at)),
  )

  const itemCustomValues = customFieldValues[item.id] ?? {}
  const filledCustomFields = customFields.filter((field) => itemCustomValues[field.id]?.trim())

  if (filledCustomFields.length > 0) {
    details.append(
      ...filledCustomFields.map((field) =>
        createDetailRow(field.name, itemCustomValues[field.id]),
      ),
    )
  }

  container.append(details)

  const attachSection = createAttachmentsView(attachments, attachmentUrls, onImageClick)
  container.append(attachSection)
}

// ── Item detail: edit mode ──

export function renderItemDetailEdit(
  container: HTMLElement,
  item: Item,
  customFields: CustomField[],
  customFieldValues: CustomFieldValueMap,
  attachments: Attachment[],
  attachmentUrls: Map<number, string>,
) {
  container.replaceChildren()

  const header = createDetailHeader('Edit Item', [
    createButton('Save', 'save-btn detail-save-btn', item.id),
    createButton('Cancel', 'cancel-btn detail-cancel-btn', item.id),
  ])
  container.append(header)

  // Edit form
  const form = document.createElement('div')
  form.className = 'detail-edit-form'

  const nameField = document.createElement('label')
  nameField.className = 'detail-edit-field'
  nameField.append(
    Object.assign(document.createElement('span'), { textContent: 'Name' }),
    createTextInput('edit-input detail-name-input', item.id, item.name),
  )
  form.append(nameField)

  if (customFields.length > 0) {
    const customSection = document.createElement('div')
    customSection.className = 'detail-custom-fields-edit'

    customFields.forEach((field) => {
      const fieldLabel = document.createElement('label')
      fieldLabel.className = 'detail-edit-field'

      const input = createTextInput(
        'edit-input custom-field-value-input',
        item.id,
        customFieldValues[item.id]?.[field.id] ?? '',
      )
      input.dataset.fieldId = String(field.id)

      fieldLabel.append(
        Object.assign(document.createElement('span'), { textContent: field.name }),
        input,
      )
      customSection.append(fieldLabel)
    })

    form.append(customSection)
  }

  container.append(form)

  // Attachments section (with delete buttons in edit mode)
  const attachSection = createAttachmentsEdit(attachments, attachmentUrls)
  container.append(attachSection)
}

// ── Attachments display ──

function isImageMime(mime: string) {
  return mime.startsWith('image/')
}

function createAttachmentsView(
  attachments: Attachment[],
  urls: Map<number, string>,
  onImageClick?: (id: number) => void,
) {
  const section = document.createElement('div')
  section.className = 'detail-attachments'

  const title = document.createElement('h3')
  title.textContent = 'Attachments'
  section.append(title)

  if (attachments.length === 0) {
    const empty = document.createElement('p')
    empty.className = 'attachment-empty'
    empty.textContent = 'No attachments'
    section.append(empty)
    return section
  }

  const grid = document.createElement('div')
  grid.className = 'attachment-grid'

  for (const att of attachments) {
    const card = document.createElement('div')
    card.className = 'attachment-card'
    card.dataset.attachmentId = String(att.id)

    const url = urls.get(att.id)
    if (url && isImageMime(att.mime_type)) {
      const img = document.createElement('img')
      img.src = url
      img.alt = att.file_name
      img.className = 'attachment-thumb'
      img.loading = 'lazy'
      img.style.cursor = 'pointer'
      img.addEventListener('click', () => onImageClick?.(att.id))
      card.append(img)
    } else {
      const icon = document.createElement('div')
      icon.className = 'attachment-icon'
      icon.textContent = att.file_name.split('.').pop()?.toUpperCase() ?? 'FILE'
      card.append(icon)
    }

    const name = document.createElement('span')
    name.className = 'attachment-name'
    name.textContent = att.file_name
    card.append(name)

    grid.append(card)
  }

  section.append(grid)
  return section
}

function createAttachmentsEdit(
  attachments: Attachment[],
  urls: Map<number, string>,
) {
  const section = document.createElement('div')
  section.className = 'detail-attachments'

  const titleRow = document.createElement('div')
  titleRow.className = 'detail-header'
  const title = document.createElement('h3')
  title.textContent = 'Attachments'
  titleRow.append(title)
  section.append(titleRow)

  if (attachments.length === 0) {
    const empty = document.createElement('p')
    empty.className = 'attachment-empty'
    empty.textContent = 'No attachments'
    section.append(empty)
  } else {
    const grid = document.createElement('div')
    grid.className = 'attachment-grid'

    for (const att of attachments) {
      const card = document.createElement('div')
      card.className = 'attachment-card'
      card.dataset.attachmentId = String(att.id)

      const url = urls.get(att.id)
      if (url && isImageMime(att.mime_type)) {
        const img = document.createElement('img')
        img.src = url
        img.alt = att.file_name
        img.className = 'attachment-thumb'
        img.loading = 'lazy'
        card.append(img)
      } else {
        const icon = document.createElement('div')
        icon.className = 'attachment-icon'
        icon.textContent = att.file_name.split('.').pop()?.toUpperCase() ?? 'FILE'
        card.append(icon)
      }

      const name = document.createElement('span')
      name.className = 'attachment-name'
      name.textContent = att.file_name
      card.append(name)

      const delBtn = document.createElement('button')
      delBtn.type = 'button'
      delBtn.className = 'attachment-delete-btn'
      delBtn.dataset.attachmentId = String(att.id)
      delBtn.textContent = 'Remove'
      card.append(delBtn)

      grid.append(card)
    }

    section.append(grid)
  }

  // Upload area
  const uploadArea = document.createElement('div')
  uploadArea.className = 'attachment-upload-area'

  const uploadLabel = document.createElement('label')
  uploadLabel.className = 'attachment-upload-label'
  uploadLabel.textContent = 'Add images or files'

  const uploadInput = document.createElement('input')
  uploadInput.type = 'file'
  uploadInput.className = 'attachment-upload-input'
  uploadInput.multiple = true
  uploadInput.accept = 'image/*,application/pdf'
  uploadLabel.append(uploadInput)

  uploadArea.append(uploadLabel)
  section.append(uploadArea)

  return section
}

// ── Detail panel router ──

export function renderDetailsPanel(
  container: HTMLElement,
  selectedDetail: SelectedDetail,
  items: Item[],
  customFields: CustomField[],
  customFieldValues: CustomFieldValueMap,
  editingDetail: boolean,
  attachments: Attachment[],
  attachmentUrls: Map<number, string>,
  onImageClick?: (id: number) => void,
) {
  if (!selectedDetail) {
    const empty = document.createElement('p')
    empty.className = 'details-panel-empty'
    empty.textContent = 'Select an item or custom field to view details'
    container.replaceChildren(empty)
    return
  }

  if (selectedDetail.type === 'item') {
    const item = items.find((i) => i.id === selectedDetail.id)
    if (!item) {
      const missing = document.createElement('p')
      missing.className = 'details-panel-empty'
      missing.textContent = 'Selected item is no longer available'
      container.replaceChildren(missing)
      return
    }

    if (editingDetail) {
      renderItemDetailEdit(container, item, customFields, customFieldValues, attachments, attachmentUrls)
    } else {
      renderItemDetailView(container, item, customFields, customFieldValues, attachments, attachmentUrls, onImageClick)
    }
    return
  }

  const field = customFields.find((f) => f.id === selectedDetail.id)
  if (!field) {
    const missing = document.createElement('p')
    missing.className = 'details-panel-empty'
    missing.textContent = 'Selected detail is no longer available'
    container.replaceChildren(missing)
    return
  }

  container.replaceChildren(createCustomFieldDetails(field, customFieldValues))
}

function countFieldUsage(values: CustomFieldValueMap, fieldId: number) {
  return Object.values(values).filter((itemValues) => itemValues[fieldId]?.trim()).length
}

function createCustomFieldDetails(
  field: CustomField,
  customFieldValues: CustomFieldValueMap,
) {
  const container = document.createElement('section')
  container.className = 'details-panel-card'

  const header = document.createElement('div')
  header.className = 'detail-header'

  const title = document.createElement('h2')
  title.textContent = field.name
  header.append(title)

  const details = document.createElement('dl')
  details.className = 'detail-list'
  details.append(
    createDetailRow('Type', 'Custom field'),
    createDetailRow('Name', field.name),
    createDetailRow('Created', formatCreatedAt(field.created_at)),
    createDetailRow('Used by items', String(countFieldUsage(customFieldValues, field.id))),
  )

  container.replaceChildren(header, details)
  return container
}

// ── Custom fields list ──

export function renderCustomFields(
  list: HTMLUListElement,
  fields: CustomField[],
  editingFieldId: number | null = null,
  selectedFieldId: number | null = null,
) {
  if (fields.length === 0) {
    list.replaceChildren(createEmptyState('No custom fields'))
    return
  }

  list.replaceChildren(
    ...fields.map((field) => {
      const item = document.createElement('li')
      if (editingFieldId === field.id) {
        item.append(
          createTextInput('edit-input custom-field-edit-input', field.id, field.name),
          createActions([
            createButton('Save', 'save-field-btn save-btn', field.id),
            createButton('Cancel', 'cancel-field-btn cancel-btn', field.id),
          ]),
        )
        return item
      }

      item.className = 'custom-field-row'
      item.dataset.id = String(field.id)
      if (selectedFieldId === field.id) {
        item.classList.add('selected-row')
      }

      const name = document.createElement('span')
      name.className = 'custom-field-name'
      name.textContent = field.name
      item.append(
        name,
        createActions([
          createButton('Edit', 'edit-field-btn edit-btn', field.id),
          createButton('Delete', 'delete-field-btn delete-btn', field.id),
        ]),
      )
      return item
    }),
  )
}
