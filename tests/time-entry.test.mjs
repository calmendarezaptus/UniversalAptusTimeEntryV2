import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'

const source = fs.readFileSync(new URL('../src/lib/time-entry.ts', import.meta.url), 'utf8')
  .replace('import.meta.env.VITE_TIME_ENTRY_API_BASE_URL', 'undefined').replace('import.meta.env.VITE_CALENDAR_URL', 'undefined').replace('import.meta.env.DEV', 'true')
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText
const { buildTiempos, parseHours, rangeToHours, saveTiempo, getTiempo, lockReason, backupWarning } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))

const input = { projectId: '8', lawyerIds: ['6'], taskId: '1', date: '2026-11-11', notes: '  Revisión del contrato  ', mode: 'horas', billable: '1.25', nonBillable: '0.00', start: '09:00', end: '17:30' }

test('horas decimales: 1.25 = 1 h 15 min; máximo 2 decimales y 24 h', () => {
  assert.equal(parseHours('1.25'), 1.25)
  assert.equal(parseHours('0.00'), 0)
  for (const bad of ['1.234', '-1', 'abc', '25']) assert.throws(() => parseHours(bad))
  assert.equal(rangeToHours('09:00', '17:30'), 8.5)
  assert.equal(rangeToHours('09:00', '09:20'), 0.33)
})

test('un registro por abogado y clasificación, con IDs locales de Aptus', () => {
  const entries = buildTiempos({ ...input, lawyerIds: ['6', '7', '6'], nonBillable: '0.50' })
  assert.equal(entries.length, 4)
  assert.deepEqual(entries.map(e => e.abogado_id), [6, 6, 7, 7])
  assert.deepEqual(entries.map(e => e.facturable), [true, false, true, false])
  assert.deepEqual(entries[0], { abogado_id: 6, proyecto_id: 8, fecha: '2026-11-11', descripcion: 'Revisión del contrato', tarea_estandar_id: 1, horas: 1.25, facturable: true })
  assert.equal(entries[1].horas, 0.5)
  assert.ok(!('cf_referencia' in entries[0])); assert.ok(!('log_time' in entries[0]))
})

test('inicia / termina se convierte a horas facturables', () => {
  const [range] = buildTiempos({ ...input, mode: 'inicia' })
  assert.equal(range.horas, 8.5); assert.equal(range.facturable, true)
})

test('validaciones: proyecto, abogado, tarea, fecha, tiempo, descripción, rango y cronómetro', () => {
  for (const patch of [{ projectId: '' }, { lawyerIds: [] }, { lawyerIds: [undefined] }, { taskId: '' }, { date: '2026-02-30' }, { billable: '0.00' },
    { notes: 'x'.repeat(501) }, { mode: 'inicia', start: '17:00', end: '09:00' }, { mode: 'cronometro' }]) {
    assert.throws(() => buildTiempos({ ...input, ...patch }), undefined, JSON.stringify(patch))
  }
})

test('crear usa POST /tiempos y editar PATCH /tiempos/:id', async () => {
  const calls = []
  globalThis.fetch = async (url, options) => { calls.push({ url, options }); return { ok: true, status: 201, json: async () => ({ id: 73, books_estado: 'respaldado' }) } }
  const [entry] = buildTiempos(input)
  await saveTiempo('636939444', entry)
  await saveTiempo('636939444', { fecha: entry.fecha, horas: 2, descripcion: '', tarea_estandar_id: 1, facturable: true }, '73')
  assert.equal(calls[0].url, '/api/time-entry/636939444/tiempos'); assert.equal(calls[0].options.method, 'POST')
  assert.equal(JSON.parse(calls[0].options.body).abogado_id, 6)
  assert.equal(calls[1].url, '/api/time-entry/636939444/tiempos/73'); assert.equal(calls[1].options.method, 'PATCH')
})

test('red caída o respuesta sin id bloquean el reenvío; 409/422 de la API no', async () => {
  const [entry] = buildTiempos(input)
  globalThis.fetch = async () => { throw new Error('offline') }
  await assert.rejects(saveTiempo('1', entry), e => e.uncertain === true)
  globalThis.fetch = async () => ({ ok: true, status: 201, json: async () => ({}) })
  await assert.rejects(saveTiempo('1', entry), e => e.uncertain === true)
  globalThis.fetch = async () => ({ ok: false, status: 422, json: async () => ({ error: 'Pedro no tiene tarifa asignada en USD', stage: 'create_tiempo', outcome_unknown: false }) })
  await assert.rejects(saveTiempo('1', entry), e => e.uncertain === false && e.message === 'Pedro no tiene tarifa asignada en USD')
  globalThis.fetch = async () => ({ ok: false, status: 404, json: async () => { throw new Error('html') } })
  await assert.rejects(saveTiempo('1', entry), e => e.uncertain === false && /HTTP 404/.test(e.message))
})

test('getTiempo valida id y forma; candado igual al de la API', async () => {
  await assert.rejects(getTiempo('1', 'abc', new AbortController().signal))
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ id: 73, horas: '2', fecha: '2026-11-11', proyecto_id: 8, abogado_id: 6 }) })
  await assert.rejects(getTiempo('1', '73', new AbortController().signal), /formato inesperado/)
  assert.equal(lockReason({ facturado: 0, prebill_id: null, status: 'capturado' }), null)
  assert.match(lockReason({ facturado: 0, prebill_id: 9, status: 'en_prebill' }), /Prebill #9/)
  assert.match(lockReason({ facturado: 1, prebill_id: 9, status: 'facturado' }), /facturado/)
})

test('aviso de respaldo pendiente en Books', () => {
  assert.equal(backupWarning([{ books_estado: 'respaldado' }]), '')
  assert.match(backupWarning([{ books_estado: 'pendiente', books_error: 'Books no respondió.' }, { books_estado: 'respaldado' }]), /1 registro\(s\).*Books no respondió/)
})
