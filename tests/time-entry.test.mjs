import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'
const source = fs.readFileSync(new URL('../src/lib/time-entry.ts', import.meta.url), 'utf8').replace('import.meta.env.VITE_TIME_ENTRY_API_BASE_URL', 'undefined').replace('import.meta.env.DEV', 'true')
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText
const { buildTimeEntries, decimalToDuration, postTimeEntry, getTimeEntry } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))
const input = { projectId: '123', userIds: ['456'], taskName: 'Estándar', date: '2026-10-11', notes: 'Actividad', reference: 'Referencia', mode: 'horas', billable: '1.55', nonBillable: '0.00', start: '09:00', end: '17:00' }
test('decimal hours convert to minutes, not decimal digits', () => {
  assert.equal(decimalToDuration('1.55'), '01:33')
  assert.equal(decimalToDuration('0.25'), '00:15')
  assert.equal(decimalToDuration('1.50'), '01:30')
})
test('creates entries per lawyer and billing classification', () => {
  const entries = buildTimeEntries({ ...input, userIds: ['456', '789', '456'], nonBillable: '0.50' })
  assert.equal(entries.length, 4)
  assert.deepEqual(entries.map(e => e.user_id), ['456', '456', '789', '789'])
  assert.deepEqual(entries.map(e => e.is_billable), [true, false, true, false])
  assert.equal(entries[0].project_id, '123'); assert.equal(entries[0].cf_referencia, 'Referencia')
  assert.equal(entries[1].log_time, '00:30')
  assert.ok(!('cliente' in entries[0])); assert.ok(!('plantilla' in entries[0]))
})
test('validation rejects missing IDs, empty time, excessive notes and overnight range', () => {
  for (const patch of [{ projectId: null }, { userIds: [undefined] }, { userIds: [] }, { taskName: '' }, { billable: '0.00' }, { notes: 'x'.repeat(501) }, { mode: 'inicia', start: '17:00', end: '09:00' }]) assert.throws(() => buildTimeEntries({ ...input, ...patch }))
})
test('range and timer send mutually exclusive time representations', () => {
  const [range] = buildTimeEntries({ ...input, mode: 'inicia' })
  assert.equal(range.begin_time, undefined); assert.equal(range.end_time, undefined); assert.equal(range.log_time, '08:00')
  const [timer] = buildTimeEntries({ ...input, mode: 'cronometro' })
  assert.equal(timer.start_timer, true); assert.equal(timer.log_time, undefined)
  assert.throws(() => buildTimeEntries({ ...input, mode: 'cronometro', userIds: ['456', '789'] }))
})
test('POST contract and response handling without real writes', async () => {
  const original = globalThis.fetch
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, '/api/time-entry/123/tiempos'); assert.equal(options.method, 'POST')
      assert.equal(JSON.parse(options.body).user_id, '456')
      return new Response(JSON.stringify({ time_entry: { time_entry_id: '987' } }), { status: 201 })
    }
    assert.equal(await postTimeEntry('123', buildTimeEntries(input)[0]), '987')
    globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Datos inválidos', stage: 'validation', outcome_unknown: false }), { status: 400 })
    await assert.rejects(postTimeEntry('123', buildTimeEntries(input)[0]), e => e.uncertain === false)
    globalThis.fetch = async () => { throw new Error('Network') }
    await assert.rejects(postTimeEntry('123', buildTimeEntries(input)[0]), e => e.uncertain === true)
    globalThis.fetch = async () => new Response('<html>Gateway error</html>', { status: 502 })
    await assert.rejects(postTimeEntry('123', buildTimeEntries(input)[0]), e => e.uncertain === true)
  } finally { globalThis.fetch = original }
})

test('range preserves exact minutes and requires both times', () => {
  assert.equal(buildTimeEntries({ ...input, mode: 'inicia', start: '09:17', end: '10:20' })[0].log_time, '01:03')
  for (const [start,end] of [['',''],['09:00',''],['','10:00'],['09:00','09:00']]) assert.throws(() => buildTimeEntries({...input,mode:'inicia',start,end}))
})
test('timer success requires Books to confirm a started timer', async () => {
  const original=globalThis.fetch
  try {
    const payload=buildTimeEntries({...input,mode:'cronometro'})[0]
    globalThis.fetch=async()=>new Response(JSON.stringify({time_entry:{time_entry_id:'987',timer_started_at:'2026-10-11T12:00:00'}}),{status:201})
    assert.equal(await postTimeEntry('123',payload),'987')
    globalThis.fetch=async()=>new Response(JSON.stringify({time_entry:{time_entry_id:'987',timer_started_at:''}}),{status:201})
    await assert.rejects(postTimeEntry('123',payload),e=>e.uncertain && e.message.includes('987'))
  } finally {globalThis.fetch=original}
})

test('edit loads by ID and sends PUT to the same ID', async () => {
 const original=globalThis.fetch;
 try {
  const entry={time_entry_id:'987',is_billable:false,log_date:'2026-10-11',log_time:'00:01'};
  globalThis.fetch=async(url,options)=>{assert.ok(url.endsWith('/123/tiempos/987'));return new Response(JSON.stringify({time_entry:entry}))};
  assert.equal((await getTimeEntry('123','987',new AbortController().signal)).is_billable,false);
  await assert.rejects(getTimeEntry('123','',new AbortController().signal));
  globalThis.fetch=async(url,options)=>{assert.ok(url.endsWith('/987'));assert.equal(options.method,'PUT');return new Response(JSON.stringify({time_entry:entry}))};
  assert.equal(await postTimeEntry('123',buildTimeEntries(input)[0],'987'),'987');
 } finally {globalThis.fetch=original}
});
