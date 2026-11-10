import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'
const source=fs.readFileSync(new URL('../src/lib/templates.ts',import.meta.url),'utf8').replace("import { TIME_ENTRY_API } from './time-entry'","const TIME_ENTRY_API = '/api/time-entry'")
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.ESNext}}).outputText
const {listTemplates,createTemplate}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))
const template={id:'12',cf_clave:'TEST',cf_cliente:'1',cf_proyecto:'2',cf_abogado:'3',cf_tarea:'4',cf_registrar_como:'Horas',cf_horas_facturables:'5.00',cf_no_facturables:'0.00',cf_reference_number:'REF'}
test('loads template labels and Books lookup values',async()=>{
 const original=globalThis.fetch;try{
 globalThis.fetch=async(url)=>{assert.equal(url,'/api/time-entry/123/plantillas');return new Response(JSON.stringify([template]))}
 const rows=await listTemplates('123',new AbortController().signal);assert.equal(rows[0].cf_clave,'TEST');assert.equal(rows[0].cf_tarea,'4')
 globalThis.fetch=async()=>new Response(JSON.stringify({error:'Catálogo no disponible'}),{status:502})
 await assert.rejects(listTemplates('123',new AbortController().signal),/Catálogo no disponible/)
 }finally{globalThis.fetch=original}
})
test('creates template with independent request and returns its ID',async()=>{
 const original=globalThis.fetch;try{
 globalThis.fetch=async(url,options)=>{assert.equal(url,'/api/time-entry/123/plantillas');assert.equal(options.method,'POST');assert.equal(JSON.parse(options.body).cf_clave,'TEST');return new Response(JSON.stringify(template),{status:201})}
 assert.equal((await createTemplate('123',template)).id,'12')
 }finally{globalThis.fetch=original}
})
test('template failure distinguishes provider rejection from uncertain creation',async()=>{
 const original=globalThis.fetch;try{
 globalThis.fetch=async()=>new Response(JSON.stringify({error:'Rechazada',outcome_unknown:false}),{status:502})
 await assert.rejects(createTemplate('123',template),e=>e.uncertain===false)
 globalThis.fetch=async()=>{throw new Error('offline')}
 await assert.rejects(createTemplate('123',template),e=>e.uncertain===true)
 globalThis.fetch=async()=>new Response('bad',{status:502})
 await assert.rejects(createTemplate('123',template),e=>e.uncertain===true)
 }finally{globalThis.fetch=original}
})
