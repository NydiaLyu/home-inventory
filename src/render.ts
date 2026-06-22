import type { CustomField, CustomFieldValueMap, Item, SelectedDetail } from './types'

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

function createCustomFieldInput(item: Item, field: CustomField, customFieldValues: CustomFieldValueMap) {
  const fieldWrapper = document.createElement('label')
  fieldWrapper.className = 'custom-value-field'

  const label = document.createElement('span')
  label.textContent = field.name

  const input = createTextInput(
    'edit-input custom-field-value-input',
    item.id,
    customFieldValues[item.id]?.[field.id] ?? '',
  )
  input.dataset.fieldId = String(field.id)

  fieldWrapper.append(label, input)
  return fieldWrapper
}

function createEditableItem(
  item: Item,
  customFields: CustomField[],
  customFieldValues: CustomFieldValueMap,
) {
  const row = document.createElement('li')
  row.dataset.itemId = String(item.id)

  const fields = document.createElement('div')
  fields.className = 'edit-fields'
  fields.append(
    createTextInput('edit-input name-edit-input', item.id, item.name),
  )

  if (customFields.length > 0) {
    const customValueFields = document.createElement('div')
    customValueFields.className = 'custom-value-fields'
    customValueFields.append(
      ...customFields.map((field) => createCustomFieldInput(item, field, customFieldValues)),
    )
    fields.append(customValueFields)
  }

  row.append(
    fields,
    createActions([
      createButton('Save', 'save-btn', item.id),
      createButton('Cancel', 'cancel-btn', item.id),
    ]),
  )

  return row
}

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
      createButton('Edit', 'edit-btn', item.id),
      createButton('Delete', 'delete-btn', item.id),
    ]),
  )

  row.append(summary)

  if (selectedDetail?.type === 'item' && selectedDetail.id === item.id) {
    row.append(createItemDetails(item, customFields, customFieldValues))
  }

  return row
}

export function renderItems(
  list: HTMLUListElement,
  items: Item[],
  editingId: number | null,
  selectedDetail: SelectedDetail,
  customFields: CustomField[],
  customFieldValues: CustomFieldValueMap,
) {
  if (items.length === 0) {
    list.replaceChildren(createEmptyState('No items found'))
    return
  }

  list.replaceChildren(
    ...items.map((item) =>
      editingId === item.id
        ? createEditableItem(item, customFields, customFieldValues)
        : createDisplayItem(item, customFields, customFieldValues, selectedDetail),
    ),
  )
}

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

function createItemDetails(
  item: Item,
  customFields: CustomField[],
  customFieldValues: CustomFieldValueMap,
) {
  return createDetailsCard(item, customFields, customFieldValues, 'item-details')
}

function createDetailsCard(
  item: Item,
  customFields: CustomField[],
  customFieldValues: CustomFieldValueMap,
  className: string,
) {
  const container = document.createElement('section')
  container.className = className

  const header = document.createElement('div')
  header.className = 'detail-header'

  const title = document.createElement('h2')
  title.textContent = item.name

  header.append(title)

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

  const empty = document.createElement('p')
  empty.className = 'detail-empty'
  empty.textContent = 'No custom field values'

  container.replaceChildren(
    header,
    details,
    ...(filledCustomFields.length === 0 ? [empty] : []),
  )
  return container
}

function countFieldUsage(values: CustomFieldValueMap, fieldId: number) {
  return Object.values(values).filter((itemValues) => itemValues[fieldId]?.trim()).length
}

function createCustomFieldDetails(
  field: CustomField,
  customFieldValues: CustomFieldValueMap,
  className: string,
) {
  const container = document.createElement('section')
  container.className = className

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

export function renderDetailsPanel(
  container: HTMLElement,
  selectedDetail: SelectedDetail,
  items: Item[],
  customFields: CustomField[],
  customFieldValues: CustomFieldValueMap,
) {
  if (!selectedDetail) {
    const empty = document.createElement('p')
    empty.className = 'details-panel-empty'
    empty.textContent = 'Select an item or custom field to view details'
    container.replaceChildren(empty)
    return
  }

  if (selectedDetail.type === 'item') {
    const item = items.find((item) => item.id === selectedDetail.id)
    container.replaceChildren(
      item
        ? createDetailsCard(item, customFields, customFieldValues, 'details-panel-card')
        : createMissingDetail(),
    )
    return
  }

  const field = customFields.find((field) => field.id === selectedDetail.id)
  container.replaceChildren(
    field
      ? createCustomFieldDetails(field, customFieldValues, 'details-panel-card')
      : createMissingDetail(),
  )
}

function createMissingDetail() {
  const empty = document.createElement('p')
  empty.className = 'details-panel-empty'
  empty.textContent = 'Selected detail is no longer available'
  return empty
}

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
