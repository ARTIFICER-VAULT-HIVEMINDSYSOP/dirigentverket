/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TRADERIDER_OFFLINE?: string
  /** Public prefix for Tradingskolan lesson files. Defaults to `../tradingskolan/`. */
  readonly VITE_TRADERIDER_LESSON_BASE?: string
}
