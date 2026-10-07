import { useState, type FormEvent } from "react"
import { PageMenu } from "../components/PageMenu"
import { cycleOn, type Phase } from "../cycle"
import { useApp } from "../context"
import { addDays, formatShort } from "../dates"
import { formatDelta, formatEntryLine, parseNum } from "../format"
import { buildSeries, latestWeight, seriesNumbers, seriesUnit, type Series } from "../logic"
import { PHASE_NAME, formatEnglishShort, formatKg, formatPercent, formatSigned, meanPercentChange, rangeStart, recentRecords, strengthIndex, weightsInRange } from "../present"
import { WORKOUTS } from "../program"
import type { CSSProperties } from "react"
import type { ProgressView } from "../types"

const VIEWS: { id: ProgressView; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "weight", label: "Weight" },
  { id: "strength", label: "Strength" },
  { id: "body", label: "Body" },
]

const RANGES = [
  { id: "4w", label: "4 weeks", days: 28, caption: "4 weeks" },
  { id: "3m", label: "3 months", days: 91, caption: "3 months" },
  { id: "6m", label: "6 months", days: 182, caption: "6 months" },
  { id: "1y", label: "1 year", days: 365, caption: "1 year" },
] as const

const PHASES: Phase[] = ["period", "follicular", "ovulation", "luteal"]

export function ProgressScreen() {
  const { progressView, setProgressView, setTab } = useApp()
  return (
    <main className={progressView === "weight" ? "screen progress-screen light-seg" : "screen progress-screen"}>
      <header className="page-head cal-head-row">
        <div>
          <h1>Progress</h1>
          {progressView === "overview" ? <p className="lede">See how your training is evolving.</p> : null}
        </div>
        <PageMenu />
      </header>
      <div className="view-switch" role="tablist" aria-label="Progress">
        {VIEWS.map((view) => (
          <button key={view.id} type="button" role="tab" aria-selected={progressView === view.id} className={progressView === view.id ? "on" : ""} onClick={() => setProgressView(view.id)}>
            {view.label}
          </button>
        ))}
      </div>
      {progressView === "overview" ? <Overview onWeight={() => setProgressView("weight")} onCycle={() => setTab("cycle")} /> : null}
      {progressView === "weight" ? <WeightPanel /> : null}
      {progressView === "strength" ? <StrengthList /> : null}
      {progressView === "body" ? (
        <section className="quiet-card">
          <h2>Body</h2>
          <p>Measurements will live here.</p>
        </section>
      ) : null}
    </main>
  )
}

