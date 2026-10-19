/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend base URL, e.g. https://api.familygroup.store/v1. Empty = demo database. */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
