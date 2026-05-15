import type { CustomField, Item } from './types'

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

function createEditableItem(item: Item) {
  const row = document.createElement('li')
  row.dataset.itemId = String(item.id)

  const fields = document.createElement('div')
  fields.className = 'edit-fields'
  fields.append(
    createTextInput('edit-input name-edit-input', item.id, item.name),
    createTextInput('edit-input location-edit-input', item.id, item.location, 'Location'),
  )

  row.append(
    fields,
    createActions([
      createButton('Save', 'save-btn', item.id),
      createButton('Cancel', 'cancel-btn', item.id),
    ]),
  )

  return row
}

function createDisplayItem(item: Item) {
  const row = document.createElement('li')
  row.dataset.itemId = String(item.id)

  const main = document.createElement('div')
  main.className = 'item-main'

  const name = document.createElement('span')
  name.className = 'item-name'
  name.textContent = item.name

  const location = document.createElement('span')
  location.className = 'item-location'
  location.textContent = item.location || 'No location'

  main.append(name, location)
  row.append(
    main,
    createActions([
      createButton('Edit', 'edit-btn', item.id),
      createButton('Delete', 'delete-btn', item.id),
    ]),
  )

  return row
}

export function renderItems(list: HTMLUListElement, items: Item[], editingId: number | null) {
  if (items.length === 0) {
    list.replaceChildren(createEmptyState('No items found'))
    return
  }

  list.replaceChildren(
    ...items.map((item) =>
      editingId === item.id ? createEditableItem(item) : createDisplayItem(item),
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
      item.append(name)
      return item
    }),
  )
}