function Overview({ onWeight, onCycle }: { onWeight: () => void; onCycle: () => void }) {
  const { state, today } = useApp()
  const [rangeId, setRangeId] = useState<(typeof RANGES)[number]["id"]>("3m")
  const range = RANGES.find((item) => item.id === rangeId) ?? RANGES[1]
  const change = meanPercentChange(state, today, range.days)
  const index = strengthIndex(state, today, range.days)
  const weights = weightsInRange(state.weights, today, range.days)
  const latest = latestWeight(state.weights.filter((item) => item.date <= today))
  const first = weights[0]
  const last = weights.at(-1)
  const weightDelta = first && last && first.id !== last.id ? last.kg - first.kg : null
  const records = recentRecords(state)
  const weeks = consistency(state, today, range.days)
  const average = weeks.length ? weeks.reduce((sum, week) => sum + week.count, 0) / weeks.length : 0
  const cycleBars = cycleLoads(state, today)

  return (
    <>
      <div className="range-row">
        {RANGES.map((item) => (
          <button key={item.id} type="button" className={item.id === rangeId ? "on" : ""} onClick={() => setRangeId(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      <article className="dash-card">
        <h2>Strength</h2>
        <p className="dash-stat">{change == null ? "—" : formatPercent(change)}</p>
        <p className="hint">Over the last {range.caption}</p>
        {index.length >= 2 ? <Line values={index.map((point) => point.kg)} /> : <p className="hint">Not enough logged loads in this range.</p>}
      </article>
      <button type="button" className="dash-card as-button" onClick={onWeight}>
        <h2>Weight</h2>
        <p className="dash-stat">{latest ? `${formatKg(latest.kg)} kg` : "—"}</p>
        <p className="hint">{weightDelta == null ? "No change to show yet" : formatSigned(weightDelta, "kg")}</p>
        {weights.length >= 2 ? <Line values={weights.map((item) => item.kg)} /> : null}
      </button>
      <article className="dash-card">
        <h2>Training consistency</h2>
        <p className="dash-stat">{weeks.some((week) => week.count > 0) ? average.toFixed(1) : "—"}</p>
        <p className="hint">Average workouts per week</p>
        <ol className="bars">
          {weeks.map((week) => (
            <li key={week.start}>
              <i style={{ height: `${Math.min(100, week.count * 25)}%` }} />
              <span>{week.count}</span>
            </li>
          ))}
        </ol>
      </article>
      <article className="dash-card">
        <h2>Recent PRs</h2>
        {records.length === 0 ? (
          <p className="hint">Records appear after you log loads.</p>
        ) : (
          <ul className="pr-list">
            {records.map((row) => (
              <li key={`${row.name}-${row.date}`}>
                <strong>{row.name}</strong>
                <em>
                  {formatKg(row.kg)} kg · {formatSigned(row.delta, "kg")}
                </em>
                <span>{formatShort(row.date)}</span>
              </li>
            ))}
          </ul>
        )}
      </article>
      <article className="dash-card">
        <h2>Strength across your cycle</h2>
        {cycleBars ? (
          <>
            <ol className="phase-bars">
              {PHASES.map((phase) => (
                <li key={phase}>
                  <i style={{ height: `${cycleBars.max > 0 ? (cycleBars.values[phase] / cycleBars.max) * 100 : 0}%` }} />
                  <span>{PHASE_NAME[phase]}</span>
                </li>
              ))}
            </ol>
            {cycleBars.note ? <p>{cycleBars.note}</p> : null}
            <p className="hint">A guide from your dates and logs, not a medical conclusion.</p>
          </>
        ) : (
          <p className="hint">{state.cycle ? "Log a few strength sessions to see them by phase." : "Record a cycle to compare sessions by phase."}</p>
        )}
        <button type="button" className="text-link" onClick={onCycle}>
          Explore insights
        </button>
      </article>
    </>
  )
}

function WeightPanel() {
  const { state, today, saveWeight, setGoal, deleteWeight, openReview } = useApp()
  const [chartRange, setChartRange] = useState<"1M" | "3M" | "6M" | "1Y" | "all">("3M")
  const [picked, setPicked] = useState<number | null>(null)
  const [sheet, setSheet] = useState(false)
  const [goalOpen, setGoalOpen] = useState(false)
  const days = chartRange === "1M" ? 30 : chartRange === "3M" ? 91 : chartRange === "6M" ? 182 : chartRange === "1Y" ? 365 : null
  const points = weightsInRange(state.weights, today, days)
  const latest = latestWeight(state.weights.filter((item) => item.date <= today))
  const first = points[0]
  const delta = first && latest && first.date !== latest.date && points.some((item) => item.date === latest.date) ? latest.kg - first.kg : null
  const weekStart = addDays(today, -7)
  const weekPoints = state.weights.filter((item) => item.date <= today && item.date >= weekStart)
  const weekAvg = weekPoints.length ? weekPoints.reduce((sum, item) => sum + item.kg, 0) / weekPoints.length : null
  const prior = [...state.weights].filter((item) => item.date <= weekStart).sort((a, b) => b.date.localeCompare(a.date))[0]
  const weekDelta = latest && prior && prior.date !== latest.date ? latest.kg - prior.kg : null
  const goal = state.goalKg
  const toward = goal != null && first && latest && first.kg !== goal ? Math.max(0, Math.min(100, ((latest.kg - first.kg) / (goal - first.kg)) * 100)) : null

  return (
    <>
      <p className="weight-hero">
        {latest ? (
          <>
            {formatKg(latest.kg)}
            <small>kg</small>
          </>
        ) : (
          "—"
        )}
      </p>
      <p className="lede">
        {delta != null && first ? `${formatSigned(delta, "kg")} since ${formatEnglishShort(first.date)}` : latest ? "Log another weigh-in to see a change." : "Log a weigh-in to start the chart."}
      </p>
      <div className="range-row">
        {(["1M", "3M", "6M", "1Y", "all"] as const).map((id) => (
          <button key={id} type="button" className={chartRange === id ? "on" : ""} onClick={() => { setChartRange(id); setPicked(null) }}>
            {id === "all" ? "All" : id}
          </button>
        ))}
      </div>
      <WeightChart points={points} picked={picked} onPick={setPicked} />
      <article className="dash-card">
        <h2>Goal weight</h2>
        {goal != null && toward != null ? (
          <>
            <p className="dash-stat">{formatKg(goal)} kg</p>
            <div className="bar" aria-hidden="true">
              <span style={{ width: `${toward}%` }} />
            </div>
            <p className="hint">{Math.round(toward)}% of the way from the first weigh-in in this range.</p>
          </>
        ) : goal != null ? (
          <p className="dash-stat">{formatKg(goal)} kg</p>
        ) : (
          <p className="hint">Set a goal when you want a target on the chart.</p>
        )}
        {goalOpen ? (
          <GoalForm
            initial={goal}
            onSave={(value) => {
              setGoal(value)
              setGoalOpen(false)
            }}
            onClose={() => setGoalOpen(false)}
          />
        ) : (
          <button type="button" className="text-link" onClick={() => setGoalOpen(true)}>
            {goal == null ? "Set goal weight" : "Edit goal"}
          </button>
        )}
      </article>
      <div className="metric-row">
        <article>
          <strong>{latest ? formatKg(latest.kg) : "—"}</strong>
          <span>Current</span>
        </article>
        <article>
          <strong>{weekDelta == null ? "—" : formatSigned(weekDelta, "kg")}</strong>
          <span>Weekly change</span>
        </article>
        <article>
          <strong>{weekAvg == null ? "—" : formatKg(weekAvg)}</strong>
          <span>Average</span>
        </article>
      </div>
      <button type="button" className="primary" onClick={() => setSheet(true)}>
        + Log weight
      </button>
      <button type="button" className="text-link" onClick={openReview}>
        Monthly review
      </button>
      {state.weights.length > 0 ? (
        <ul className="plain-list">
          {[...state.weights]
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 6)
            .map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{formatKg(item.kg)} kg</strong>
                  <span>
                    {formatShort(item.date)}
                    {item.note ? ` · ${item.note}` : ""}
                  </span>
                </div>
                <button type="button" className="linkish" onClick={() => deleteWeight(item.id)}>
                  Delete
                </button>
              </li>
            ))}
        </ul>
      ) : null}
      {sheet ? <LogSheet onClose={() => setSheet(false)} onSave={saveWeight} today={today} /> : null}
    </>
  )
}

function WeightChart({
  points,
  picked,
  onPick,
}: {
  points: { date: string; kg: number }[]
  picked: number | null
  onPick: (index: number) => void
}) {
  if (points.length === 0) return <p className="quiet-card">No weigh-ins in this range.</p>
  const width = 320
  const height = 160
  const min = Math.min(...points.map((point) => point.kg))
  const max = Math.max(...points.map((point) => point.kg))
  const span = max - min || 1
  const coords = points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * (width - 16) + 8
    const y = height - ((point.kg - min) / span) * (height - 24) - 12
    return { x, y, point }
  })
  const active = picked != null ? coords[picked] : coords.at(-1)
  return (
    <div className="weight-chart-wrap">
      {active ? (
        <p className="chart-readout">
          {formatEnglishShort(active.point.date)} · {formatKg(active.point.kg)} kg
        </p>
      ) : null}
      <svg className="weight-chart large" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Weight chart">
        <polyline points={coords.map((item) => `${item.x},${item.y}`).join(" ")} />
        {coords.map((item, index) => (
          <circle key={item.point.date} cx={item.x} cy={item.y} r={picked === index ? 6 : 4} onClick={() => onPick(index)} />
        ))}
      </svg>
    </div>
  )
}

