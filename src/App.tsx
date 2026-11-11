import { listTemplates, createTemplate, type TimeTemplate, type TemplateValues } from '@/lib/templates'
import { ClockTimePicker } from '@/components/ClockTimePicker'
import { useState, useEffect, useMemo, useRef } from 'react'
import { buildTiempos, saveTiempo, getTiempo, lockReason, backupWarning, TIME_ENTRY_API, CALENDAR_URL, DESCRIPCION_MAX, type Tiempo, type TiempoPayload } from '@/lib/time-entry'
// import TimeEntryLogo from '@/assets/TimeEntryLogo.png'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Calendar as CalendarIcon,
  Check,
  ChevronsUpDown,
  Clock,
  Save,
  RefreshCw,
  Briefcase,
  User,
  FileText,
  Settings2,
  Play,
  Timer,
  Ban,
  Edit3,
  Info,
  SpellCheck2,
  Sparkles,
  // Palette,
  Settings
} from 'lucide-react'
import Typo from 'typo-js'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import 'animate.css'
import { StatusModal, type StatusModalType } from '@/components/StatusModal'
import { Toaster, toast } from 'sonner'

// ─── Design tokens ────────────────────────────────────────────────────────────
const THEMES = [
  { id: 'default', name: 'Navy Blue', color: '#1e3a8a' },
  { id: 'theme-coral', name: 'Coral', color: '#F74848' },
  { id: 'theme-emerald', name: 'Esmeralda', color: '#047857' },
  { id: 'theme-purple', name: 'Púrpura', color: '#6b21a8' },
  { id: 'theme-amber', name: 'Ámbar', color: '#b45309' },
  { id: 'theme-orange', name: 'Naranja', color: '#f97316' },
]
// ─────────────────────────────────────────────────────────────────────────────

