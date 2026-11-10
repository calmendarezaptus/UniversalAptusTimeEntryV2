import { useState } from 'react'
import { Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// The UI uses a 12-hour clock; the form keeps the existing HH:mm contract.
export function ClockTimePicker({ value, onChange, label }: {
  value: string; onChange: (value: string) => void; label: string
}) {
  const [open, setOpen] = useState(false)
  const [hour, setHour] = useState('')
  const [minute, setMinute] = useState('')
  const [period, setPeriod] = useState('')
  const hour24 = value ? Number(value.slice(0, 2)) : 0
  const display = value ? `${String(hour24 % 12 || 12).padStart(2, '0')}:${value.slice(3)} ${hour24 >= 12 ? 'p. m.' : 'a. m.'}` : '--:--'
  function changeOpen(next: boolean) {
    if (next) {
      setHour(value ? String(hour24 % 12 || 12).padStart(2, '0') : '')
      setMinute(value ? value.slice(3) : '')
      setPeriod(value ? (hour24 >= 12 ? 'pm' : 'am') : '')
    }
    setOpen(next)
  }
  const groups = [
    { label: 'Hora', value: hour, change: setHour, options: Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1).padStart(2, '0'), label: String(i + 1).padStart(2, '0') })) },
    { label: 'Minutos', value: minute, change: setMinute, options: Array.from({ length: 60 }, (_, i) => ({ value: String(i).padStart(2, '0'), label: String(i).padStart(2, '0') })) },
    { label: 'Período', value: period, change: setPeriod, options: [{ value: 'am', label: 'a. m.' }, { value: 'pm', label: 'p. m.' }] },
  ]
  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`${label}: ${value ? display : 'seleccionar hora'}`} className="flex w-full items-center justify-between gap-2 border-b border-white/30 bg-transparent py-1 text-left text-lg font-bold text-white outline-none hover:border-white focus-visible:ring-2 focus-visible:ring-white rounded-sm">
          <span>{display}</span><Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={8} className="w-80 max-w-[calc(100vw-24px)] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto rounded-xl border-theme-border bg-white p-4 shadow-xl">
        <p className="mb-3 text-sm font-semibold text-theme-text">{label}</p>
        <div className="grid grid-cols-3 gap-2">
          {groups.map(group => (
            <div key={group.label} className="min-w-0">
              <p className="mb-1 text-xs text-slate-500">{group.label}</p>
              <Select value={group.value} onValueChange={group.change}>
                <SelectTrigger aria-label={`${label}: ${group.label}`} className="px-2 border-theme-border focus:ring-theme-from"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent className="min-w-0 max-h-60 border-theme-border bg-white">
                  {group.options.map(option => <SelectItem key={option.value} value={option.value} className="focus:bg-theme-light focus:text-theme-text data-[state=checked]:bg-theme-from data-[state=checked]:text-white">{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" className="mr-auto px-2 text-slate-500" onClick={() => { onChange(''); setOpen(false) }}>Limpiar</Button>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button type="button" disabled={!hour || !minute || !period} className="bg-theme-from text-white hover:bg-theme-to" onClick={() => {
            const hours = Number(hour) % 12 + (period === 'pm' ? 12 : 0)
            onChange(`${String(hours).padStart(2, '0')}:${minute}`)
            setOpen(false)
          }}>Aplicar</Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