function GoalForm({ initial, onSave, onClose }: { initial: number | null; onSave: (kg: number) => void; onClose: () => void }) {
  const [value, setValue] = useState(initial ? formatKg(initial) : "")
  const [error, setError] = useState("")
  function submit(event: FormEvent) {
    event.preventDefault()
    const kg = parseNum(value)
    if (kg == null || kg < 25 || kg > 300) {
      setError("Enter a goal between 25 and 300 kg.")
      return
    }
    onSave(Math.round(kg * 10) / 10)
  }
  return (
    <form onSubmit={submit}>
      <label className="metric">
        <span>Goal (kg)</span>
        <input inputMode="decimal" value={value} onChange={(event) => setValue(event.target.value)} />
      </label>
      {error ? <p className="error">{error}</p> : null}
      <button type="submit" className="primary">
        Save goal
      </button>
      <button type="button" className="quiet" onClick={onClose}>
        Cancel
      </button>
    </form>
  )
}

function LogSheet({
  today,
  onClose,
  onSave,
}: {
  today: string
  onClose: () => void
  onSave: (date: string, kg: number, note?: string) => void
}) {
  const [date, setDate] = useState(today)
  const [kg, setKg] = useState("")
  const [note, setNote] = useState("")
  const [error, setError] = useState("")
  function submit(event: FormEvent) {
    event.preventDefault()
    const value = parseNum(kg)
    if (value == null || value < 25 || value > 300) {
      setError("Enter a weight between 25 and 300 kg.")
      return
    }
    onSave(date, Math.round(value * 10) / 10, note)
    onClose()
  }
  return (
    <div className="backdrop" onClick={onClose}>
      <form className="sheet" onSubmit={submit} onClick={(event) => event.stopPropagation()}>
        <h2>Log weight</h2>
        <label className="metric">
          <span>Weight (kg)</span>
          <input inputMode="decimal" value={kg} onChange={(event) => setKg(event.target.value)} />
        </label>
        <label className="metric text">
          <span>Date</span>
          <input type="date" max={today} value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label className="metric text">
          <span>Note</span>
          <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional" />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" className="primary">
          Save
        </button>
      </form>
    </div>
  )
}

