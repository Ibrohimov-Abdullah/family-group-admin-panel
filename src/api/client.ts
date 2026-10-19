/**
 * HTTP client for the real backend.
 *
 * Set VITE_API_URL (e.g. https://api.familygroup.store/v1) in `.env` and every
 * call in src/api/http.ts goes to the server; leave it empty and the app runs
 * on the in-browser demo database (src/api/mock). Nothing in the UI changes.
 */

export const API_URL: string = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
export const USE_MOCK = API_URL === ''

const TOKEN_KEY = 'fg_admin_token'

export const tokenStore = {
  get: (): string | null => {
    try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
  },
  set: (token: string | null) => {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token)
      else localStorage.removeItem(TOKEN_KEY)
    } catch { /* private mode: session lasts until reload */ }
  },
}

/** An error the UI can show: `message` is safe to display, `status` is the HTTP code (0 = network). */
export class ApiError extends Error {
  status: number
  details?: unknown
  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.details = details
  }
}

/** Raised once on a 401 so the shell can sign the user out. */
export const onUnauthorized = new EventTarget()

type Query = Record<string, string | number | boolean | undefined | null>

function toQuery(params?: Query): string {
  if (!params) return ''
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

async function request<T>(method: string, path: string, body?: unknown, params?: Query): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = tokenStore.get()
  if (token) headers.Authorization = `Bearer ${token}`
  const isForm = body instanceof FormData
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}${toQuery(params)}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'network')
  }

  if (response.status === 401) onUnauthorized.dispatchEvent(new Event('unauthorized'))
  if (response.status === 204) return undefined as T

  const text = await response.text()
  const data = text ? safeJson(text) : undefined
  if (!response.ok) {
    const message = (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') ? data.message : `HTTP ${response.status}`
    throw new ApiError(response.status, message, data)
  }
  return data as T
}

function safeJson(text: string): unknown {
  try { return JSON.parse(text) } catch { return text }
}

export const http = {
  get: <T>(path: string, params?: Query) => request<T>('GET', path, undefined, params),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
  /** Binary download (Excel exports): returns a Blob. */
  download: async (path: string, params?: Query): Promise<Blob> => {
    const token = tokenStore.get()
    const response = await fetch(`${API_URL}${path}${toQuery(params)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    if (!response.ok) throw new ApiError(response.status, `HTTP ${response.status}`)
    return response.blob()
  },
}
