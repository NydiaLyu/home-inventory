import type { CustomField, CustomFieldValueMap, Item } from './types'

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
) {
  const row = document.createElement('li')
  row.dataset.itemId = String(item.id)

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

  row.append(
    main,
    createActions([
      createButton('Edit', 'edit-btn', item.id),
      createButton('Delete', 'delete-btn', item.id),
    ]),
  )

  return row
}

export function renderItems(
  list: HTMLUListElement,
  items: Item[],
  editingId: number | null,
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
        : createDisplayItem(item, customFields, customFieldValues),
    ),
  )
}

export function renderCustomFields(list: HTMLUListElement, fields: CustomField[]) {
  if (fields.length === 0) {
    list.replaceChildren(createEmptyState('No custom fields'))
    return
  }

  list.replaceChildren(
    ...fields.map((field) => {
      const item = document.createElement('li')
      const name = document.createElement('span')
      name.textContent = field.name
      item.append(
        name,
        createButton('Delete', 'delete-field-btn delete-btn', field.id),
      )
      return item
    }),
  )
}