// ─── ProfileImage ─────────────────────────────────────────────────────────────
const ProfileImage = ({ url, alt }: { url: string; alt: string }) => {
  const [hasError, setHasError] = useState(false)

  if (hasError || !url) {
    return <User className="w-4 h-4 text-slate-400" />
  }

  return <img src={url} alt={alt} className="w-full h-full object-cover" onError={() => setHasError(true)} />
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── TimePickerPopover ────────────────────────────────────────────────────────
// Self-contained component; manages its own temporary state (hour + increment)
// and calls onApply(formattedValue) only when the user confirms.
function TimePickerPopover({
  value,
  onApply,
  triggerClassName,
}: {
  value: string
  onApply: (value: string) => void
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const [hour, setHour] = useState(() => parseInt(value.split('.')[0]) || 0)
  const [increment, setIncrement] = useState(() => {
    const dec = value.split('.')[1] ?? '00'
    return `0.${dec.length === 1 ? dec + '0' : dec}`
  })

  const preview = `${hour}.${increment.replace('0.', '')}`

  function handleApply() {
    onApply(preview)
    setOpen(false)
  }

  function handleCancel() {
    // Reset temp state to last committed value on cancel
    setHour(parseInt(value.split('.')[0]) || 0)
    const dec = value.split('.')[1] ?? '00'
    setIncrement(`0.${dec.length === 1 ? dec + '0' : dec}`)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "h-7 w-7 rounded-full border-slate-200 text-slate-400 hover:text-theme-text hover:bg-theme-light hover:border-theme-border transition-all",
            triggerClassName
          )}
        >
          <Edit3 className="w-3.5 h-3.5" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[calc(100vw-24px)] max-w-[640px] max-h-[min(calc(100dvh-24px),var(--radix-popover-content-available-height))] overflow-y-auto md:w-auto md:min-w-[580px] p-4 md:p-5 rounded-2xl shadow-xl border border-slate-200 bg-white data-[state=open]:animate-[zoomIn_0.3s_ease-out] data-[state=closed]:animate-[zoomOut_0.3s_ease-in]"
        align="start"
        sideOffset={12}
      >
        <div className="flex flex-col md:flex-row gap-4">

          {/* HOURS grid */}
          <div className="bg-slate-50 rounded-xl p-4 flex-1 border border-slate-100">
            <div className="text-center text-[10px] font-bold mb-4 text-slate-500 uppercase tracking-widest">Horas</div>
            <div className="grid grid-cols-5 gap-1 sm:gap-2 justify-items-center">
              {[...Array(25)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setHour(i)}
                  className={cn(
                    "size-9 rounded-lg p-1 text-[13px] font-medium transition-all shadow-sm flex items-center justify-center shrink-0",
                    hour === i
                      ? "bg-gradient-to-r from-theme-from to-theme-to text-white shadow-md shadow-theme-from/30 font-bold scale-105"
                      : "bg-white text-slate-700 hover:bg-theme-light hover:text-theme-text border border-transparent hover:border-theme-border"
                  )}
                >
                  {i.toString().padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>

          {/* INCREMENTS */}
          <div className="bg-slate-50 rounded-xl p-4 w-full md:w-[130px] border border-slate-100 flex flex-col">
            <div className="text-center text-[10px] font-bold mb-4 text-slate-500 uppercase tracking-widest">Incrementos</div>
            <div className="flex flex-row md:flex-col gap-2 md:gap-2.5 flex-1 justify-center">
              {['0.25', '0.50', '0.75', '0.00'].map(inc => (
                <button
                  key={inc}
                  onClick={() => setIncrement(inc)}
                  className={cn(
                    "flex-1 md:flex-auto rounded-lg py-2.5 text-sm font-bold shadow-sm transition-all",
                    increment === inc
                      ? "bg-gradient-to-r from-theme-from to-theme-to text-white shadow-md shadow-theme-from/30"
                      : "bg-white text-slate-700 hover:bg-theme-light hover:text-theme-text border border-slate-100 hover:border-theme-border"
                  )}
                >
                  {inc}
                </button>
              ))}
            </div>
          </div>

          {/* Selected Time preview */}
          <div className="w-full md:w-[140px] flex flex-col">
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 md:p-4 py-6 flex-1 flex flex-col items-center justify-center">
              <div className="text-[11px] font-bold text-slate-900 mb-3 text-center">Tiempo seleccionado</div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight bg-gradient-to-r from-theme-from to-theme-to bg-clip-text text-transparent">
                  {preview}
                </span>
                <span className="text-theme-to font-semibold text-xs">hrs</span>
              </div>
            </div>
          </div>

        </div>

        {/* Actions */}
        <div className="mt-5 flex items-center justify-end gap-3 pr-1">
          <Button
            variant="outline"
            className="h-9 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-100 text-sm font-medium px-5"
            onClick={handleCancel}
          >
            Cancelar
          </Button>
          <Button
            className="h-9 bg-gradient-to-r from-theme-from to-theme-to hover:from-theme-to hover:to-theme-from text-white rounded-lg px-6 font-bold text-sm shadow-sm transition-all border-0"
            onClick={handleApply}
          >
            Aplicar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
// ─────────────────────────────────────────────────────────────────────────────

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('app_theme') || 'default')

  useEffect(() => {
    localStorage.setItem('app_theme', theme)
    document.documentElement.className = theme === 'default' ? '' : theme
  }, [theme])

  const [editId] = useState(() => new URLSearchParams(window.location.search).get('tiempo_id'))
  const [editDetail, setEditDetail] = useState<Tiempo | null>(null)
  const [editError, setEditError] = useState('')
  const [editReady, setEditReady] = useState(false)
  const editProject = useRef<string | null>(null)
  const editHydrated = useRef(false)
  const [templates, setTemplates] = useState<TimeTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [templatesError, setTemplatesError] = useState('')
  const [templatesReload, setTemplatesReload] = useState(0)
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [saveTemplate, setSaveTemplate] = useState(false)
  const [templateKey, setTemplateKey] = useState('')
  const [applyingTemplate, setApplyingTemplate] = useState(false)
  const templateProject = useRef<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveBlocked, setSaveBlocked] = useState(false)
  const [hasPendingSave, setHasPendingSave] = useState(false)
  const savingRef = useRef(false)
  const savedFingerprint = useRef('')
  const pendingSave = useRef<{ organizationId: string; fingerprint: string; entries: TiempoPayload[]; saved: Tiempo[]; template?: TemplateValues } | null>(null)
  const [date, setDate] = useState<Date>(new Date())
  const [billableTime, setBillableTime] = useState('0.00')
  const [nonBillableTime, setNonBillableTime] = useState<string>('0.00')

  // Organization state
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [statusModal, setStatusModal] = useState<{ isOpen: boolean, type: StatusModalType, title: string, message: string }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  })

  // Check URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const orgId = params.get('organization_id')

    if (!orgId) {
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Error de Inicialización',
        message: 'No se detectó la organización relacionada. Es necesario incluir el parámetro "organization_id" en la URL.'
      })
    } else {
      setOrganizationId(orgId)
    }
  }, [])

  // Spellcheck state
  const [description, setDescription] = useState('')
  const [isSpellcheckEnabled, setIsSpellcheckEnabled] = useState(true)
  const [spellcheckLang, setSpellcheckLang] = useState<'es' | 'en'>('es')

  const [isSpellchecking, setIsSpellchecking] = useState(false)
  const [spellcheckIndex, setSpellcheckIndex] = useState(0)
  const [misspelledWords, setMisspelledWords] = useState<{ word: string, start: number, end: number, suggestions: string[] }[]>([])
  const [showSpellcheckDialog, setShowSpellcheckDialog] = useState(false)

  const loadDictionary = async (lang: 'es' | 'en') => {
    const affixUrl = lang === 'es' ? './dict/es_aff.txt' : './dict/en_aff.txt'
    const dicUrl = lang === 'es' ? './dict/es_dic.txt' : './dict/en_dic.txt'

    const [affRes, dicRes] = await Promise.all([
      fetch(affixUrl),
      fetch(dicUrl)
    ])

    const affData = await affRes.text()
    const dicData = await dicRes.text()

    return new Typo(lang === 'es' ? 'es_ES' : 'en_US', affData, dicData)
  }

  const handleStartSpellcheck = async () => {
    setIsSpellchecking(true)
    try {
      const dict = await loadDictionary(spellcheckLang)

      const regex = /[\wáéíóúüñÁÉÍÓÚÜÑ]+/g;
      let match;
      const errors = [];
      while ((match = regex.exec(description)) !== null) {
        const word = match[0];
        if (!isNaN(Number(word))) continue;

        if (!dict.check(word)) {
          errors.push({
            word,
            start: match.index,
            end: match.index + word.length,
            suggestions: dict.suggest(word)
          })
        }
      }

      if (errors.length > 0) {
        setMisspelledWords(errors)
        setSpellcheckIndex(0)
        setShowSpellcheckDialog(true)
      } else {
        toast.success("No se encontraron errores ortográficos.")
      }
    } catch (error: any) {
      console.error("Error loading dictionary", error)
      toast.error(`Error al cargar el diccionario ortográfico: ${error.message || error}`)
    }
    setIsSpellchecking(false)
  }

  const handleReplace = (suggestion: string) => {
    const error = misspelledWords[spellcheckIndex]
    const newDesc = description.substring(0, error.start) + suggestion + description.substring(error.end)

    const diff = suggestion.length - error.word.length
    const newErrors = misspelledWords.map((e, i) => {
      if (i <= spellcheckIndex) return e;
      return {
        ...e,
        start: e.start + diff,
        end: e.end + diff
      }
    })

    setDescription(newDesc)
    setMisspelledWords(newErrors)

    if (spellcheckIndex + 1 < newErrors.length) {
      setSpellcheckIndex(spellcheckIndex + 1)
    } else {
      setShowSpellcheckDialog(false)
      toast.success("Revisión ortográfica completada.")
    }
  }

  const handleIgnore = () => {
    if (spellcheckIndex + 1 < misspelledWords.length) {
      setSpellcheckIndex(spellcheckIndex + 1)
    } else {
      setShowSpellcheckDialog(false)
      toast.success("Revisión ortográfica completada.")
    }
  }

  const [registrarComo, setRegistrarComo] = useState('horas')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  const [tasks, setTasks] = useState<Array<{ id: string; nombre: string; codigo_utbms: string | null; facturable: number }>>([])
  const [isTasksLoading, setIsTasksLoading] = useState(false)
  const [tasksError, setTasksError] = useState('')
  const [tasksReload, setTasksReload] = useState(0)
  const [selectedTask, setSelectedTask] = useState<string>('')

  // Clientes State
  const [clientes, setClientes] = useState<any[]>([])
  const [selectedCliente, setSelectedCliente] = useState<string>('')
  const [isClientesLoading, setIsClientesLoading] = useState(false)
  const [clienteSearch, setClienteSearch] = useState('')

  const filteredClientes = useMemo(() => {
    if (!clienteSearch) return clientes.slice(0, 100)
    const lower = clienteSearch.toLowerCase()
    return clientes.filter(c => c.display.toLowerCase().includes(lower)).slice(0, 100)
  }, [clientes, clienteSearch])

  // Proyectos State
  const [proyectos, setProyectos] = useState<Array<{ ID: string; zoho_id: string | null; display: string; tipo_cobro: string }>>([])
  const [selectedProyecto, setSelectedProyecto] = useState<string>('')
  const [isProyectosLoading, setIsProyectosLoading] = useState(false)
  const [proyectoSearch, setProyectoSearch] = useState('')
  // Retains the Books ID for future task resolution when saving.
  const selectedProyectoData = proyectos.find(p => p.ID === selectedProyecto)

  const filteredProyectos = useMemo(() => {
    if (!proyectoSearch) return proyectos.slice(0, 100)
    const lower = proyectoSearch.toLowerCase()
    return proyectos.filter(p => p.display.toLowerCase().includes(lower)).slice(0, 100)
  }, [proyectos, proyectoSearch])

  const loadProyectos = async (orgId: string, clienteId: string, forceRefresh = false) => {
    if (!orgId || !clienteId) {
      setProyectos([])
      return
    }

    const fullCacheKey = `all_proyectos_cache_${orgId}`
    const fullCacheTimeKey = `all_proyectos_cache_timestamp_${orgId}`

    setIsProyectosLoading(true)

    try {
      let allProjects = []
      const cached = localStorage.getItem(fullCacheKey)
      const cachedTime = localStorage.getItem(fullCacheTimeKey)
      let useCache = false

      if (!forceRefresh && cached && cachedTime) {
        const age = Date.now() - parseInt(cachedTime)
        if (age < 12 * 60 * 60 * 1000) {
          allProjects = JSON.parse(cached)
          useCache = true
        }
      }

      if (!useCache) {
        const response = await fetch(`${TIME_ENTRY_API}/${encodeURIComponent(orgId)}/proyectos`)
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`)
        allProjects = await response.json()
        localStorage.setItem(fullCacheKey, JSON.stringify(allProjects))
        localStorage.setItem(fullCacheTimeKey, Date.now().toString())
      }

      const filtered = allProjects.filter((p: any) => String(p.cliente_id) === String(clienteId))
      const mapped = filtered.map((r: any) => ({
        ID: String(r.id),
        zoho_id: r.zoho_id == null ? null : String(r.zoho_id),
        display: r.nombre_completo || r.nombre,
        tipo_cobro: r.tipo_cobro || 'horas',
      }))
      setProyectos(mapped)
      if (templateProject.current) {
        const target = mapped.find((p: { zoho_id: string | null }) => p.zoho_id === templateProject.current)
        if (target) setSelectedProyecto(target.ID)
        else throw new Error('Proyecto de plantilla no disponible.')
      }
      if (editProject.current) {
        const match = mapped.find((p: { ID: string }) => p.ID === editProject.current)
        if (match) { setSelectedProyecto(match.ID); setEditReady(true); editProject.current = null }
        else setEditError('El proyecto del tiempo no está disponible en el catálogo de este cliente.')
      }
    } catch (error) {
      console.error("Error fetching proyectos:", error)
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Error al cargar',
        message: 'No se pudieron cargar los proyectos. Por favor verifique su conexión e intente nuevamente.'
      })
      setProyectos([])
    } finally {
      setIsProyectosLoading(false)
      if (templateProject.current) { templateProject.current = null; setApplyingTemplate(false) }
    }
  }

  useEffect(() => {
    setSelectedProyecto('')
    if (organizationId && selectedCliente) {
      loadProyectos(organizationId, selectedCliente)
    } else {
      setProyectos([])
    }
  }, [organizationId, selectedCliente])

  useEffect(() => {
    setSelectedTask(current => tasks.length === 1
      ? tasks[0].id
      : tasks.some(task => task.id === current) ? current : '')
  }, [tasks])

  // Abogados State
  const [abogados, setAbogados] = useState<any[]>([])
  const [selectedAbogados, setSelectedAbogados] = useState<string[]>([])
  const [multipleAbogados, setMultipleAbogados] = useState(false)
  const [abogadoOpen, setAbogadoOpen] = useState(false)
  const [chooseSingleAbogado, setChooseSingleAbogado] = useState(false)
  const [isAbogadosLoading, setIsAbogadosLoading] = useState(false)
  const [abogadoSearch, setAbogadoSearch] = useState('')

  const filteredAbogados = useMemo(() => {
    if (!abogadoSearch) return abogados.slice(0, 100)
    const lower = abogadoSearch.toLowerCase()
    return abogados.filter(a => a.display.toLowerCase().includes(lower) || (a.secondary && a.secondary.toLowerCase().includes(lower))).slice(0, 100)
  }, [abogados, abogadoSearch])

  const loadAbogados = async (orgId: string, forceRefresh = false) => {
    if (!orgId) return;

    const cacheKey = `abogados_cache_v2_${orgId}`
    const cacheTimeKey = `abogados_cache_timestamp_v2_${orgId}`

    if (!forceRefresh) {
      const cached = localStorage.getItem(cacheKey)
      const cachedTime = localStorage.getItem(cacheTimeKey)
      if (cached && cachedTime) {
        const age = Date.now() - parseInt(cachedTime)
        if (age < 12 * 60 * 60 * 1000) {
          setAbogados(JSON.parse(cached))
          return
        }
      }
    }

    setIsAbogadosLoading(true)

    try {
      const response = await fetch(`${TIME_ENTRY_API}/${encodeURIComponent(orgId)}/abogados`)
      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`)
      const data = await response.json()

      const activos = data.filter((r: any) => r.status === 'activo')

      const mapped = activos.map((r: any) => ({
        ID: String(r.id),
        display: r.zoho_user_nombre || r.nombre,
        zoho_user_id: r.zoho_user_id == null ? null : String(r.zoho_user_id),
        secondary: r.tipo_nombre,
        fotoUrl: r.foto_url
      }))

      setAbogados(mapped)
      localStorage.setItem(cacheKey, JSON.stringify(mapped))
      localStorage.setItem(cacheTimeKey, Date.now().toString())
    } catch (error) {
      console.error("Error fetching abogados:", error)
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Error al cargar',
        message: 'No se pudieron cargar los abogados. Por favor verifique su conexión e intente nuevamente.'
      })
    } finally {
      setIsAbogadosLoading(false)
    }
  }

  useEffect(() => {
    if (organizationId) {
      loadAbogados(organizationId)
    }
  }, [organizationId])

  const loadClientes = async (orgId: string, forceRefresh = false) => {
    if (!orgId) return;

    const cacheKey = `clientes_cache_v2_${orgId}`
    const cacheTimeKey = `clientes_cache_timestamp_v2_${orgId}`

    if (!forceRefresh) {
      const cached = localStorage.getItem(cacheKey)
      const cachedTime = localStorage.getItem(cacheTimeKey)
      if (cached && cachedTime) {
        const age = Date.now() - parseInt(cachedTime)
        if (age < 12 * 60 * 60 * 1000) {
          setClientes(JSON.parse(cached))
          return
        }
      }
    }

    setIsClientesLoading(true)

    try {
      const response = await fetch(`${TIME_ENTRY_API}/${encodeURIComponent(orgId)}/clientes`)

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }

      const data = await response.json()

      const mapped = data.map((r: any) => ({
        ID: String(r.id),
        zoho_id: r.zoho_id == null ? null : String(r.zoho_id),
        display: r.nombre
      }))

      setClientes(mapped)
      localStorage.setItem(cacheKey, JSON.stringify(mapped))
      localStorage.setItem(cacheTimeKey, Date.now().toString())
    } catch (error) {
      console.error("Error fetching clientes:", error)
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Error al cargar',
        message: 'No se pudieron cargar los clientes. Por favor verifique su conexión e intente nuevamente.'
      })
    } finally {
      setIsClientesLoading(false)
    }
  }

  useEffect(() => {
    if (organizationId) {
      loadClientes(organizationId)
    }
  }, [organizationId])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSaving || hasPendingSave || isClientesLoading || isProyectosLoading || isAbogadosLoading) {
        e.preventDefault()
        e.returnValue = '' // Requerido por Chrome para mostrar alerta
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isSaving, hasPendingSave, isClientesLoading, isProyectosLoading, isAbogadosLoading])

  useEffect(() => {
    const controller = new AbortController()
    setTasks([])
    setSelectedTask('')
    setTasksError('')
    if (!organizationId) {
      setIsTasksLoading(false)
      return () => controller.abort()
    }
    setIsTasksLoading(true)
    const loadTasks = async () => {
      try {
        const response = await fetch(`${TIME_ENTRY_API}/${encodeURIComponent(organizationId)}/tareas-estandar`, { signal: controller.signal })
        if (!response.ok) throw new Error('No se pudo cargar el catálogo de tareas.')
        const data = await response.json()
        if (!Array.isArray(data) || !data.every(t => Number.isInteger(t.id) && typeof t.nombre === 'string')) {
          throw new Error('El catálogo de tareas tiene un formato inesperado.')
        }
        const active = data.filter(t => t.activo === undefined || Number(t.activo) === 1)
          .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
          .map(t => ({ id: String(t.id), nombre: t.nombre, codigo_utbms: t.codigo_utbms ?? null, facturable: Number(t.facturable ?? 1) }))
        if (!controller.signal.aborted) setTasks(active)
      } catch (error) {
        if (!controller.signal.aborted) setTasksError(error instanceof Error ? error.message : 'No se pudieron cargar las tareas.')
      } finally {
        if (!controller.signal.aborted) setIsTasksLoading(false)
      }
    }
    void loadTasks()
    return () => controller.abort()
  }, [organizationId, tasksReload])

  useEffect(() => {
    if (editId === null || !organizationId) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const detail = await getTiempo(organizationId, editId, controller.signal)
        if (!controller.signal.aborted) setEditDetail(detail)
      } catch (error) {
        if (!controller.signal.aborted) setEditError(error instanceof Error ? error.message : 'No se pudo cargar el tiempo.')
      }
    }
    void load()
    return () => controller.abort()
  }, [editId, organizationId])

  useEffect(() => {
    if (!editDetail || editHydrated.current || isClientesLoading || isAbogadosLoading || isTasksLoading) return
    const controller = new AbortController()
    const hydrate = async () => {
      try {
        const response = await fetch(TIME_ENTRY_API + '/' + organizationId + '/proyectos', { signal: controller.signal })
        if (!response.ok) throw new Error('No se pudo relacionar el proyecto del tiempo con el catálogo.')
        const projects = await response.json()
        const project = projects.find((p: { id: number }) => p.id === editDetail.proyecto_id)
        const lawyer = abogados.find(a => a.ID === String(editDetail.abogado_id))
        if (!project || !clientes.some(c => c.ID === String(project.cliente_id))) throw new Error('El proyecto o cliente de este tiempo no está disponible en Aptus Sync.')
        if (!lawyer) throw new Error('El abogado de este tiempo no está disponible en el catálogo activo de Aptus Sync.')
        if (controller.signal.aborted) return
        editHydrated.current = true
        editProject.current = String(editDetail.proyecto_id)
        setSelectedCliente(String(project.cliente_id))
        // A selected client may already have been loaded before the details arrived.
        if (selectedCliente === String(project.cliente_id)) void loadProyectos(organizationId!, String(project.cliente_id))
        setSelectedAbogados([lawyer.ID]); setMultipleAbogados(false)
        // Tiempos anteriores pueden traer solo el texto de la tarea: se busca por nombre en el catálogo.
        const byName = (name: string | null) => tasks.find(t => t.nombre.trim().toLocaleLowerCase('es') === (name || '').trim().toLocaleLowerCase('es'))
        const task = editDetail.tarea_estandar_id != null ? tasks.find(t => t.id === String(editDetail.tarea_estandar_id)) : byName(editDetail.tarea)
        setSelectedTask(task?.id || '')
        const [year, month, day] = editDetail.fecha.split('-').map(Number)
        setDate(new Date(year, month - 1, day))
        const decimal = editDetail.horas.toFixed(2)
        setBillableTime(editDetail.facturable === 1 ? decimal : '0.00')
        setNonBillableTime(editDetail.facturable === 1 ? '0.00' : decimal)
        setDescription(editDetail.descripcion || '')
        setRegistrarComo('horas')
        const locked = lockReason(editDetail)
        if (locked) setEditError(locked)
        else if (!task) toast.warning(`La tarea "${editDetail.tarea || ''}" no está en el catálogo de tareas estándar. Selecciona una tarea antes de guardar.`)
      } catch (error) {
        if (!controller.signal.aborted) setEditError(error instanceof Error ? error.message : 'No se pudo cargar el formulario.')
      }
    }
    void hydrate()
    return () => controller.abort()
  }, [editDetail, clientes, abogados, tasks, isClientesLoading, isAbogadosLoading, isTasksLoading, organizationId])

  useEffect(() => {
    if (!organizationId) return
    const controller = new AbortController()
    setTemplatesLoading(true); setTemplatesError('')
    listTemplates(organizationId, controller.signal).then(data => { if (!controller.signal.aborted) setTemplates(data) })
      .catch(error => { if (!controller.signal.aborted) setTemplatesError(error.message) })
      .finally(() => { if (!controller.signal.aborted) setTemplatesLoading(false) })
    return () => controller.abort()
  }, [organizationId, templatesReload])

  async function applyTemplate(id: string) {
    const template = templates.find(t => t.id === id)
    if (!template || !organizationId) return
    setApplyingTemplate(true)
    try {
      const response = await fetch(TIME_ENTRY_API + '/' + organizationId + '/proyectos')
      if (!response.ok) throw new Error('No se pudo cargar el proyecto de la plantilla.')
      const projects = await response.json()
      const project = template.cf_proyecto ? projects.find((p: { zoho_id: string }) => String(p.zoho_id) === template.cf_proyecto) : null
      const client = template.cf_cliente ? clientes.find(c => c.zoho_id === template.cf_cliente) : project ? clientes.find(c => c.ID === String(project.cliente_id)) : null
      const lawyer = template.cf_abogado ? abogados.find(a => a.zoho_user_id === template.cf_abogado) : null
      if ((template.cf_cliente && !client) || (template.cf_proyecto && (!project || !client || String(project.cliente_id) !== client.ID))) throw new Error('El cliente o proyecto de la plantilla no está disponible o su relación no coincide con Aptus.')
      if (template.cf_abogado && !lawyer) throw new Error('El abogado de la plantilla no está disponible.')
      if (!['Horas', 'Inicia y Termina'].includes(template.cf_registrar_como)) throw new Error('Modo de plantilla no reconocido.')
      const billable = template.cf_horas_facturables || '0'
      const nonBillable = template.cf_no_facturables || '0'
      if (![billable, nonBillable].every(v => /^\d+(\.\d{1,2})?$/.test(v) && Number(v) <= 99)) throw new Error('La plantilla contiene horas inválidas.')
      // Resolve every lookup before changing the form, then let the client dependency load its projects.
      localStorage.setItem('all_proyectos_cache_' + organizationId, JSON.stringify(projects))
      localStorage.setItem('all_proyectos_cache_timestamp_' + organizationId, String(Date.now()))
      if (project) templateProject.current = template.cf_proyecto
      setSelectedTemplate(id); setSelectedCliente(client?.ID || ''); setSelectedProyecto('')
      setSelectedAbogados(lawyer ? [lawyer.ID] : []); setMultipleAbogados(false)
      // Plantillas anteriores guardan la tarea del catálogo de Books: si no está entre las estándar, se elige a mano.
      const templateTask = tasks.some(t => t.id === template.cf_tarea) ? template.cf_tarea : ''
      if (template.cf_tarea && !templateTask) toast.warning('La tarea de la plantilla no está en el catálogo de tareas estándar. Selecciónala antes de guardar.')
      setSelectedTask(templateTask)
      setRegistrarComo(template.cf_registrar_como === 'Inicia y Termina' ? 'inicia' : 'horas')
      setStartTime(''); setEndTime('')
      setBillableTime(Number(billable).toFixed(2)); setNonBillableTime(Number(nonBillable).toFixed(2))
      if (client?.ID === selectedCliente && project) await loadProyectos(organizationId, client.ID)
      if (!project) setApplyingTemplate(false)
    } catch (error) {
      templateProject.current = null; setApplyingTemplate(false)
      setStatusModal({ isOpen: true, type: 'error', title: 'No se pudo aplicar la plantilla', message: error instanceof Error ? error.message : 'Error al cargar la plantilla.' })
    }
  }

  // Calculate times based on selected mode
  let currentBillable = parseFloat(billableTime) || 0
  if (registrarComo === 'inicia') {
    currentBillable = 0
    const [sH, sM] = startTime.split(':').map(Number)
    const [eH, eM] = endTime.split(':').map(Number)
    if (!isNaN(sH) && !isNaN(sM) && !isNaN(eH) && !isNaN(eM)) {
      const diff = (eH + eM / 60) - (sH + sM / 60)
      currentBillable = Math.max(0, diff)
    }
  }

  const workedTime = (currentBillable + (parseFloat(nonBillableTime) || 0)).toFixed(2)

  async function handleSave() {
    if (applyingTemplate || savingRef.current || saveBlocked || (editId !== null && (!editReady || !!editError))) return
    try {
      if (!organizationId || !/^\d+$/.test(organizationId)) throw new Error('Falta una organización válida.')
      if (!pendingSave.current) {
        if (!selectedCliente) throw new Error('Selecciona un cliente.')
        const entries = buildTiempos({
          projectId: selectedProyecto, lawyerIds: selectedAbogados, taskId: selectedTask,
          date: format(date, 'yyyy-MM-dd'), notes: description,
          mode: registrarComo, billable: billableTime, nonBillable: nonBillableTime,
          start: startTime, end: endTime,
        })
        if (editId !== null) {
          if (entries.length !== 1) throw new Error('Al editar se conserva un solo registro: un abogado y tiempo facturable o no facturable.')
          if (editDetail && (entries[0].abogado_id !== editDetail.abogado_id || entries[0].proyecto_id !== editDetail.proyecto_id)) throw new Error('Al editar no se puede cambiar el abogado ni el proyecto. Elimina el tiempo y captúralo de nuevo.')
        }
        const fingerprint = JSON.stringify([organizationId, entries])
        if (savedFingerprint.current === fingerprint) throw new Error('Estos datos ya se guardaron. Modifica los campos para crear un registro nuevo.')
        let template: TemplateValues | undefined
        if (saveTemplate) {
          if (!templateKey.trim() || templateKey.trim().length > 255) throw new Error('Captura una clave para la nueva plantilla (máximo 255 caracteres).')
          if (templatesLoading || templatesError) throw new Error('Actualiza el catálogo de plantillas antes de guardar una nueva.')
          if (templates.some(t => t.cf_clave.trim().toLocaleLowerCase() === templateKey.trim().toLocaleLowerCase())) throw new Error('Ya existe una plantilla con esa clave. Usa otra para crear una nueva.')
          if (selectedAbogados.length !== 1) throw new Error('El módulo de plantillas admite un solo abogado por plantilla.')
          const customer = clientes.find(c => c.ID === selectedCliente)
          if (!customer?.zoho_id) throw new Error('Actualiza el catálogo de clientes para obtener su ID de Books.')
          if (!/^\d+$/.test(selectedTask)) throw new Error('Selecciona una tarea del catálogo global para guardar la plantilla.')
          const project = selectedProyectoData
          const lawyerBooksId = abogados.find(a => a.ID === selectedAbogados[0])?.zoho_user_id
          if (!project?.zoho_id || !lawyerBooksId) throw new Error('Las plantillas guardan los IDs de Books: el proyecto y el abogado deben estar enlazados a Books.')
          template = { cf_clave: templateKey.trim(), cf_cliente: customer.zoho_id, cf_proyecto: project.zoho_id, cf_abogado: lawyerBooksId, cf_tarea: selectedTask, cf_registrar_como: registrarComo === 'inicia' ? 'Inicia y Termina' : 'Horas', cf_horas_facturables: currentBillable.toFixed(2), cf_no_facturables: nonBillableTime, cf_reference_number: '' }
        }
        pendingSave.current = { organizationId, fingerprint, entries, saved: [], template }
      }
      savingRef.current = true
      setIsSaving(true)
      setHasPendingSave(true)
      const batch = pendingSave.current
      while (batch.entries.length) {
        const entry = batch.entries[0]
        const body = editId !== null ? { fecha: entry.fecha, horas: entry.horas, descripcion: entry.descripcion, tarea_estandar_id: entry.tarea_estandar_id, facturable: entry.facturable } : entry
        batch.saved.push(await saveTiempo(batch.organizationId, body, editId ?? undefined))
        batch.entries.shift()
      }
      let templateSaved = false
      if (batch.template) {
        const created = await createTemplate(batch.organizationId, batch.template)
        setTemplates(current => [...current, created]); setSelectedTemplate(created.id)
        batch.template = undefined; templateSaved = true; setSaveTemplate(false); setTemplateKey('')
      }
      savedFingerprint.current = batch.fingerprint
      pendingSave.current = null
      setHasPendingSave(false)
      setStatusModal({ isOpen: true, type: 'success', title: editId !== null ? 'Tiempo actualizado' : 'Tiempo guardado', message: `Se guardaron ${batch.saved.length} registro(s) en Aptus: #${batch.saved.map(t => t.id).join(', #')}.${backupWarning(batch.saved)}${templateSaved ? ' La nueva plantilla también se guardó.' : ''}` })
    } catch (error) {
      const uncertain = error instanceof Error && 'uncertain' in error && error.uncertain === true
      if (uncertain) setSaveBlocked(true)
      const batch = pendingSave.current
      if (batch && !batch.saved.length && !uncertain) {
        pendingSave.current = null
        setHasPendingSave(false)
      }
      setStatusModal({
        isOpen: true, type: 'error', title: batch?.template && !batch.entries.length ? 'Tiempo guardado; plantilla pendiente' : uncertain ? 'Guardado por verificar' : 'No se completó el guardado',
        message: `${error instanceof Error ? error.message : 'Error al guardar.'}${batch?.saved.length ? ` Ya guardados: #${batch.saved.map(t => t.id).join(', #')}.` : ''}${batch?.saved.length && !uncertain ? ' Puedes reintentar los pendientes sin reenviar los ya guardados.' : ''}`
      })
    } finally {
      savingRef.current = false
      setIsSaving(false)
    }
  }

  function handleCancel() {
    const params = new URLSearchParams(window.location.search)
    const org = organizationId || params.get('organization_id') || ''
    const origin = params.get('origin')

    try {
      const targetUrl = new URL(origin || CALENDAR_URL)
      if (!targetUrl.searchParams.get('organization_id')) {
        targetUrl.searchParams.set('organization_id', org)
      }
      // Parámetro anti-caché para obligar al navegador y al servidor a solicitar la versión más reciente
      targetUrl.searchParams.set('_t', Date.now().toString())
      window.location.href = targetUrl.toString()
    } catch {
      window.location.href = `${CALENDAR_URL}?organization_id=${encodeURIComponent(org)}&_t=${Date.now()}`;
    }
  }

  // Shared class snippets
  const labelCls = 'text-theme-text font-semibold text-xs'
  const sectionIconCls = 'w-4 h-4 text-theme-text'
  const sectionTitleCls = 'text-sm font-semibold text-slate-700'
  const cardCls = 'border border-slate-200 rounded-xl p-4 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)]'

  return (
    <div className="min-h-screen bg-slate-50/50 p-2 sm:p-4 lg:p-8 flex justify-center items-start font-sans w-full">
      <Toaster position="top-center" richColors />
      <Card className="w-full bg-gradient-to-b from-[#FFFAFA] to-white border border-slate-200 rounded-[20px] overflow-hidden p-3 sm:p-5 lg:p-8 relative animate__animated animate__fadeIn animate__faster">

        {/* Animated Background Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-theme-from/5 rounded-full blur-[80px] animate-blob pointer-events-none z-0"></div>
        <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] bg-theme-to/5 rounded-full blur-[100px] animate-blob animation-delay-2000 pointer-events-none z-0"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[500px] h-[500px] bg-theme-from/5 rounded-full blur-[80px] animate-blob animation-delay-4000 pointer-events-none z-0"></div>

        {/* Decorative gradient top wash */}
        <div className="absolute top-0 left-0 right-0 h-15 bg-gradient-to-b from-theme-light to-transparent pointer-events-none z-0"></div>

        {/* ── HEADER ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-5 lg:mb-8 gap-0 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-theme-from to-theme-to flex items-center justify-center shrink-0 shadow-sm border border-black/5 text-white">
              <Timer className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{editId !== null ? 'Editar tiempo' : 'Registro de Tiempos'}</h1>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100 outline-none" title="Configuración de apariencia y lenguaje">
                      <Settings className="w-5 h-5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="start">
                    <div className="text-xs font-semibold text-slate-500 mb-2 px-2 uppercase tracking-wider">Apariencia</div>
                    <div className="space-y-1">
                      {THEMES.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setTheme(t.id)}
                          className={cn(
                            "w-full flex items-center justify-between px-2 py-2 text-sm rounded-md transition-colors",
                            theme === t.id ? "bg-theme-light text-theme-text font-medium" : "text-slate-600 hover:bg-slate-100"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-4 h-4 rounded-full shadow-sm border border-black/10"
                              style={{ backgroundColor: t.color }}
                            />
                            {t.name}
                          </div>
                          {theme === t.id && <Check className="w-4 h-4 text-theme-text" />}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <p className="text-slate-500 text-sm mt-0.5">Captura de actividades y horas facturables</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-4 lg:mt-0 w-full lg:w-auto">
            <Button
              variant="outline"
              type="button"
              onClick={handleCancel}
              className="flex-1 lg:flex-none lg:w-auto h-11 sm:h-12 px-6 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={applyingTemplate || (editId !== null && (!editReady || !!editError)) || isSaving || saveBlocked || isClientesLoading || isProyectosLoading || isAbogadosLoading || isTasksLoading || !!tasksError}
              className="flex-1 lg:flex-none lg:w-auto h-11 sm:h-12 px-6 rounded-lg bg-gradient-to-r from-theme-from to-theme-to hover:from-theme-to hover:to-theme-from text-white shadow-sm font-medium flex items-center justify-center gap-2 border-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Guardando…' : saveBlocked ? 'Verificar en Books' : hasPendingSave ? 'Reintentar pendientes' : editId !== null ? 'Guardar cambios' : 'Guardar Registro'}
            </Button>
          </div>
        </div>

        {editId !== null && !editReady && !editError && (
          <div role="status" aria-live="polite" className="relative z-10 mb-4 flex items-center gap-3 rounded-xl border border-theme-border bg-theme-light/60 p-4 text-sm text-theme-text">
            <RefreshCw aria-hidden="true" className="h-5 w-5 shrink-0 animate-spin motion-reduce:animate-none" />
            <span>Cargando tiempo…</span>
          </div>
        )}
        {editId !== null && editError && <p role="alert" className="relative z-10 mb-4 text-sm text-red-700">{editError}</p>}
        {applyingTemplate && <p role="status" className="relative z-10 mb-4 flex items-center gap-2 text-sm text-theme-text"><RefreshCw className="h-4 w-4 animate-spin" />Aplicando plantilla…</p>}
        {hasPendingSave && <p role="status" className="relative z-10 mb-4 text-sm text-slate-600">{saveBlocked ? 'La respuesta del guardado no pudo confirmarse. Revisa los registros en Books antes de recargar para continuar.' : isSaving ? 'Guardando registros. Espera a que termine el proceso.' : 'Hay registros pendientes. Reintenta para completar este envío.'}</p>}
        <div inert={applyingTemplate || isSaving || hasPendingSave || (editId !== null && (!editReady || !!editError))} aria-busy={isSaving || (editId !== null && !editReady && !editError)} className="space-y-4 relative z-10">

          {/* ── Parámetros del Registro ─────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
            {/* Card: Información general */}
            <div className={cn(cardCls, 'flex flex-col')}>
              <div className="flex items-center gap-2 mb-4">
                <CalendarIcon className={sectionIconCls} />
                <span className={sectionTitleCls}>Información general</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                {/* Fecha */}
                <div className="space-y-2 min-w-0">
                  <Label className={labelCls}>Fecha *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-between text-left font-normal border-slate-200 bg-white hover:bg-slate-50 transition-all h-9 rounded-lg text-sm',
                          !date && 'text-muted-foreground'
                        )}
                      >
                        <span className="text-slate-900 font-medium">{date ? format(date, 'yyyy-MM-dd') : 'Seleccionar fecha'}</span>
                        <CalendarIcon className="h-4 w-4 text-slate-400" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[250px] p-0 bg-white shadow-xl rounded-xl border-slate-200 data-[state=open]:animate-[fadeInDown_0.3s_ease-out] data-[state=closed]:animate-[fadeOutUp_0.3s_ease-in]" align="start">
                      <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Plantilla */}
                <div className="space-y-2 min-w-0">
                  <Label className="text-slate-500 font-semibold text-xs">Plantilla</Label>
                  <Select value={selectedTemplate} onValueChange={id => void applyTemplate(id)} disabled={templatesLoading || !!templatesError || applyingTemplate || isClientesLoading || isAbogadosLoading || isTasksLoading || !!tasksError}>
                    <SelectTrigger className="border-slate-200 bg-white hover:bg-slate-50 transition-all h-9 rounded-lg text-slate-500 font-medium text-sm">
                      <SelectValue placeholder={templatesLoading ? "Cargando plantillas…" : "Seleccionar plantilla"} />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg shadow-md border-slate-100">
                      {templates.map(template => <SelectItem key={template.id} value={template.id}>{template.cf_clave}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {templatesError && <p role="alert" className="text-xs text-red-700">{templatesError} <button type="button" className="underline" onClick={() => setTemplatesReload(v => v + 1)}>Reintentar</button></p>}
                  {!templatesLoading && !templatesError && !templates.length && <p className="text-xs text-slate-500">No hay plantillas guardadas.</p>}
                  {selectedTemplate && <p className="text-xs text-slate-500">Fecha y descripción se conservan.{registrarComo === 'inicia' ? ' Selecciona las horas de inicio y fin.' : ''}</p>}
                </div>
              </div>
            </div>

            {/* Card 1: Cliente & Proyecto */}
            <div className={cn(cardCls, 'flex flex-col')}>
              <div className="flex items-center gap-2 mb-4">
                <Briefcase className={sectionIconCls} />
                <span className={sectionTitleCls}>Identificación</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 gap-y-4 flex-1">
                {/* Cliente */}
                <div className="space-y-2 min-w-0">
                  <Label className={cn(labelCls, 'flex items-center gap-1.5 ml-1')}>
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    Cliente *
                  </Label>
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          disabled={isClientesLoading}
                          className={cn(
                            "min-w-0 flex-1 justify-between border-slate-200 bg-white hover:bg-slate-50 transition-all h-9 rounded-lg font-medium text-sm pr-3 disabled:opacity-50 disabled:cursor-not-allowed",
                            !selectedCliente ? "text-slate-500" : "text-slate-900"
                          )}
                        >
                          <span className="truncate text-left" title={clientes.find(c => c.ID === selectedCliente)?.display}>{isClientesLoading
                            ? "Cargando..."
                            : selectedCliente
                              ? clientes.find(c => c.ID === selectedCliente)?.display
                              : "Seleccionar cliente"}</span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] max-w-[calc(100vw-24px)] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Buscar cliente..."
                            value={clienteSearch}
                            onValueChange={setClienteSearch}
                          />
                          <CommandList>
                            <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                            <CommandGroup>
                              {filteredClientes.map((c) => (
                                <CommandItem
                                  key={c.ID}
                                  value={c.display}
                                  onSelect={() => {
                                    setSelectedCliente(c.ID === selectedCliente ? "" : c.ID)
                                    setClienteSearch("")
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedCliente === c.ID ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {c.display}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <button
                      onClick={() => organizationId && loadClientes(organizationId, true)}
                      disabled={isClientesLoading}
                      className="shrink-0 w-9 h-9 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                      title="Refrescar catálogo"
                    >
                      <RefreshCw
                        className={cn(
                          "w-4 h-4 transition-all",
                          isClientesLoading ? "animate-spin text-theme-text" : "text-slate-500"
                        )}
                      />
                    </button>
                  </div>
                </div>

                {/* Proyecto */}
                <div className="space-y-2 min-w-0">
                  <Label className={cn(labelCls, 'flex items-center gap-1.5 ml-1')}>
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Proyecto *
                  </Label>
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          disabled={!selectedCliente || isProyectosLoading}
                          className={cn(
                            "min-w-0 flex-1 justify-between border-slate-200 bg-white hover:bg-slate-50 transition-all h-9 rounded-lg font-medium text-sm pr-3 disabled:opacity-50 disabled:cursor-not-allowed",
                            !selectedProyecto ? "text-slate-500" : "text-slate-900"
                          )}
                        >
                          <span className="truncate text-left" title={selectedProyectoData?.display}>{isProyectosLoading
                            ? "Cargando..."
                            : !selectedCliente
                              ? "Selecciona un cliente primero"
                              : selectedProyecto
                                ? selectedProyectoData?.display
                                : "Seleccionar proyecto"}</span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] max-w-[calc(100vw-24px)] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Buscar proyecto..."
                            value={proyectoSearch}
                            onValueChange={setProyectoSearch}
                          />
                          <CommandList>
                            <CommandEmpty>No se encontraron proyectos.</CommandEmpty>
                            <CommandGroup>
                              {filteredProyectos.map((p) => (
                                <CommandItem
                                  key={p.ID}
                                  value={p.display}
                                  onSelect={() => {
                                    setSelectedProyecto(p.ID === selectedProyecto ? "" : p.ID)
                                    setProyectoSearch("")
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedProyecto === p.ID ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {p.display}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <button
                      onClick={() => organizationId && selectedCliente && loadProyectos(organizationId, selectedCliente, true)}
                      disabled={!selectedCliente || isProyectosLoading}
                      className="shrink-0 w-9 h-9 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                      title="Refrescar catálogo"
                    >
                      <RefreshCw
                        className={cn(
                          "w-4 h-4 transition-all",
                          isProyectosLoading ? "animate-spin text-theme-text" : "text-slate-500"
                        )}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>


          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
            <div className="lg:col-span-2 flex flex-col [&>div]:flex-1">
              {/* Card 2: Tarea & Abogado */}
              <div className={cn(cardCls, 'flex flex-col')}>
                <div className="flex items-center gap-2 mb-4">
                  <Settings2 className={sectionIconCls} />
                  <span className={sectionTitleCls}>Asignación</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 gap-y-4 flex-1">
                  {/* Abogado */}
                  <div className="space-y-2 min-w-0">
                    <Label className={cn(labelCls, 'flex items-center gap-1.5 ml-1')}>
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {multipleAbogados ? 'Abogados *' : 'Abogado *'}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Popover open={abogadoOpen} onOpenChange={setAbogadoOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox" aria-expanded={abogadoOpen} aria-label={multipleAbogados ? "Seleccionar abogados" : "Seleccionar abogado"}
                            disabled={!selectedCliente || !selectedProyecto || isAbogadosLoading}
                            className={cn(
                              "min-w-0 flex-1 justify-between border-slate-200 bg-white hover:bg-slate-50 transition-all h-9 rounded-lg font-medium text-sm pr-3 disabled:opacity-50 disabled:cursor-not-allowed",
                              !selectedAbogados.length ? "text-slate-500" : "text-slate-900"
                            )}
                          >
                            <span className="truncate text-left" title={selectedAbogados.map(id => abogados.find(a => a.ID === id)?.display || id).join(", ")}>{isAbogadosLoading
                              ? "Cargando..."
                              : (!selectedCliente || !selectedProyecto)
                                ? "Selecciona cliente y proyecto"
                                : selectedAbogados.length
                                  ? selectedAbogados.length === 1 ? abogados.find(a => a.ID === selectedAbogados[0])?.display : `${selectedAbogados.length} abogados seleccionados`
                                  : multipleAbogados ? "Seleccionar abogados" : "Seleccionar abogado"}</span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] max-w-[calc(100vw-24px)] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto p-0" align="start">
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder="Buscar abogado..."
                              value={abogadoSearch}
                              onValueChange={setAbogadoSearch}
                            />
                            <CommandList>
                              <CommandEmpty>No se encontraron abogados.</CommandEmpty>
                              <CommandGroup>
                                {filteredAbogados.map((a) => (
                                  <CommandItem
                                    key={a.ID}
                                    value={a.display}
                                    onSelect={() => {
                                      setSelectedAbogados(current => multipleAbogados
                                        ? current.includes(a.ID) ? current.filter(id => id !== a.ID) : [...current, a.ID]
                                        : [a.ID])
                                      if (!multipleAbogados) { setAbogadoSearch(""); setAbogadoOpen(false) }
                                    }}
                                    className="flex items-center gap-2 py-2"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-1 h-4 w-4 shrink-0",
                                        selectedAbogados.includes(a.ID) ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="shrink-0 w-8 h-8 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-200">
                                      {a.fotoUrl ? (
                                        <ProfileImage url={a.fotoUrl} alt={a.display} />
                                      ) : (
                                        <User className="w-4 h-4 text-slate-400" />
                                      )}
                                    </div>
                                    <div className="flex flex-col ml-1">
                                      <span className="font-medium text-slate-800">{a.display}</span>
                                      {a.secondary && <span className="text-xs text-slate-500">{a.secondary}</span>}
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <button
                        onClick={() => organizationId && loadAbogados(organizationId, true)}
                        disabled={!selectedCliente || !selectedProyecto || isAbogadosLoading}
                        className="shrink-0 w-9 h-9 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        title="Refrescar catálogo"
                      >
                        <RefreshCw
                          className={cn(
                            "w-4 h-4 transition-all",
                            isAbogadosLoading ? "animate-spin text-theme-text" : "text-slate-500"
                          )}
                        />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Checkbox id="sincronizar" disabled={editId !== null} checked={multipleAbogados} onCheckedChange={checked => {
                        if (checked === true) {
                          setMultipleAbogados(true)
                          if (selectedCliente && selectedProyecto && !isAbogadosLoading) setAbogadoOpen(true)
                        } else if (selectedAbogados.length > 1) { setChooseSingleAbogado(true) }
                        else { setMultipleAbogados(false) }
                      }} className="data-[state=checked]:bg-theme-from data-[state=checked]:border-theme-from" />
                      <Label htmlFor="sincronizar" className="text-xs text-slate-600 cursor-pointer">Registrar para varios abogados</Label>
                    </div>
                    {multipleAbogados && selectedAbogados.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto" aria-label="Abogados seleccionados">
                        {selectedAbogados.map(id => (
                          <button key={id} type="button" onClick={() => setSelectedAbogados(current => current.filter(value => value !== id))}
                            aria-label={`Quitar a ${abogados.find(a => a.ID === id)?.display || id}`}
                            className="max-w-full truncate rounded-md bg-theme-light border border-theme-border px-2 py-1 text-xs text-theme-text hover:bg-slate-100">
                            {abogados.find(a => a.ID === id)?.display || id} ×
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Tarea */}
                  <div className="space-y-2 min-w-0">
                    <Label className={cn(labelCls, 'flex items-center gap-1.5 ml-1')}>
                      <Settings2 className="w-3.5 h-3.5 text-slate-400" />
                      Tarea *
                    </Label>
                    <Select value={selectedTask} onValueChange={setSelectedTask} disabled={isTasksLoading || !!tasksError || tasks.length === 0}>
                      <SelectTrigger className="border-slate-200 bg-white hover:bg-slate-50 transition-all h-9 rounded-lg text-slate-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                        <SelectValue placeholder={isTasksLoading ? "Cargando tareas..." : tasksError ? "Catálogo no disponible" : tasks.length === 0 ? "No hay tareas disponibles" : "Seleccionar tarea"} />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg shadow-md border-slate-100 max-h-60">
                        {tasks.map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.nombre}{t.codigo_utbms ? ` (${t.codigo_utbms})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {tasksError && (
                      <div role="alert" className="text-xs text-red-700">
                        <p>{tasksError}</p>
                        <button type="button" onClick={() => setTasksReload(value => value + 1)} className="mt-1 underline font-medium">Reintentar</button>
                      </div>
                    )}
                    {selectedProyectoData && selectedProyectoData.tipo_cobro !== 'horas' && (
                      <p className="text-xs text-amber-700">Proyecto de {selectedProyectoData.tipo_cobro === 'iguala' ? 'iguala' : 'cuota fija'}: lo que se cobra es el honorario fijo, así que sus horas normalmente se capturan como no facturables.</p>
                    )}

                  </div>

                </div>

              </div>
            </div>
            {/* Card: Registrar como */}
            <div className={cn(cardCls, 'md:col-span-1 flex flex-col')}>
              <div className="flex items-center gap-2 mb-4">
                <Clock className={sectionIconCls} />
                <span className={sectionTitleCls}>Registrar como</span>
              </div>
              <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-200 flex-1">
                {([
                  { key: 'horas', label: 'Horas', Icon: Clock },
                  { key: 'inicia', label: 'Inicia / Termina', Icon: Play },
                ] as const).map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    onClick={() => setRegistrarComo(key)}
                    className={cn(
                      'min-w-0 flex-1 flex flex-col items-center justify-center gap-1.5 px-1 py-2 text-[11px] sm:text-xs font-semibold rounded-md transition-all',
                      registrarComo === key
                        ? 'bg-gradient-to-r from-theme-from to-theme-to text-white shadow-sm'
                        : 'text-slate-500 hover:text-theme-text hover:bg-theme-light'
                    )}
                  >
                    <Icon className={cn('w-4 h-4', registrarComo === key ? 'text-white' : 'text-slate-400')} />
                    <span className="max-w-full whitespace-normal leading-tight text-center">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── ROW 3: Time Summary Blocks ───────────────────────────────────── */}
          {registrarComo === 'horas' && (
            <div className="animate__animated animate__fadeIn animate__faster grid grid-cols-1 md:grid-cols-3 gap-0 rounded-xl overflow-hidden shadow-sm bg-gradient-to-r from-theme-from to-theme-to">
              {/* Horas Facturables */}
              <div className="p-6 flex items-center gap-5 relative">
                <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center shrink-0 border border-white/25">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white/90 mb-1">Horas Facturables</p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-white">{billableTime}</span>
                      <span className="text-sm font-medium text-white/90">hrs</span>
                    </div>
                    <TimePickerPopover
                      value={billableTime}
                      onApply={setBillableTime}
                      triggerClassName="bg-transparent border-white/30 text-white/80 hover:text-white hover:bg-white/20 hover:border-white/50"
                    />
                  </div>
                </div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-16 bg-white/20 hidden md:block"></div>
              </div>

              {/* NO Facturables */}
              <div className="p-6 flex items-center gap-5 relative">
                <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center shrink-0 border border-white/25">
                  <Ban className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white/90 mb-1">NO Facturables</p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-white">{nonBillableTime}</span>
                      <span className="text-sm font-medium text-white/90">hrs</span>
                    </div>
                    <TimePickerPopover
                      value={nonBillableTime}
                      onApply={setNonBillableTime}
                      triggerClassName="bg-transparent border-white/30 text-white/80 hover:text-white hover:bg-white/20 hover:border-white/50"
                    />
                  </div>
                </div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-16 bg-white/20 hidden md:block"></div>
              </div>

              {/* Trabajadas = Facturables + NO Facturables */}
              <div className="p-6 flex items-center gap-5">
                <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center shrink-0 border border-white/25">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white/90 mb-1">Trabajadas</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-white">{workedTime}</span>
                    <span className="text-sm font-medium text-white/90">hrs</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {registrarComo === 'inicia' && (
            <div className="animate__animated animate__fadeIn animate__faster flex flex-col gap-3">
              <div className="text-xs font-medium text-theme-to bg-theme-light/80 p-3 rounded-lg border border-theme-border flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0" />
                El rango de tiempo seleccionado será considerado como tiempo Facturable ({currentBillable.toFixed(2)} hrs).
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-0 rounded-xl overflow-hidden shadow-sm bg-gradient-to-r from-theme-from to-theme-to">
                {/* Inicia */}
                <div className="p-4 flex items-center gap-4 relative">
                  <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0 border border-white/25">
                    <Play className="w-4 h-4 text-white ml-0.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-white/90 mb-0.5">Inicia</p>
                    <ClockTimePicker label="Inicia" value={startTime} onChange={setStartTime} />
                  </div>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-12 bg-white/20 hidden xl:block"></div>
                </div>

                {/* Termina */}
                <div className="p-4 flex items-center gap-4 relative">
                  <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0 border border-white/25">
                    <Clock className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-white/90 mb-0.5">Termina</p>
                    <ClockTimePicker label="Termina" value={endTime} onChange={setEndTime} />
                  </div>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-12 bg-white/20 hidden xl:block"></div>
                </div>

                {/* NO Facturables */}
                <div className="p-4 flex items-center gap-4 relative">
                  <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0 border border-white/25">
                    <Ban className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-white/90 mb-0.5">NO Facturables</p>
                    <div className="flex items-center gap-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-white">{nonBillableTime}</span>
                        <span className="text-[10px] font-medium text-white/90">hrs</span>
                      </div>
                      <TimePickerPopover
                        value={nonBillableTime}
                        onApply={setNonBillableTime}
                        triggerClassName="bg-transparent border-white/30 text-white/80 hover:text-white hover:bg-white/20 hover:border-white/50 w-6 h-6 [&_svg]:w-3 [&_svg]:h-3"
                      />
                    </div>
                  </div>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-12 bg-white/20 hidden xl:block"></div>
                </div>

                {/* Trabajadas */}
                <div className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0 border border-white/25">
                    <Briefcase className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-white/90 mb-0.5">Trabajadas</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold text-white">{workedTime}</span>
                      <span className="text-[10px] font-medium text-white/90">hrs</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── ROW 4: Descripción & Referencia ──────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">

            {/* Descripción de la actividad */}
            <div className={cn(cardCls, 'lg:col-span-2 min-w-0 flex flex-col')}>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <FileText className={sectionIconCls} />
                  <span className={cn(sectionTitleCls, 'text-theme-text')}>Descripción de la actividad</span>
                </div>

                {/* Controles de ortografía */}
                <div className="flex flex-wrap items-center gap-2 text-xs rounded-lg border border-slate-200 bg-slate-50/80 p-2">
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md p-1 px-2">
                    <span className={cn("font-medium cursor-pointer transition-colors", spellcheckLang === 'en' ? "text-slate-400" : "text-theme-text")} onClick={() => setSpellcheckLang('es')}>ES</span>
                    <Switch
                      checked={spellcheckLang === 'en'}
                      onCheckedChange={(c: boolean) => setSpellcheckLang(c ? 'en' : 'es')}
                      disabled={!isSpellcheckEnabled}
                      className="data-[state=checked]:bg-[#E5D3B3] data-[state=unchecked]:bg-[#E5D3B3] scale-75 border-slate-300"
                    />
                    <span className={cn("font-medium cursor-pointer transition-colors", spellcheckLang === 'es' ? "text-slate-400" : "text-blue-500")} onClick={() => setSpellcheckLang('en')}>EN</span>
                  </div>

                  <button
                    onClick={() => setIsSpellcheckEnabled(!isSpellcheckEnabled)}
                    className={cn(
                      "flex items-center gap-1.5 font-medium transition-all px-2 py-1 rounded-md",
                      isSpellcheckEnabled
                        ? "text-theme-text bg-theme-light hover:bg-theme-border"
                        : "text-slate-400 bg-slate-50 hover:bg-slate-100"
                    )}
                    title={isSpellcheckEnabled ? "Desactivar subrayado nativo" : "Activar subrayado nativo"}
                  >
                    <SpellCheck2 className="w-3.5 h-3.5" />
                    <span className="whitespace-nowrap">{isSpellcheckEnabled ? 'Subrayado activo' : 'Subrayado inactivo'}</span>
                  </button>

                  <button
                    onClick={handleStartSpellcheck}
                    disabled={isSpellchecking || description.trim() === ''}
                    className="flex items-center gap-1.5 font-medium transition-all px-2 py-1 rounded-md text-theme-text bg-theme-light hover:bg-theme-border disabled:opacity-50 disabled:cursor-not-allowed border border-theme-border"
                    title="Corregir texto paso a paso"
                  >
                    <SpellCheck2 className={cn("w-3.5 h-3.5", isSpellchecking && "animate-spin")} />
                    <span className="whitespace-nowrap">{isSpellchecking ? 'Analizando...' : 'Corregir texto'}</span>
                  </button>

                  <button
                    disabled
                    className="flex items-center gap-1.5 font-medium transition-all px-2 py-1 rounded-md text-slate-500 bg-white border border-slate-200 cursor-not-allowed"
                    title="Esta funcionalidad de inteligencia artificial aún no está habilitada"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="whitespace-nowrap">Mejorar con IA</span>
                  </button>
                </div>
              </div>
              <div className="relative flex-1">
                <Textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  spellCheck={isSpellcheckEnabled}
                  lang={spellcheckLang}
                  className="w-full min-h-[140px] h-full bg-white border-slate-200 hover:border-slate-300 focus:border-theme-from focus:ring-1 focus:ring-theme-from/30 transition-all resize-none text-sm p-3 rounded-lg shadow-sm"
                  placeholder="Escribe la descripción detallada de las actividades realizadas..."
                />
                <div className="absolute bottom-3 right-3">
                  <div className="w-2 h-2 border-r-2 border-b-2 border-slate-300"></div>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2 font-medium">{description.length} / {DESCRIPCION_MAX} caracteres</p>
            </div>

            {/* Referencia + Checkboxes */}
            <div className={cn(cardCls, "min-w-0 flex flex-col self-start")}>

              {/* Dónde se guarda */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase className={sectionIconCls} />
                  <span className={cn(sectionTitleCls, 'text-theme-text')}>Antes de guardar</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  <li className="flex gap-2"><span className="text-theme-text font-bold">•</span>Se guarda en Aptus con la tarifa del abogado y Aptus lo respalda en Books.</li>
                  <li className="flex gap-2"><span className="text-theme-text font-bold">•</span>Queda como <b>capturado</b> y entra a una Prebill después de liberarse.</li>
                </ul>
              </div>

              {/* Opciones */}
              <div className="mt-4 border border-theme-border bg-theme-light/20 rounded-lg p-3 flex flex-col justify-center gap-3">
                <div className="flex items-center gap-2 cursor-pointer group">
                  <Checkbox
                    id="salvar"
                    checked={saveTemplate}
                    onCheckedChange={checked => setSaveTemplate(checked === true)}
                    className="data-[state=checked]:bg-theme-from data-[state=checked]:border-theme-from w-4 h-4 shrink-0 rounded-[4px] border-slate-300"
                  />
                  <Label htmlFor="salvar" className="font-medium text-slate-600 cursor-pointer group-hover:text-slate-900 transition-colors flex items-center gap-2 text-sm">
                    <Save className="w-4 h-4 text-theme-to" />
                    Salvar como Plantilla recurrente
                  </Label>
                </div>
                {saveTemplate && <div className="space-y-2">
                  <Label htmlFor="template-key" className="text-xs text-theme-text">Clave de la nueva plantilla *</Label>
                  <Input id="template-key" value={templateKey} onChange={e => setTemplateKey(e.target.value)} maxLength={255} placeholder="Ej. Revisión de contratos" />
                  <p className="text-xs text-slate-500">Guarda cliente, proyecto, un abogado, tarea, modo y horas. No guarda fecha, descripción ni horas de inicio/fin.</p>
                </div>}
              </div>

            </div>
          </div>

          {/* ── FOOTER info bar ───────────────────────────────────────────────── */}
          {/* <div className="flex items-center gap-3 bg-theme-light/60 border border-theme-border rounded-xl p-3">
            <Info className="w-4 h-4 text-theme-to shrink-0" />
            <p className="text-xs text-theme-to font-medium">
              Asegúrate de registrar correctamente tu tiempo para una mejor gestión y facturación.
            </p>
          </div> */}

        </div>

      </Card>

      <Dialog open={chooseSingleAbogado} onOpenChange={setChooseSingleAbogado}>
        <DialogContent className="sm:max-w-[425px]" aria-describedby="choose-abogado-description">
          <DialogHeader><DialogTitle>Conservar un abogado</DialogTitle></DialogHeader>
          <p id="choose-abogado-description" className="text-sm text-slate-600">Elige qué abogado conservar al volver al registro individual.</p>
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {selectedAbogados.map(id => (
              <Button key={id} variant="outline" onClick={() => {
                setSelectedAbogados([id]); setMultipleAbogados(false); setChooseSingleAbogado(false); setAbogadoOpen(false)
              }}>{abogados.find(a => a.ID === id)?.display || id}</Button>
            ))}
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setChooseSingleAbogado(false)}>Cancelar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSpellcheckDialog} onOpenChange={setShowSpellcheckDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SpellCheck2 className="w-5 h-5 text-theme-text" />
              Revisión Ortográfica
            </DialogTitle>
          </DialogHeader>

          {misspelledWords.length > 0 && spellcheckIndex < misspelledWords.length && (
            <div className="py-4">
              <p className="text-sm text-slate-500 mb-4">
                Palabra {spellcheckIndex + 1} de {misspelledWords.length}
              </p>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg mb-6 text-slate-700 text-sm leading-relaxed max-h-32 overflow-y-auto">
                {description.substring(Math.max(0, misspelledWords[spellcheckIndex].start - 40), misspelledWords[spellcheckIndex].start)}
                <span className="font-bold text-theme-text bg-theme-border px-1 rounded">
                  {misspelledWords[spellcheckIndex].word}
                </span>
                {description.substring(misspelledWords[spellcheckIndex].end, Math.min(description.length, misspelledWords[spellcheckIndex].end + 40))}
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-700">Sugerencias:</Label>
                {misspelledWords[spellcheckIndex].suggestions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {misspelledWords[spellcheckIndex].suggestions.slice(0, 5).map(sug => (
                      <Button
                        key={sug}
                        variant="outline"
                        size="sm"
                        onClick={() => handleReplace(sug)}
                        className="border-theme-from/30 hover:bg-theme-light hover:text-theme-text transition-colors"
                      >
                        {sug}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">No hay sugerencias disponibles.</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="sm:justify-between">
            <Button variant="ghost" onClick={() => setShowSpellcheckDialog(false)} className="text-slate-500">
              Cancelar
            </Button>
            <Button onClick={handleIgnore} className="bg-slate-800 hover:bg-slate-900 text-white">
              Ignorar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StatusModal
        isOpen={statusModal.isOpen}
        onClose={statusModal.type === 'error' && !organizationId ? undefined : () => setStatusModal(prev => ({ ...prev, isOpen: false }))}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
      />
    </div>
  )
}

export default App
