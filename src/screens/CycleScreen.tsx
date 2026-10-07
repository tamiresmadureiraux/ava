import { useState, type FormEvent } from "react"
import { PageMenu } from "../components/PageMenu"
import { adviceFor, cycleOn, type Phase, type Readiness } from "../cycle"
import { useApp } from "../context"
import { formatLong, formatShort } from "../dates"
import { PHASE_NAME, daysUntil, formatEnglish, phaseInsight, phaseWindow } from "../present"
import type { Cramps, CycleSettings, Flow } from "../types"

const FLOW: { id: Flow; label: string }[] = [
  { id: "none", label: "No flow" },
  { id: "light", label: "Light" },
  { id: "medium", label: "Medium" },
  { id: "heavy", label: "Heavy" },
]

const CRAMPS: { id: Cramps; label: string }[] = [
  { id: "none", label: "None" },
  { id: "mild", label: "Mild" },
  { id: "strong", label: "Strong" },
]

const ORDER: Phase[] = ["period", "follicular", "ovulation", "luteal"]

export function CycleScreen() {
  const { state, today, selected, returnTab, setTab, saveCycle, setCycleDay } = useApp()
  const cycle = state.cycle
  const [lastStart, setLastStart] = useState(cycle?.lastStart ?? today)
  const [cycleLength, setCycleLength] = useState(cycle?.cycleLength ?? 28)
  const [periodLength, setPeriodLength] = useState(cycle?.periodLength ?? 5)
  const [editing, setEditing] = useState(!cycle)
  const spot = cycle ? cycleOn(selected, cycle) : null
  const log = state.cycleDays[selected]
  const advice = spot ? adviceFor(spot, log) : null
  const window = spot ? phaseWindow(spot.day, spot.cycleLength, spot.periodLength, spot.phase) : null
  const insight = spot ? phaseInsight(spot.phase, spot.lateLuteal) : null
  const back = returnTab === "cycle" ? "home" : returnTab

  function save(event: FormEvent) {
    event.preventDefault()
    if (periodLength >= cycleLength) return
    const next: CycleSettings = { lastStart, cycleLength, periodLength }
    if (cycle?.endedOn && cycle.endedOn >= lastStart) next.endedOn = cycle.endedOn
    saveCycle(next)
    setEditing(false)
  }

  function closeCycle() {
    if (!cycle || selected < cycle.lastStart) return
    saveCycle({ ...cycle, endedOn: selected })
  }

  function reopenCycle() {
    if (!cycle) return
    saveCycle({ lastStart: cycle.lastStart, cycleLength: cycle.cycleLength, periodLength: cycle.periodLength })
  }

  return (
    <main className="screen cycle-screen">
      <header className="train-top">
        <button type="button" className="icon-btn" aria-label="Back" onClick={() => setTab(back)}>
          ‹
        </button>
        <strong>Your cycle</strong>
        <PageMenu />
      </header>

      {spot && advice && window && insight && !editing ? (
        <>
          <p className="eyebrow">Current phase</p>
          <h1>Day {spot.day}</h1>
          <p className="phase-name">{PHASE_NAME[spot.phase]}</p>
          <p className="lede">
            {window.remaining === 0 ? "Last day of this phase" : `Estimated: ${window.remaining} ${window.remaining === 1 ? "day" : "days"} remaining`}
          </p>
          <PhaseWave phase={spot.phase} />

          <article className="insight-card">
            <h2>{insight.title}</h2>
            <p>{insight.body}</p>
            <p className="hint">A guide from the dates you entered, not a medical rule.</p>
          </article>

          <h2 className="section-title">Training recommendation</h2>
          <ul className="guide-list">
            <li>
              <span>Strength</span>
              <strong>{strengthLabel(advice.gym)}</strong>
            </li>
            <li>
              <span>Progression</span>
              <strong>{progressLabel(advice.gym)}</strong>
            </li>
            <li>
              <span>Cardio</span>
              <strong>{cardioLabel(advice.swim)}</strong>
            </li>
            <li>
              <span>Recovery</span>
              <strong>{recoveryLabel(advice.gym)}</strong>
            </li>
          </ul>

          <div className="pair">
            <article>
              <span>Next phase</span>
              <strong>{PHASE_NAME[window.nextPhase]}</strong>
              <em>Estimated in {Math.max(0, window.daysUntilNext)} {window.daysUntilNext === 1 ? "day" : "days"}</em>
            </article>
            <article>
              <span>Next period</span>
              <strong>{formatShort(spot.nextStart)}</strong>
              <em>{daysUntil(selected, spot.nextStart) === 0 ? "Estimated today" : `Estimated in ${daysUntil(selected, spot.nextStart)} days`}</em>
            </article>
          </div>
        </>
      ) : !cycle || editing ? (
        <form className="weight-form" onSubmit={save}>
          <h1>{cycle ? "Edit cycle data" : "Record your cycle"}</h1>
          <p className="lede">Add the start of your last period. The phase stays empty until those dates exist.</p>
          <label className="metric text">
            <span>Last period start</span>
            <input type="date" required min="2024-01-01" max={today} value={lastStart} onChange={(event) => setLastStart(event.target.value)} />
          </label>
          <Stepper label="Cycle length" hint="days from one start to the next" value={cycleLength} min={21} max={45} onChange={setCycleLength} />
          <Stepper label="Period length" hint="days of flow" value={periodLength} min={2} max={10} onChange={setPeriodLength} />
          {periodLength >= cycleLength ? <p className="error">Period length has to be shorter than the cycle.</p> : null}
          <button type="submit" className="primary" disabled={!lastStart || periodLength >= cycleLength}>
            Save cycle
          </button>
          {cycle ? (
            <button type="button" className="quiet" onClick={() => setEditing(false)}>
              Cancel
            </button>
          ) : null}
        </form>
      ) : (
        <section className="insight-card">
          <h1>Outside this cycle</h1>
          <p className="lede">
            Closed on {formatLong(cycle.endedOn ?? selected)}. Days from {formatShort(cycle.lastStart)} through that date still keep their phase.
          </p>
        </section>
      )}

      {cycle && !editing ? (
        <>
          <h2 className="section-title">Cycle history</h2>
          <ul className="guide-list">
            <li>
              <span>Average cycle</span>
              <strong>{cycle.cycleLength} days</strong>
            </li>
            <li>
              <span>Average period</span>
              <strong>{cycle.periodLength} days</strong>
            </li>
            <li>
              <span>Last cycle</span>
              <strong>{cycle.endedOn ? `${daysUntil(cycle.lastStart, cycle.endedOn) + 1} days` : `${cycle.cycleLength} days`}</strong>
            </li>
          </ul>
          <button type="button" className="text-link" onClick={() => setEditing(true)}>
            Edit cycle data
          </button>

          <h2 className="section-title">How is {selected === today ? "today" : "this day"}</h2>
          <p className="hint">{formatEnglish(selected)}</p>
          <div className="segments" role="group" aria-label="Flow">
            {FLOW.map((item) => (
              <button key={item.id} type="button" aria-pressed={(log?.flow ?? "none") === item.id} onClick={() => setCycleDay(selected, { flow: item.id })}>
                {item.label}
              </button>
            ))}
          </div>
          <div className="segments" role="group" aria-label="Cramps">
            {CRAMPS.map((item) => (
              <button key={item.id} type="button" aria-pressed={(log?.cramps ?? "none") === item.id} onClick={() => setCycleDay(selected, { cramps: item.id })}>
                {item.label}
              </button>
            ))}
          </div>
          <h2 className="group-label">Contraceptive</h2>
          <div className="segments" role="group" aria-label="Contraceptive">
            <button type="button" aria-pressed={log?.pill === true} onClick={() => setCycleDay(selected, { pill: log?.pill === true ? undefined : true })}>
              Tomei hoje
            </button>
            <button type="button" aria-pressed={log?.pill === false} onClick={() => setCycleDay(selected, { pill: log?.pill === false ? undefined : false })}>
              Não tomei
            </button>
          </div>
          {cycle.endedOn ? (
            <button type="button" className="quiet" onClick={reopenCycle}>
              Reopen cycle
            </button>
          ) : selected >= cycle.lastStart ? (
            <button type="button" className="cycle-close" onClick={closeCycle}>
              Close cycle
            </button>
          ) : (
            <p className="hint">Open a day on or after {formatShort(cycle.lastStart)} to close the cycle.</p>
          )}
          <button
            type="button"
            className="primary"
            onClick={() => {
              saveCycle({ lastStart: selected, cycleLength: cycle.cycleLength, periodLength: cycle.periodLength })
              setLastStart(selected)
              setCycleDay(selected, { flow: log?.flow === "none" || !log ? "medium" : log.flow })
            }}
          >
            Period started {selected === today ? "today" : "this day"}
          </button>
          <p className="hint">A guide from the dates you entered, not a medical rule. Stop if pain is strong.</p>
        </>
      ) : null}
    </main>
  )
}

