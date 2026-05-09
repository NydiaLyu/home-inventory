import './style.css'
import { invoke } from '@tauri-apps/api/core'

type Item = {
  id: number
  name: string
  created_at: number
}

let editingId: number | null = null

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

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
    <section class="controls">
      <input id="item-input" type="text" placeholder="Add an item name" />
      <button id="add-btn" type="button">Add</button>
    </section>
    <section class="list">
      <h2>Items</h2>
      <ul id="items"></ul>
    </section>
  </main>
`

const input = document.querySelector<HTMLInputElement>('#item-input')!
const addBtn = document.querySelector<HTMLButtonElement>('#add-btn')!
const list = document.querySelector<HTMLUListElement>('#items')!

function render(items: Item[]) {
  list.innerHTML = items
    .map(
      (item) => {
        if (editingId === item.id) {
          return `
            <li data-item-id="${item.id}">
              <input
                class="edit-input"
                data-id="${item.id}"
                type="text"
                value="${escapeHtml(item.name)}"
              />
              <div class="item-actions">
                <button type="button" class="save-btn" data-id="${item.id}">Save</button>
                <button type="button" class="cancel-btn" data-id="${item.id}">Cancel</button>
              </div>
            </li>
          `
        }

        return `
          <li data-item-id="${item.id}">
            <span>${escapeHtml(item.name)}</span>
            <div class="item-actions">
              <button type="button" class="edit-btn" data-id="${item.id}">Edit</button>
              <button type="button" class="delete-btn" data-id="${item.id}">Delete</button>
            </div>
          </li>
        `
      },
    )
    .join('')
}

async function refresh() {
  const items = await invoke<Item[]>('list_items')
  render(items)
}

addBtn.addEventListener('click', async () => {
  const name = input.value.trim()
  if (!name) return
  await invoke<Item>('add_item', { name })
  input.value = ''
  await refresh()
})

input.addEventListener('keydown', async (event) => {
  if (event.key !== 'Enter') return
  addBtn.click()
})

list.addEventListener('click', async (event) => {
  const target = event.target as HTMLElement
  const id = Number(target.getAttribute('data-id'))
  if (!Number.isFinite(id)) return

  if (target.matches('.edit-btn')) {
    editingId = id
    await refresh()
    const editInput = document.querySelector<HTMLInputElement>(
      `.edit-input[data-id="${id}"]`,
    )
    editInput?.focus()
    editInput?.select()
    return
  }

  if (target.matches('.cancel-btn')) {
    editingId = null
    await refresh()
    return
  }

  if (target.matches('.save-btn')) {
    const editInput = document.querySelector<HTMLInputElement>(
      `.edit-input[data-id="${id}"]`,
    )
    const name = editInput?.value.trim() ?? ''
    if (!name) return
    await invoke('update_item', { id, name })
    editingId = null
    await refresh()
    return
  }

  if (!target.matches('.delete-btn')) return

  await invoke('delete_item', { id })
  if (editingId === id) {
    editingId = null
  }
  await refresh()
})

list.addEventListener('keydown', async (event) => {
  const target = event.target as HTMLInputElement
  if (!target.matches('.edit-input')) return

  const id = Number(target.getAttribute('data-id'))
  if (!Number.isFinite(id)) return

  if (event.key === 'Enter') {
    const name = target.value.trim()
    if (!name) return
    await invoke('update_item', { id, name })
    editingId = null
    await refresh()
  }

  if (event.key === 'Escape') {
    editingId = null
    await refresh()
  }
})

refresh()
