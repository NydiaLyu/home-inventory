import './style.css'
import { addItem, deleteItem, listItems, updateItem } from './api'
import { renderItems } from './render'
import type { Item } from './types'

let editingId: number | null = null
let allItems: Item[] = []
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
  </main>
`

const input = document.querySelector<HTMLInputElement>('#item-input')!
const searchInput = document.querySelector<HTMLInputElement>('#search-input')!
const addBtn = document.querySelector<HTMLButtonElement>('#add-btn')!
const list = document.querySelector<HTMLUListElement>('#items')!

function getVisibleItems() {
  const normalizedSearch = searchTerm.trim().toLowerCase()
  if (!normalizedSearch) return allItems

  return allItems.filter((item) =>
    item.name.toLowerCase().includes(normalizedSearch),
  )
}

async function refresh() {
  allItems = await listItems()
  renderItems(list, getVisibleItems(), editingId)
}

addBtn.addEventListener('click', async () => {
  const name = input.value.trim()
  if (!name) return
  await addItem(name)
  input.value = ''
  await refresh()
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
  renderItems(list, getVisibleItems(), editingId)
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
    await updateItem(id, name)
    editingId = null
    await refresh()
    return
  }

  if (!target.matches('.delete-btn')) return

  await deleteItem(id)
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
    await updateItem(id, name)
    editingId = null
    await refresh()
  }

  if (event.key === 'Escape') {
    editingId = null
    await refresh()
  }
})

refresh()
