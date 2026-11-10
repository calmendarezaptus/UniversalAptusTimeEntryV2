// Development uses Vite's same-origin proxy; production keeps the configured API.
export const TIME_ENTRY_API = import.meta.env.DEV ? '/api/time-entry' : (import.meta.env.VITE_TIME_ENTRY_API_BASE_URL || 'https://timeentryforaptusfinancials-730085095.development.catalystserverless.com/server/time_entry_services').replace(/\/$/, '')

export interface TimePayload {
  project_id: string; user_id: string; task_name: string; log_date: string
  is_billable: boolean; notes: string; cf_referencia: string
  log_time?: string; begin_time?: string; end_time?: string; start_timer?: boolean
}

export function decimalToDuration(value: string): string {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new Error('El tiempo debe ser un número de horas válido.')
  const minutes = Math.round(Number(value) * 60)
  if (minutes > 5999) throw new Error('El tiempo excede el máximo permitido por registro.')
  return `${Math.floor(minutes / 60).toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}`
}

export function buildTimeEntries(input: {
  projectId?: string | null; userIds: Array<string | null | undefined>; taskName?: string
  date: string; notes: string; reference: string; mode: string
  billable: string; nonBillable: string; start: string; end: string
}): TimePayload[] {
  if (!input.projectId || !/^\d+$/.test(input.projectId)) throw new Error('Selecciona un proyecto con ID de Books válido. Si falta, actualiza el catálogo de proyectos.')
  if (!input.userIds.length || input.userIds.some(id => !id || !/^\d+$/.test(id))) throw new Error('Selecciona abogados con usuario de Books asociado. Actualiza el catálogo si falta esa información.')
  if (!input.taskName?.trim()) throw new Error('Selecciona una tarea.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !Number.isFinite(Date.parse(input.date)) || new Date(input.date).toISOString().slice(0, 10) !== input.date) throw new Error('Selecciona una fecha válida.')
  if (input.notes.length > 500) throw new Error('La descripción admite hasta 500 caracteres para guardar en Books. Reduce el texto; no se recortará automáticamente.')
  const parts: Array<Partial<TimePayload>> = []
  if (input.mode === 'cronometro') {
    if (new Set(input.userIds).size > 1) throw new Error('Inicia el cronómetro para un solo abogado a la vez.')
    parts.push({ is_billable: true, start_timer: true })
  } else {
    if (input.mode === 'inicia') {
      const valid = (value: string) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)
      if (!valid(input.start) || !valid(input.end) || input.end <= input.start) throw new Error('La hora final debe ser posterior a la inicial, dentro del mismo día.')
      const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3))
      const duration = minutes(input.end) - minutes(input.start)
      parts.push({ is_billable: true, log_time: `${Math.floor(duration / 60).toString().padStart(2, '0')}:${(duration % 60).toString().padStart(2, '0')}` })
    } else if (input.mode === 'horas') {
      const log_time = decimalToDuration(input.billable)
      if (log_time !== '00:00') parts.push({ is_billable: true, log_time })
    } else throw new Error('Selecciona cómo registrar el tiempo.')
    const log_time = decimalToDuration(input.nonBillable)
    if (log_time !== '00:00') parts.push({ is_billable: false, log_time })
  }
  if (!parts.length) throw new Error('Captura un tiempo mayor que cero.')
  return [...new Set(input.userIds)].flatMap(userId => parts.map(part => ({
    project_id: input.projectId!, user_id: userId!, task_name: input.taskName!, log_date: input.date,
    notes: input.notes, cf_referencia: input.reference, is_billable: true, ...part,
  })))
}

export async function postTimeEntry(organizationId: string, payload: TimePayload, timeEntryId?: string): Promise<string> {
  let response: Response
  try {
    response = await fetch(`${TIME_ENTRY_API}/${encodeURIComponent(organizationId)}/tiempos${timeEntryId ? `/${encodeURIComponent(timeEntryId)}` : ''}`, {
      method: timeEntryId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      signal: AbortSignal.timeout(180000),
    })
  } catch {
    throw Object.assign(new Error('Se perdió la respuesta. Revisa Books antes de repetir el guardado.'), { uncertain: true })
  }
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.time_entry?.time_entry_id) {
    const uncertain = data?.outcome_unknown === true || !data?.stage || (response.ok && !data?.time_entry?.time_entry_id)
    throw Object.assign(new Error(`${data?.error || 'No se pudo confirmar el guardado.'}${data?.stage ? ` Paso: ${data.stage}.` : ''}${data?.task_created ? ` La tarea ${data.task_id} sí fue creada.` : ''}${uncertain ? ' Revisa Books antes de repetir el guardado.' : ''}`), { uncertain })
  }
  if (payload.start_timer && !(String(data.time_entry.timer_started_at || '').trim() || String(data.time_entry.timer_started_at_utc_time || '').trim())) {
    throw Object.assign(new Error(`El registro ${data.time_entry.time_entry_id} se creó, pero Books no confirmó el inicio del cronómetro. Revisa ese registro en Books antes de guardar nuevamente.`), { uncertain: true })
  }
  return String(data.time_entry.time_entry_id)
}

export interface TimeEntryDetail {
  time_entry_id: string; project_id: string; task_id: string; task_name: string; user_id: string
  log_date: string; log_time: string; notes: string; is_billable: boolean
  timer_started_at?: string; timer_started_at_utc_time?: string
  timesheet_custom_fields?: Array<{ api_name: string; value: string }>
}
export async function getTimeEntry(organizationId: string, timeEntryId: string, signal: AbortSignal): Promise<TimeEntryDetail> {
  if (!/^\d+$/.test(timeEntryId)) throw new Error('El parámetro time_entry_id no es válido.')
  const response = await fetch(TIME_ENTRY_API + '/' + encodeURIComponent(organizationId) + '/tiempos/' + encodeURIComponent(timeEntryId), { signal })
  const data = await response.json().catch(() => null)
  if (!response.ok || data?.time_entry?.time_entry_id !== timeEntryId) throw new Error(data?.error || 'No se pudo cargar el tiempo. Comprueba que Catalyst esté actualizado.')
  const entry = data.time_entry
  if (typeof entry.is_billable !== 'boolean' || !/^\d{2,}:[0-5]\d$/.test(entry.log_time) || !/^\d{4}-\d{2}-\d{2}$/.test(entry.log_date)) throw new Error('El tiempo recibido tiene un formato inesperado.')
  return entry
}
