const API_BASE_URL = import.meta.env.VITE_API_URL || ''

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`
}

export function assetUrl(path?: string | null) {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `${API_BASE_URL}${path}`
}