function strengthLabel(ready: Readiness): string {
  if (ready === "yes") return "Higher intensity"
  if (ready === "easy") return "Lower intensity"
  return "Lighter work"
}

function progressLabel(ready: Readiness): string {
  if (ready === "yes") return "Increase load when ready"
  return "Keep the load steady"
}

function cardioLabel(ready: Readiness): string {
  if (ready === "yes") return "Moderate"
  if (ready === "easy") return "Easy pace"
  return "Swimming not recommended"
}

function recoveryLabel(ready: Readiness): string {
  if (ready === "yes") return "Normal"
  return "Extra rest if you need it"
}

function PhaseWave({ phase }: { phase: Phase }) {
  const width = 320
  const height = 72
  const points = Array.from({ length: 64 }, (_, index) => {
    const x = (index / 63) * width
    const y = height / 2 - Math.sin((index / 63) * Math.PI * 2) * 22
    return `${x},${y}`
  }).join(" ")
  return (
    <div className="wave" aria-hidden="true">
      <svg viewBox={`0 0 ${width} ${height}`}>
        <polyline points={points} />
      </svg>
      <ol>
        {ORDER.map((item) => (
          <li key={item} className={item === phase ? "on" : ""}>
            {PHASE_NAME[item]}
          </li>
        ))}
      </ol>
    </div>
  )
}

function Stepper({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  hint: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) {
  return (
    <div className="stepper">
      <div>
        <strong>{label}</strong>
        <span>{hint}</span>
      </div>
      <div>
        <button type="button" aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
          −
        </button>
        <b>{value}</b>
        <button type="button" aria-label={`Increase ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
          +
        </button>
      </div>
    </div>
  )
}
