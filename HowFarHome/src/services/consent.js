// Consentimiento de cookies y contenido de terceros (RGPD + LSSI-CE art. 22.2, guía AEPD).
// Lo técnicamente necesario (votos, caché, este propio consentimiento) no lo pide.
import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'howfarhome:consent'
// Si cambian las finalidades, subir la versión vuelve a preguntar a todo el mundo.
const VERSION = 1
// La AEPD recomienda no guardar la elección más de 24 meses; volvemos a preguntar al año.
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000

export const CATEGORIES = ['external', 'ads']

const listeners = new Set()
let preferencesOpen = false
let current = read()

function read() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (saved?.version !== VERSION || Date.now() - saved.date > MAX_AGE_MS) return null
    return saved
  } catch {
    return null
  }
}

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Google Consent Mode v2: index.html arranca todo en «denied» y aquí se actualiza.
function updateGoogleConsent(choice) {
  const ads = choice?.ads ? 'granted' : 'denied'
  window.gtag?.('consent', 'update', {
    ad_storage: ads,
    ad_user_data: ads,
    ad_personalization: ads,
  })
}

export function getConsent() {
  return current
}

export function saveConsent(choice) {
  current = {
    version: VERSION,
    date: Date.now(),
    ...Object.fromEntries(CATEGORIES.map((category) => [category, Boolean(choice[category])])),
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch {
    // Sin almacenamiento la elección dura hasta recargar.
  }
  preferencesOpen = false
  updateGoogleConsent(current)
  emit()
}

// Activa una sola categoría sin tocar las demás (p. ej. «Cargar Street View»).
export function allow(category) {
  saveConsent({ ...current, [category]: true })
}

export function openPreferences() {
  preferencesOpen = true
  emit()
}

export function closePreferences() {
  preferencesOpen = false
  emit()
}

export function useConsent() {
  return useSyncExternalStore(subscribe, () => current)
}

export function usePreferencesOpen() {
  return useSyncExternalStore(subscribe, () => preferencesOpen)
}

updateGoogleConsent(current)
