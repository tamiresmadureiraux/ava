import { useMemo, useState } from "react"
import { PageMenu } from "../components/PageMenu"
import { useApp } from "../context"
import { calendarWeeks, parseISO, shiftMonth, trainingMonthById, trainingMonthFor } from "../dates"
import { catalogById, exerciseCatalog } from "../plans"
import { formatMonthTitle } from "../present"
import type { BuiltMove, TrainingMonth } from "../types"

const WEEKDAY_CHIPS = [
  { day: 1, label: "Mon" },
  { day: 2, label: "Tue" },
  { day: 3, label: "Wed" },
  { day: 4, label: "Thu" },
  { day: 5, label: "Fri" },
  { day: 6, label: "Sat" },
  { day: 0, label: "Sun" },
]

export function BuildScreen() {
  const { today, setTab, saveBuiltPlan } = useApp()
  const months = useMemo(() => upcomingMonths(today), [today])
  const catalog = useMemo(() => exerciseCatalog(), [])
  const [name, setName] = useState("Training")
  const [rows, setRows] = useState<{ key: string; sourceId: string; series: number; reps: string }[]>([])
  const [monthId, setMonthId] = useState(months[0]?.id ?? "")
  const [weekdays, setWeekdays] = useState<number[]>([])
  const [dates, setDates] = useState<string[]>([])
  const [picking, setPicking] = useState(false)
  const month = monthId ? trainingMonthById(monthId) : null

  function addExercise(sourceId: string) {
    setRows((current) => [...current, { key: `${sourceId}-${current.length}-${Date.now()}`, sourceId, series: 3, reps: "8–12" }])
    setPicking(false)
  }

  function save() {
    if (!month || rows.length === 0) return
    const chosen = new Set(dates.filter((iso) => iso >= month.start && iso <= month.end))
    for (const iso of daysIn(month)) {
      if (weekdays.includes(parseISO(iso).getDay())) chosen.add(iso)
    }
    if (chosen.size === 0) return
    const exercises: BuiltMove[] = rows.map((row) => ({ sourceId: row.sourceId, series: row.series, reps: row.reps.trim() }))
    saveBuiltPlan({ name, exercises, dates: [...chosen].sort() })
  }

  const canSave = rows.length > 0 && rows.every((row) => row.series >= 1 && row.reps.trim()) && (weekdays.length > 0 || dates.length > 0)

  return (
    <main className="screen build-screen">
      <header className="home-bar">
        <button type="button" className="text-link build-back" onClick={() => setTab("home")}>
          Back
        </button>
        <PageMenu />
      </header>
      <h1>Build a training</h1>
      <p className="hint">Choose exercises, then the days they should happen. Other days keep the weekly plan.</p>

      <label className="build-field">
        <span>Name</span>
        <input value={name} onChange={(event) => setName(event.target.value)} aria-label="Session name" />
      </label>

      <h2 className="section-title">Exercises</h2>
      <ol className="build-list">
        {rows.map((row) => {
          const source = catalogById(row.sourceId)
          return (
            <li key={row.key}>
              <div className="build-row-head">
                <strong>{source?.name ?? "Exercise"}</strong>
                <button type="button" className="text-link" onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}>
                  Remove
                </button>
              </div>
              <label>
                <span>Series</span>
                <input
                  inputMode="numeric"
                  aria-label={`Series for ${source?.name ?? "exercise"}`}
                  value={String(row.series)}
                  onChange={(event) => {
                    const series = Math.max(1, Math.min(20, Number(event.target.value.replace(/\D/g, "")) || 1))
                    setRows((current) => current.map((item) => (item.key === row.key ? { ...item, series } : item)))
                  }}
                />
              </label>
              <label>
                <span>Repetitions</span>
                <input
                  aria-label={`Repetitions for ${source?.name ?? "exercise"}`}
                  value={row.reps}
                  placeholder="8–12"
                  onChange={(event) => setRows((current) => current.map((item) => (item.key === row.key ? { ...item, reps: event.target.value } : item)))}
                />
              </label>
            </li>
          )
        })}
      </ol>
      <button type="button" className="quiet build-add" onClick={() => setPicking((value) => !value)}>
        {picking ? "Close exercises" : "Add exercise"}
      </button>
      {picking ? (
        <div className="build-catalog" role="list">
          {catalog.map((exercise) => (
            <button key={exercise.id} type="button" role="listitem" onClick={() => addExercise(exercise.id)}>
              {exercise.name}
            </button>
          ))}
        </div>
      ) : null}

      <h2 className="section-title">When</h2>
      {months.length > 0 ? (
        <label className="build-field">
          <span>Month</span>
          <select
            value={monthId}
            aria-label="Month"
            onChange={(event) => {
              setMonthId(event.target.value)
              setDates([])
            }}
          >
            {months.map((item) => (
              <option key={item.id} value={item.id}>
                {formatMonthTitle(item.id)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="chip-row" role="group" aria-label="Weekdays">
        {WEEKDAY_CHIPS.map((chip) => (
          <button
            key={chip.day}
            type="button"
            aria-pressed={weekdays.includes(chip.day)}
            onClick={() => setWeekdays((current) => (current.includes(chip.day) ? current.filter((day) => day !== chip.day) : [...current, chip.day]))}
          >
            {chip.label}
          </button>
        ))}
      </div>
      {month ? (
        <div className="build-days" role="group" aria-label="Dates">
          {calendarWeeks(month).map((week, weekIndex) => (
            <div className="build-week" key={weekIndex}>
              {week.map((iso, dayIndex) =>
                iso ? (
                  <button
                    key={iso}
                    type="button"
                    aria-pressed={dates.includes(iso)}
                    onClick={() => setDates((current) => (current.includes(iso) ? current.filter((day) => day !== iso) : [...current, iso]))}
                  >
                    {Number(iso.slice(-2))}
                  </button>
                ) : (
                  <span key={`${weekIndex}-${dayIndex}`} />
                ),
              )}
            </div>
          ))}
        </div>
      ) : null}
      <button type="button" className="primary" disabled={!canSave} onClick={save}>
        Save
      </button>
    </main>
  )
}

function upcomingMonths(today: string): TrainingMonth[] {
  const current = trainingMonthFor(today)
  if (!current) return []
  const months: TrainingMonth[] = []
  let id: string | null = shiftMonth(current.id, 1)
  while (id && months.length < 6) {
    const month = trainingMonthById(id)
    if (!month) break
    months.push(month)
    id = shiftMonth(id, 1)
  }
  return months
}

function daysIn(month: TrainingMonth): string[] {
  const days: string[] = []
  for (const week of calendarWeeks(month)) {
    for (const iso of week) {
      if (iso) days.push(iso)
    }
  }
  return days
}
