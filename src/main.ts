import './style.css'
import { invoke } from '@tauri-apps/api/core'

type Item = {
  id: number
  name: string
  created_at: number
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
    .map((item) => `<li><span>${item.name}</span></li>`)
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

refresh()
