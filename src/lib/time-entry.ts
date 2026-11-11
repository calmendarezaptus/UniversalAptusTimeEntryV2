// Función del proyecto Tiempos (TimeEntryForAptusFinancials): time_entry_services.
// Desarrollo usa el proxy de Vite (mismo origen); VITE_TIME_ENTRY_API_BASE_URL la reemplaza si se define.
const FALLBACK_API = 'https://timeentryforaptusfinancials-730085095.development.catalystserverless.com/server/time_entry_services'
export const TIME_ENTRY_API = import.meta.env.DEV ? '/api/time-entry' : (import.meta.env.VITE_TIME_ENTRY_API_BASE_URL || FALLBACK_API).replace(/\/$/, '')

// A dónde regresa "Cancelar" si no llega ?origin= (calendario de tiempos).
export const CALENDAR_URL = import.meta.env.VITE_CALENDAR_URL || 'https://universal-timeentry-calendar.onslate.com/'

export const DESCRIPCION_MAX = 500

// Lo que se manda a ReportesSandbox (POST /tiempos). IDs locales de Aptus, horas decimales.
// La API guarda el tiempo con su tarifa y lo respalda en Books por su cuenta.
export interface TiempoPayload {
  abogado_id: number; proyecto_id: number; fecha: string; horas: number
  descripcion: string; tarea_estandar_id: number; facturable: boolean
}
export type TiempoUpdate = Omit<TiempoPayload, 'abogado_id' | 'proyecto_id'>

// Lo que devuelve ReportesSandbox para un tiempo (campos que usa la interfaz).
export interface Tiempo {
  id: number; abogado_id: number; proyecto_id: number; fecha: string; horas: number
  descripcion: string | null; tarea_estandar_id: number | null; tarea: string | null
  facturable: number; liberado: number; prebill_id: number | null; facturado: number; status: string
  books_estado?: string | null; books_error?: string | null; tarifa_aplicada?: number | null; moneda?: string | null
}

const intId = (value: string | null | undefined) => value && /^\d+$/.test(value) ? Number(value) : null

// Horas decimales: "1.25" = 1 h 15 min. Máximo 2 decimales y 24 h por registro.
export function parseHours(value: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) throw new Error('El tiempo debe ser un número de horas válido.')
  const hours = Number(value)
  if (hours > 24) throw new Error('Un registro no puede pasar de 24 horas.')
  return hours
}

// Inicia / Termina dentro del mismo día → horas decimales redondeadas a 2 decimales.
export function rangeToHours(start: string, end: string): number {
  const valid = (value: string) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)
  if (!valid(start) || !valid(end) || end <= start) throw new Error('La hora final debe ser posterior a la inicial, dentro del mismo día.')
  const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3))
  return Math.round((minutes(end) - minutes(start)) / 60 * 100) / 100
}

