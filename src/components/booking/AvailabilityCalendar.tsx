'use client'

import {
  startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek,
  format, isSameMonth, addMonths, isToday, parseISO,
} from 'date-fns'

export type BusyPeriod = {
  start_date: string
  end_date: string
  assigned_count: number
}

type DayStatus = 'available' | 'limited' | 'unavailable' | 'past'

interface Props {
  busyPeriods: BusyPeriod[]
  totalCrew: number
  selectedDate: string
  onDateSelect: (date: string) => void
}

function getDayStatus(dateStr: string, today: string, busyPeriods: BusyPeriod[], totalCrew: number): DayStatus {
  if (dateStr < today) return 'past'

  const overlapping = busyPeriods.filter(p => p.start_date <= dateStr && p.end_date >= dateStr)
  const totalBusy = overlapping.reduce((sum, p) => sum + p.assigned_count, 0)

  if (totalBusy === 0) return 'available'
  if (totalCrew > 0 && totalBusy >= totalCrew) return 'unavailable'
  return 'limited'
}

const DAY_HEADERS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

const STATUS_STYLES: Record<DayStatus, string> = {
  available:   'bg-green-50 text-green-800 border border-green-200 hover:bg-green-100 cursor-pointer',
  limited:     'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 cursor-pointer',
  unavailable: 'bg-[#2B2B2B] text-gray-400 cursor-not-allowed',
  past:        'text-gray-200 cursor-default',
}

const STATUS_TITLES: Record<DayStatus, string> = {
  available:   'Available — click to select',
  limited:     'Limited availability — click to select',
  unavailable: 'Unavailable',
  past:        '',
}

function MonthCalendar({
  monthDate, busyPeriods, totalCrew, today, selectedDate, onDateSelect,
}: {
  monthDate: Date
  busyPeriods: BusyPeriod[]
  totalCrew: number
  today: string
  selectedDate: string
  onDateSelect: (date: string) => void
}) {
  const gridStart = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 })
  const gridEnd   = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 })
  const allDays   = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const weeks: Date[][] = []
  for (let i = 0; i < allDays.length; i += 7) weeks.push(allDays.slice(i, i + 7))

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <p className="text-sm font-semibold text-[#2B2B2B] text-center mb-3">
        {format(monthDate, 'MMMM yyyy')}
      </p>

      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map(d => (
          <div key={d} className="text-center text-[11px] font-medium text-gray-400 py-1">{d}</div>
        ))}
      </div>

      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-0.5">
            {week.map(day => {
              if (!isSameMonth(day, monthDate)) return <div key={day.toISOString()} className="h-9" />

              const dateStr = format(day, 'yyyy-MM-dd')
              const status  = getDayStatus(dateStr, today, busyPeriods, totalCrew)
              const clickable = status === 'available' || status === 'limited'
              const isSelected = dateStr === selectedDate
              const todayDot = isToday(day) && status !== 'past'

              return (
                <button
                  key={dateStr}
                  disabled={!clickable}
                  onClick={() => clickable && onDateSelect(dateStr)}
                  title={STATUS_TITLES[status]}
                  className={[
                    'relative h-9 w-full rounded-lg text-sm font-medium flex items-center justify-center transition-all',
                    STATUS_STYLES[status],
                    isSelected && clickable ? 'ring-2 ring-[#E8820C] ring-offset-1' : '',
                  ].join(' ')}
                >
                  {format(day, 'd')}
                  {todayDot && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#E8820C]" />
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AvailabilityCalendar({ busyPeriods, totalCrew, selectedDate, onDateSelect }: Props) {
  const now   = new Date()
  const today = format(now, 'yyyy-MM-dd')
  const months = [now, addMonths(now, 1), addMonths(now, 2)]

  return (
    <div>
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-6">
        {([
          ['bg-green-50 border border-green-200',  'Available'],
          ['bg-amber-50 border border-amber-200',  'Limited'],
          ['bg-[#2B2B2B]',                         'Unavailable'],
        ] as const).map(([cls, label]) => (
          <span key={label} className="flex items-center gap-2 text-sm text-gray-600">
            <span className={`w-4 h-4 rounded-md inline-block flex-shrink-0 ${cls}`} />
            {label}
          </span>
        ))}
        {selectedDate && (
          <span className="ml-auto text-sm font-medium text-[#E8820C]">
            Selected: {format(parseISO(selectedDate), 'd MMM yyyy')}
          </span>
        )}
      </div>

      {/* Three month grids */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {months.map(month => (
          <MonthCalendar
            key={month.toISOString()}
            monthDate={month}
            busyPeriods={busyPeriods}
            totalCrew={totalCrew}
            today={today}
            selectedDate={selectedDate}
            onDateSelect={onDateSelect}
          />
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-4 text-center leading-relaxed">
        Click an available date to pre-fill your booking request below.
        Availability is indicative — all bookings are confirmed by the team.
      </p>
    </div>
  )
}
