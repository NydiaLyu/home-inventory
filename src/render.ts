import type { Item } from './types'

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function renderItems(list: HTMLUListElement, items: Item[], editingId: number | null) {
  if (items.length === 0) {
    list.innerHTML = `<li class="empty-state">No items found</li>`
    return
  }

  list.innerHTML = items
    .map((item) => {
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
    })
    .join('')
}
