import { useState, type CSSProperties } from "react"
import { cycleOn, periodDates } from "../cycle"
import { useApp } from "../context"
import {
  calendarWeeks,
  formatRange,
  formatShort,
  isBeforeProgram,
  PROGRAM_START,
  resolvedWorkout,
  workoutIdFor,
  reviewStatus,
  shiftMonth,
  trainingMonthById,
  trainingMonthFor,
  WEEKDAY_INITIALS,
} from "../dates"
import { WORKOUT_SHORT, WORKOUTS, WEEK_ORDER } from "../program"

export function MonthScreen() {
  const { state, today, selected, setSelected, setTab, openPlan } = useApp()
  const seed = trainingMonthFor(selected) ?? trainingMonthFor(PROGRAM_START)
  const [monthId, setMonthId] = useState(seed?.id ?? "2026-10")
  const month = trainingMonthById(monthId)
  if (!month) return null

  const weeks = calendarWeeks(month)
  const period = state.cycle ? periodDates(weeks.flat().filter((day): day is string => Boolean(day)), state.cycle) : new Set<string>()
  const review = state.reviews[month.id]
  const pending = reviewStatus(today, state.reviews)
  const previous = shiftMonth(month.id, -1)
  const next = shiftMonth(month.id, 1)
  const far = shiftMonth(today.slice(0, 7), 12)

  let status = `Validação em ${formatShort(month.end)}`
  if (review) status = `Peso validado: ${review.kg.toLocaleString("pt-BR")} kg`
  else if (today > month.end) status = "Validação pendente"
  else if (pending && pending.month.id === month.id && !pending.overdue) status = "Validação hoje"

  return (
    <main className="screen">
      <header className="page-head">
        <p className="eyebrow">Mês de treino</p>
        <div className="month-switch">
          <button type="button" aria-label="Mês anterior" disabled={!previous} onClick={() => previous && setMonthId(previous)}>
            ‹
          </button>
          <h1>{month.label}</h1>
          <button
            type="button"
            aria-label="Próximo mês"
            disabled={!next || (far != null && next > far)}
            onClick={() => next && setMonthId(next)}
          >
            ›
          </button>
        </div>
        <p className="lede">
          {formatRange(month)} · {status}
        </p>
      </header>

      <button type="button" className="add-card" onClick={() => openPlan(selected >= month.start && selected <= month.end ? selected : today >= month.start && today <= month.end ? today : month.start)}>
        Novo treino neste mês
      </button>

      <div className="calendar">
        <div className="cal-head">
          {WEEKDAY_INITIALS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        {weeks.map((week, weekIndex) => (
          <div className="cal-week" key={weekIndex}>
            {week.map((iso, dayIndex) => {
              if (!iso) return <span key={`${weekIndex}-${dayIndex}`} />
              const workoutId = resolvedWorkout(iso, state.schedule)
              const workout = workoutId ? WORKOUTS[workoutId] : null
              const phase = state.cycle ? cycleOn(iso, state.cycle)?.phase : null
              const weekly = workoutIdFor(iso)
              const choice = state.schedule[iso]
              const moved = choice != null && choice !== (weekly ?? "rest")
              const log = state.logs[iso]
              const locked = isBeforeProgram(iso)
              const className = [
                "day",
                workout ? "has" : "",
                iso === selected ? "selected" : "",
                iso === today ? "today" : "",
                log?.done ? "done" : "",
                locked ? "locked" : "",
                period.has(iso) ? "period" : "",
                phase ? `phase-${phase}` : "",
                moved ? "moved" : "",
              ]
                .filter(Boolean)
                .join(" ")
              const label = workout
                ? `${formatShort(iso)}, ${WORKOUT_SHORT[workout.id]}${log?.done ? ", concluído" : ""}`
                : formatShort(iso)
              if (locked) {
                return (
                  <span key={iso} className={className}>
                    {Number(iso.slice(-2))}
                  </span>
                )
              }
              return (
                <button
                  key={iso}
                  type="button"
                  className={className}
                  style={{ "--tone": workout?.tone ?? "transparent" } as CSSProperties}
                  aria-label={label}
                  aria-pressed={iso === selected}
                  onClick={() => {
                    setSelected(iso)
                    setTab("training")
                  }}
                >
                  <span>{Number(iso.slice(-2))}</span>
                  {workout ? <i /> : null}
                  {period.has(iso) ? <b className="bleed" /> : null}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <ul className="legend">
        {WEEK_ORDER.map((id) => (
          <li key={id}>
            <i style={{ background: WORKOUTS[id].tone }} />
            {WORKOUT_SHORT[id]}
          </li>
        ))}
        {state.cycle ? (
          <>
            <li>
              <i className="swatch period" />
              Menstrual
            </li>
            <li>
              <i className="swatch follicular" />
              Folicular
            </li>
            <li>
              <i className="swatch ovulation" />
              Ovulatória
            </li>
            <li>
              <i className="swatch luteal" />
              Lútea
            </li>
          </>
        ) : null}
      </ul>
      <p className="hint">
        O fundo do dia segue a fase do ciclo. O ponto é o plano de treino. Ao abrir, você escolhe o treino.
        {state.cycle ? "" : " Registre o ciclo para ver se a natação e os exercícios cabem."}
      </p>
    </main>
  )
}
