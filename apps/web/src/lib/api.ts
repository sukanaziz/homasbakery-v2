const API_BASE_URL = import.meta.env.VITE_API_URL || ''
const DEFAULT_TIMEOUT_MS = 12_000

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`
}

export function assetUrl(path?: string | null) {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `${API_BASE_URL}${path}`
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(input, {
      ...init,
      signal: init.signal ?? controller.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Request timed out')
    }
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}
