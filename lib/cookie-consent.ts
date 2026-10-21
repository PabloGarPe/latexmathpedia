// API mínima de la CMP de Google (mensaje de consentimiento de AdSense), que la sirve el
// propio script de AdSense cuando el mensaje está activo en la consola.
declare global {
  interface Window {
    googlefc?: {
      callbackQueue?: Record<string, () => void>[]
      showRevocationMessage?: () => void
    }
  }
}

// Vuelve a abrir la elección de consentimiento. Si la CMP no está activa o AdSense no se ha
// cargado (p. ej. para admins), la llamada se queda en la cola y no pasa nada.
export function showCookieSettings() {
  window.googlefc = window.googlefc || {}
  window.googlefc.callbackQueue = window.googlefc.callbackQueue || []
  window.googlefc.callbackQueue.push({
    CONSENT_DATA_READY: () => window.googlefc?.showRevocationMessage?.(),
  })
}
