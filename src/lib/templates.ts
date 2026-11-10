import { TIME_ENTRY_API } from './time-entry'
export interface TemplateValues {
 cf_clave:string; cf_cliente:string; cf_proyecto:string; cf_abogado:string; cf_tarea:string
 cf_registrar_como:string; cf_horas_facturables:string; cf_no_facturables:string; cf_reference_number:string
}
export interface TimeTemplate extends TemplateValues { id:string }
export async function listTemplates(org:string,signal:AbortSignal):Promise<TimeTemplate[]> {
 const response=await fetch(TIME_ENTRY_API+'/'+encodeURIComponent(org)+'/plantillas',{signal})
 const data=await response.json().catch(()=>null)
 if(!response.ok || !Array.isArray(data) || !data.every(t=>typeof t.id==='string' && typeof t.cf_clave==='string')) throw new Error(data?.error||'No se pudieron cargar las plantillas.')
 return data
}
export async function createTemplate(org:string,payload:TemplateValues):Promise<TimeTemplate> {
 let response:Response
 try { response=await fetch(TIME_ENTRY_API+'/'+encodeURIComponent(org)+'/plantillas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(60000)}) }
 catch {throw Object.assign(new Error('El tiempo ya se guardó, pero no se recibió la respuesta de la plantilla. Revisa el módulo de plantillas antes de repetir.'),{uncertain:true})}
 const data=await response.json().catch(()=>null)
 if(!response.ok||!data?.id)throw Object.assign(new Error(data?.error||'No se confirmó la creación de la plantilla.'),{uncertain:data?.outcome_unknown===true||!data||response.ok})
 return data
}