// Un registro por abogado y por clasificación (facturable / no facturable).
export function buildTiempos(input: {
  projectId?: string | null; lawyerIds: Array<string | null | undefined>; taskId?: string | null
  date: string; notes: string; mode: string; billable: string; nonBillable: string; start: string; end: string
}): TiempoPayload[] {
  const proyecto_id = intId(input.projectId)
  if (!proyecto_id) throw new Error('Selecciona un proyecto.')
  const lawyers = input.lawyerIds.map(id => intId(id))
  if (!lawyers.length || lawyers.some(id => !id)) throw new Error('Selecciona al menos un abogado.')
  const tarea_estandar_id = intId(input.taskId)
  if (!tarea_estandar_id) throw new Error('Selecciona una tarea.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !Number.isFinite(Date.parse(input.date)) || new Date(input.date).toISOString().slice(0, 10) !== input.date) throw new Error('Selecciona una fecha válida.')
  if (input.notes.length > DESCRIPCION_MAX) throw new Error(`La descripción admite hasta ${DESCRIPCION_MAX} caracteres (es la nota del tiempo en Books). Reduce el texto; no se recortará automáticamente.`)
  const parts: Array<{ horas: number; facturable: boolean }> = []
  if (input.mode === 'inicia') parts.push({ horas: rangeToHours(input.start, input.end), facturable: true })
  else if (input.mode === 'horas') {
    const billable = parseHours(input.billable)
    if (billable > 0) parts.push({ horas: billable, facturable: true })
  } else throw new Error('Selecciona cómo registrar el tiempo.')
  const nonBillable = parseHours(input.nonBillable)
  if (nonBillable > 0) parts.push({ horas: nonBillable, facturable: false })
  if (!parts.length) throw new Error('Captura un tiempo mayor que cero.')
  return [...new Set(lawyers as number[])].flatMap(abogado_id => parts.map(part => ({
    abogado_id, proyecto_id, fecha: input.date, descripcion: input.notes.trim(), tarea_estandar_id, ...part,
  })))
}

type Uncertain = Error & { uncertain?: boolean }
const fail = (message: string, uncertain: boolean) => Object.assign(new Error(message), { uncertain }) as Uncertain

export async function saveTiempo(organizationId: string, payload: TiempoPayload | TiempoUpdate, tiempoId?: string): Promise<Tiempo> {
  let response: Response
  try {
    response = await fetch(`${TIME_ENTRY_API}/${encodeURIComponent(organizationId)}/tiempos${tiempoId ? `/${encodeURIComponent(tiempoId)}` : ''}`, {
      method: tiempoId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      signal: AbortSignal.timeout(180000),
    })
  } catch {
    throw fail('Se perdió la respuesta. Revisa el calendario de tiempos antes de repetir el guardado.', true)
  }
  const data = await response.json().catch(() => null)
  // Un 4xx sin JSON (p. ej. la función desplegada no tiene la ruta) no se procesó: es reintentable.
  if (!response.ok && !data && response.status >= 400 && response.status < 500) {
    throw fail(response.status === 404
      ? 'La función de Catalyst no tiene esta ruta (HTTP 404). Despliega la versión actual de time_entry_services.'
      : `El servidor rechazó la petición (HTTP ${response.status}).`, false)
  }
  if (!response.ok || !Number.isInteger(data?.id)) {
    const uncertain = data?.outcome_unknown === true || !data?.stage || (response.ok && !Number.isInteger(data?.id))
    throw fail(`${data?.error || 'No se pudo confirmar el guardado.'}${uncertain ? ' Revisa el calendario de tiempos antes de repetir el guardado.' : ''}`, uncertain)
  }
  return data as Tiempo
}

export async function getTiempo(organizationId: string, tiempoId: string, signal: AbortSignal): Promise<Tiempo> {
  if (!/^\d+$/.test(tiempoId)) throw new Error('El parámetro tiempo_id no es válido.')
  const response = await fetch(`${TIME_ENTRY_API}/${encodeURIComponent(organizationId)}/tiempos/${encodeURIComponent(tiempoId)}`, { signal })
  const data = await response.json().catch(() => null)
  if (!response.ok || data?.id !== Number(tiempoId)) throw new Error(data?.error || 'No se pudo cargar el tiempo. Comprueba que Catalyst esté actualizado.')
  if (typeof data.horas !== 'number' || !/^\d{4}-\d{2}-\d{2}$/.test(data.fecha) || !Number.isInteger(data.proyecto_id) || !Number.isInteger(data.abogado_id)) throw new Error('El tiempo recibido tiene un formato inesperado.')
  return data as Tiempo
}

// La API rechaza (409) editar lo que ya está en una Prebill o facturado; se avisa antes.
export function lockReason(tiempo: Pick<Tiempo, 'facturado' | 'prebill_id' | 'status'>): string | null {
  if (tiempo.facturado === 1 || tiempo.status === 'facturado') return 'Este tiempo ya está facturado y no se puede editar.'
  if (tiempo.prebill_id != null || tiempo.status === 'en_prebill') return `Este tiempo ya está en la Prebill #${tiempo.prebill_id}. Quítalo de la Prebill para editarlo.`
  return null
}

// Aviso cuando ReportesSandbox guardó el tiempo pero no pudo respaldarlo en Books todavía.
export function backupWarning(saved: Tiempo[]): string {
  const pending = saved.filter(t => t.books_estado === 'pendiente')
  if (!pending.length) return ''
  const reasons = [...new Set(pending.map(t => t.books_error).filter(Boolean))].join(' ')
  return ` ${pending.length} registro(s) quedaron con respaldo pendiente en Books (se reintenta cada noche)${reasons ? `: ${reasons}` : '.'}`
}