function StrengthList() {
  const { state } = useApp()
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState<string | null>(null)
  const series = buildSeries(state).filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()))
  if (buildSeries(state).length === 0) return <p className="hint">When you log loads, each exercise shows up here.</p>
  return (
    <>
      <label className="metric text single search">
        <span>Search</span>
        <input value={query} placeholder="Hip thrust" onChange={(event) => setQuery(event.target.value)} />
      </label>
      <ul className="series-list">
        {series.map((item) => (
          <SeriesCard key={item.key} series={item} open={open === item.key} onToggle={() => setOpen(open === item.key ? null : item.key)} />
        ))}
      </ul>
    </>
  )
}

function SeriesCard({ series, open, onToggle }: { series: Series; open: boolean; onToggle: () => void }) {
  const numbers = seriesNumbers(series)
  const unit = seriesUnit(series)
  const last = numbers[numbers.length - 1]
  const prev = numbers[numbers.length - 2]
  const delta = last != null && prev != null ? last - prev : null
  const tone = series.points[series.points.length - 1]?.workoutId ? WORKOUTS[series.points[series.points.length - 1]!.workoutId!].tone : "#9b5cff"
  return (
    <li className="series" style={{ "--tone": tone } as CSSProperties}>
      <button type="button" className="series-main" onClick={onToggle} aria-expanded={open}>
        <div>
          <strong>{series.name}</strong>
        </div>
        <div className="series-side">
          <Sparkline values={numbers} />
          <em>{last == null ? "—" : `${formatKg(last)} ${unit}`}</em>
          {delta != null ? <small>{formatDelta(delta, unit)}</small> : null}
        </div>
      </button>
      {open ? (
        <ol>
          {[...series.points].reverse().map((point) => (
            <li key={`${point.date}-${point.entry.name}`}>
              <span>{formatShort(point.date)}</span>
              <strong>{formatEntryLine(series.kind, point.entry)}</strong>
            </li>
          ))}
        </ol>
      ) : null}
    </li>
  )
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null
  const width = 88
  const height = 32
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width
      const y = height - ((value - min) / span) * (height - 4) - 2
      return `${x},${y}`
    })
    .join(" ")
  return (
    <svg className="spark" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline points={points} />
    </svg>
  )
}

function Line({ values }: { values: number[] }) {
  const width = 280
  const height = 72
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const points = values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width
      const y = height - ((value - min) / span) * (height - 8) - 4
      return `${x},${y}`
    })
    .join(" ")
  return (
    <svg className="dash-line" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline points={points} />
    </svg>
  )
}

function consistency(state: ReturnType<typeof useApp>["state"], today: string, days: number): { start: string; count: number }[] {
  const start = rangeStart(today, days)
  const weeks: { start: string; count: number }[] = []
  let cursor = start
  while (cursor <= today) {
    const end = addDays(cursor, 6)
    let count = 0
    for (let step = 0; step < 7; step += 1) {
      const date = addDays(cursor, step)
      if (date > today) break
      if (state.logs[date]?.done) count += 1
    }
    weeks.push({ start: cursor, count })
    cursor = addDays(end, 1)
  }
  return weeks.slice(-8)
}

function cycleLoads(state: ReturnType<typeof useApp>["state"], today: string): { values: Record<Phase, number>; max: number; note: string | null } | null {
  if (!state.cycle) return null
  const buckets: Record<Phase, number[]> = { period: [], follicular: [], ovulation: [], luteal: [] }
  for (const [date, log] of Object.entries(state.logs)) {
    if (date > today) continue
    const spot = cycleOn(date, state.cycle)
    if (!spot) continue
    const loads: number[] = []
    for (const entry of Object.values(log.entries)) {
      if (entry.kind !== "strength" && entry.kind !== "core") continue
      const value = parseNum(entry.secondary)
      if (value != null) loads.push(value)
    }
    if (loads.length === 0) continue
    buckets[spot.phase].push(loads.reduce((sum, value) => sum + value, 0) / loads.length)
  }
  const populated = PHASES.filter((phase) => buckets[phase].length > 0)
  if (populated.length === 0) return null
  const values = {
    period: mean(buckets.period),
    follicular: mean(buckets.follicular),
    ovulation: mean(buckets.ovulation),
    luteal: mean(buckets.luteal),
  }
  const max = Math.max(...PHASES.map((phase) => values[phase]))
  let note: string | null = null
  if (populated.length >= 2) {
    const top = [...populated].sort((a, b) => values[b] - values[a])
    if (top[0] && top[1] && values[top[0]] > values[top[1]]) {
      note = `Your strongest sessions have recently occurred during your ${PHASE_NAME[top[0]].toLowerCase()} phase.`
    }
  }
  return { values, max, note }
}

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}
