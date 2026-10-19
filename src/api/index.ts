/**
 * The one import every screen uses: `import { api } from '../api'`.
 * Real backend when VITE_API_URL is set, demo database otherwise.
 */
import { USE_MOCK } from './client'
import { httpApi, type Api } from './http'
import { mockApi } from './mock'

export const api: Api = USE_MOCK ? mockApi : httpApi
export { USE_MOCK }
export { ApiError, tokenStore, onUnauthorized } from './client'
export type * from './types'
