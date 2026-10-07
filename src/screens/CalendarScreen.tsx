import { useState } from "react"
import { PageMenu } from "../components/PageMenu"
import { cycleOn } from "../cycle"
import { useApp } from "../context"
import {
  addDays,
  calendarWeeks,
  isBeforeProgram,
  PROGRAM_START,
  resolvedWorkout,
  shiftMonth,
  trainingMonthById,
  trainingMonthFor,
  WEEKDAY_INITIALS,
  workoutIdFor,
} from "../dates"
import { exercisesFromPlan, isPlanRef, isWorkoutId } from "../plans"
import { loggedMinutes, PHASE_NAME, WORKOUT_CARD, WORKOUT_TITLE, formatEnglish, formatKg, formatMonthTitle } from "../present"
import type { CycleSettings } from "../types"

export function CalendarScreen() {
  const { state, today, selected, setSelected, setTab } = useApp()
  const seed = trainingMonthFor(selected) ?? trainingMonthFor(PROGRAM_START)
  const [monthId, setMonthId] = useState(seed?.id ?? "2026-10")
  const month = trainingMonthById(monthId)
  if (!month) return null

  const weeks = calendarWeeks(month)
  const previous = shiftMonth(month.id, -1)
  const next = shiftMonth(month.id, 1)
  const far = shiftMonth(today.slice(0, 7), 12)
  const spot = state.cycle ? cycleOn(selected, state.cycle) : null
  const planned = resolvedWorkout(selected, state.schedule)
  const selectedPlan = isPlanRef(state.schedule[selected]) ? state.plans[state.schedule[selected].slice(5)] : undefined
  const log = state.logs[selected]
  const weight = state.weights.find((item) => item.date === selected)
  const minutes = loggedMinutes(log?.entries)
  const upcoming = nextDays(selected, state.schedule, state.plans)

  function jumpToday() {
    setSelected(today)
    const current = trainingMonthFor(today)
    if (current) setMonthId(current.id)
  }

  let trainingTitle = "Recovery"
  let trainingStatus = "Planned"
  if (selectedPlan) {
    trainingTitle = selectedPlan.name
    if (log?.done) trainingStatus = minutes != null ? `Completed · ${minutes} min` : "Completed"
    else if (log && Object.keys(log.entries).length > 0) trainingStatus = "Not logged"
    else trainingStatus = "Planned"
  } else if (planned) {
    trainingTitle = WORKOUT_TITLE[planned]
    if (log?.done) trainingStatus = minutes != null ? `Completed · ${minutes} min` : "Completed"
    else if (log && Object.keys(log.entries).length > 0) trainingStatus = "Not logged"
    else trainingStatus = "Planned"
  }     else if (isWorkoutId(log?.workoutId)) {
    trainingTitle = WORKOUT_TITLE[log.workoutId]
    trainingStatus = log.done ? (minutes != null ? `Completed · ${minutes} min` : "Completed") : "Not logged"
  }

  return (
    <main className="screen calendar-screen">
      <header className="page-head cal-head-row">
        <h1>Calendar</h1>
        <div className="head-actions">
          <button type="button" className="text-link" onClick={jumpToday}>
            Today
          </button>
          <PageMenu />
        </div>
      </header>
      <div className="month-switch">
        <button type="button" aria-label="Previous month" disabled={!previous} onClick={() => previous && setMonthId(previous)}>
          ‹
        </button>
        <h2>{formatMonthTitle(month.id)}</h2>
        <button
          type="button"
          aria-label="Next month"
          disabled={!next || (far != null && next > far)}
          onClick={() => next && setMonthId(next)}
        >
          ›
        </button>
      </div>

      <div className="calendar cal-ava">
        <div className="cal-head">
          {WEEKDAY_INITIALS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        {weeks.map((week, weekIndex) => (
          <div className="cal-week" key={weekIndex}>
            {week.map((iso, dayIndex) => {
              if (!iso) return <span key={`${weekIndex}-${dayIndex}`} />
              const scheduled = state.schedule[iso]
              const custom = isPlanRef(scheduled) ? state.plans[scheduled.slice(5)] : undefined
              const customMoves = custom ? exercisesFromPlan(custom) : []
              const workoutId = custom ? null : resolvedWorkout(iso, state.schedule)
              const loggedId = state.logs[iso]?.workoutId
              const phase = state.cycle ? cycleOn(iso, state.cycle)?.phase : null
              const cycleMark = hasCycleMark(iso, state.cycle, state.cycleDays[iso])
              const strength = customMoves.some((exercise) => exercise.kind === "strength" || exercise.kind === "core") || isStrength(workoutId) || isStrength(loggedId)
              const swim = !strength && (customMoves.some((exercise) => exercise.kind === "swim") || isSwim(workoutId) || isSwim(loggedId))
              const locked = isBeforeProgram(iso)
              const className = ["day", iso === selected ? "selected" : "", iso === today ? "today" : "", locked ? "locked" : "", phase ? `phase-${phase}` : ""]
                .filter(Boolean)
                .join(" ")
              if (locked) {
                return (
                  <span key={iso} className={className}>
                    {Number(iso.slice(-2))}
                  </span>
                )
              }
              return (
                <button key={iso} type="button" className={className} aria-pressed={iso === selected} aria-label={formatEnglish(iso)} onClick={() => setSelected(iso)}>
                  <span>{Number(iso.slice(-2))}</span>
                  <i className="marks" aria-hidden="true">
                    {strength ? <b className="dot strength" /> : null}
                    {swim && !strength ? <b className="dot swim" /> : null}
                    {cycleMark ? <b className="dot cycle" /> : null}
                  </i>
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <section className="day-panel">
        <h2>{formatEnglish(selected)}</h2>
        {spot ? (
          <p>
            <span>Cycle</span>
            <strong>
              Day {spot.day} · {PHASE_NAME[spot.phase]}
            </strong>
          </p>
        ) : (
          <p>
            <span>Cycle</span>
            <button type="button" className="text-link" onClick={() => setTab("cycle")}>
              View cycle
            </button>
          </p>
        )}
        <button type="button" className="panel-row" onClick={() => setTab("training")}>
          <span>Training</span>
          <strong>
            {trainingTitle}
            <em>{trainingStatus}</em>
          </strong>
        </button>
        {weight ? (
          <p>
            <span>Weight</span>
            <strong>{formatKg(weight.kg)} kg</strong>
          </p>
        ) : null}
      </section>

      <h2 className="section-title">Upcoming</h2>
      <ul className="upcoming">
        {upcoming.map((item) => (
          <li key={item.date}>
            <span>{formatEnglish(item.date).replace(/^[A-Za-z]+, /, "")}</span>
            <strong>{item.title}</strong>
          </li>
        ))}
      </ul>
    </main>
  )
}

function isStrength(id: string | null | undefined): boolean {
  return id === "pernas-a" || id === "pernas-b" || id === "superiores-a" || id === "superiores-b"
}

function isSwim(id: string | null | undefined): boolean {
  return id === "natacao-a" || id === "natacao-b"
}

function hasCycleMark(iso: string, cycle: CycleSettings | null, day: { flow: string; cramps: string; pill?: boolean } | undefined): boolean {
  if (day && (day.flow !== "none" || day.cramps !== "none" || day.pill != null)) return true
  if (!cycle) return false
  return cycleOn(iso, cycle)?.phase === "period"
}

function nextDays(selected: string, schedule: Record<string, import("../types").DayPlan>, plans: import("../types").AppState["plans"]): { date: string; title: string }[] {
  const items: { date: string; title: string }[] = []
  let cursor = selected
  for (let step = 0; step < 21 && items.length < 4; step += 1) {
    cursor = addDays(cursor, 1)
    if (isBeforeProgram(cursor)) continue
    const planned = schedule[cursor]
    if (isPlanRef(planned)) {
      items.push({ date: cursor, title: plans[planned.slice(5)]?.name ?? "Training" })
      continue
    }
    if (planned === "rest") {
      items.push({ date: cursor, title: "Recovery" })
      continue
    }
    const id = planned ?? workoutIdFor(cursor)
    items.push({ date: cursor, title: id ? WORKOUT_CARD[id] : "Recovery" })
  }
  return items
}
