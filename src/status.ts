export type StatusType = 'success' | 'error'

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return 'Something went wrong'
}

export function clearStatus(element: HTMLElement) {
  element.hidden = true
  element.textContent = ''
  element.className = 'status-message'
}

export function showStatus(element: HTMLElement, message: string, type: StatusType) {
  element.hidden = false
  element.textContent = message
  element.className = `status-message ${type}`
}
