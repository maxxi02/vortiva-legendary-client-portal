"use client"

import { useState } from "react"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export type DateRange = { from: Date; to: Date }

interface Props {
  value: DateRange
  onChange: (range: DateRange) => void
  className?: string
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function fmt(d: Date) {
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
const PRESETS: { label: string; days: number }[] = [
  { label: "Last 7 days",  days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
]

export function DateRangePicker({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState<Date | null>(null)
  const [selecting, setSelecting] = useState<Date | null>(null) // first click
  const today = startOfDay(new Date())
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  function applyPreset(days: number) {
    const to = today
    const from = new Date(today)
    from.setDate(from.getDate() - (days - 1))
    onChange({ from, to })
    setOpen(false)
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  function clickDay(d: Date) {
    if (!selecting) {
      setSelecting(d)
    } else {
      const from = d < selecting ? d : selecting
      const to   = d < selecting ? selecting : d
      onChange({ from, to })
      setSelecting(null)
      setOpen(false)
    }
  }

  const days = daysInMonth(viewYear, viewMonth)
  const firstDay = firstDayOfMonth(viewYear, viewMonth)

  function inRange(d: Date) {
    const end = selecting ? (hovered ?? selecting) : value.to
    const start = selecting ?? value.from
    const lo = start < end ? start : end
    const hi = start < end ? end : start
    return d >= lo && d <= hi
  }

  return (
    <div className={cn("relative inline-block", className)}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted transition-colors"
      >
        <CalendarDays className="size-4 text-muted-foreground" />
        <span>{fmt(value.from)} – {fmt(value.to)}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSelecting(null) }} />
          <div className="absolute left-0 top-full mt-1 z-50 rounded-xl border border-border bg-background shadow-xl p-4 flex gap-4">
            {/* Presets */}
            <div className="flex flex-col gap-1 border-r border-border pr-4">
              {PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p.days)}
                  className="text-left text-sm px-3 py-1.5 rounded-md hover:bg-muted transition-colors whitespace-nowrap"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Calendar */}
            <div className="w-64">
              <div className="flex items-center justify-between mb-3">
                <button onClick={prevMonth} className="p-1 rounded hover:bg-muted transition-colors">
                  <ChevronLeft className="size-4" />
                </button>
                <span className="text-sm font-medium">{MONTHS[viewMonth]} {viewYear}</span>
                <button onClick={nextMonth} className="p-1 rounded hover:bg-muted transition-colors">
                  <ChevronRight className="size-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 mb-1">
                {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
                  <div key={d} className="text-center text-xs text-muted-foreground py-1">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: days }).map((_, i) => {
                  const d = new Date(viewYear, viewMonth, i + 1)
                  const isFrom = d.getTime() === (selecting ?? value.from).getTime()
                  const isTo   = !selecting && d.getTime() === value.to.getTime()
                  const inR    = inRange(d)
                  const isFuture = d > today
                  return (
                    <button
                      key={i}
                      disabled={isFuture}
                      onClick={() => clickDay(d)}
                      onMouseEnter={() => selecting && setHovered(d)}
                      onMouseLeave={() => setHovered(null)}
                      className={cn(
                        "text-xs py-1.5 rounded transition-colors",
                        isFuture && "opacity-30 cursor-not-allowed",
                        (isFrom || isTo) && "bg-primary text-primary-foreground font-semibold",
                        inR && !isFrom && !isTo && "bg-primary/15",
                        !inR && !isFrom && !isTo && !isFuture && "hover:bg-muted"
                      )}
                    >
                      {i + 1}
                    </button>
                  )
                })}
              </div>

              {selecting && (
                <p className="text-xs text-muted-foreground mt-2 text-center">Now click an end date</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
