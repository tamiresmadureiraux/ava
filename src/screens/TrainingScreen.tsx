import { useEffect, useState, type CSSProperties } from "react"
import { PageMenu } from "../components/PageMenu"
import { PlayButton, SessionFacts } from "../components/SessionFacts"
import { adviceFor, cycleOn } from "../cycle"
import { useApp } from "../context"
import { formatShort, isBeforeProgram, PROGRAM_START, reviewStatus, workoutIdFor } from "../dates"
import { parseNum, toKg } from "../format"
import { filledCount, lastPerformance, sessionExercises, sessionOrder } from "../logic"
import { exercisesFromPlan, isPlanRef, isWorkoutId, planMinutes, planType } from "../plans"
import { WEEK_ORDER, WORKOUTS } from "../program"
import {
  PHASE_NAME,
  WORKOUT_TITLE,
  durationMinutes,
  formatSigned,
  intensityLabel,
  trainingPhaseLine,
} from "../present"
import type { DayPlan, Entry, Exercise, SessionRef, WeightUnit, WorkoutId } from "../types"

export function TrainingScreen() {
  const { state, today, selected, setSelected, setTab, setDayPlan, openAdd, openReview, setClock } = useApp()
  const [picking, setPicking] = useState(false)
  const [menu, setMenu] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [started, setStarted] = useState(false)
  const [preview, setPreview] = useState<{ src: string; name: string } | null>(null)

  const before = isBeforeProgram(selected)
  const choice = state.schedule[selected]
  const loggedId = state.logs[selected]?.workoutId
  const plan = choice && isPlanRef(choice) ? state.plans[choice.slice(5)] : undefined
  const workoutId: SessionRef | null = plan && isPlanRef(choice)
    ? choice
    : isWorkoutId(choice)
      ? choice
      : choice == null && isWorkoutId(loggedId)
        ? loggedId
        : null
  const needsPick = picking || (choice == null && !isWorkoutId(loggedId))

  useEffect(() => {
    setPicking(false)
    setStarted(false)
    setOpenId(null)
    setMenu(false)
  }, [selected])

  useEffect(() => {
    if (!preview) return
    document.body.classList.add("locked")
    return () => document.body.classList.remove("locked")
  }, [preview])

  if (before) {
    return (
      <main className="screen train-screen">
        <TrainHeader onBack={() => setTab("home")} menu={false} onMenu={() => undefined} />
        <h1>Training starts October 6</h1>
        <button type="button" className="primary" onClick={() => setSelected(PROGRAM_START)}>
          Go to the first day
        </button>
      </main>
    )
  }

  if (needsPick) {
    return (
      <ChooseSession
        onBack={() => (picking ? setPicking(false) : setTab("home"))}
        onPick={(plan) => {
          setPicking(false)
          setDayPlan(selected, plan)
        }}
        showReview={selected === today}
        onReview={openReview}
      />
    )
  }

  if (!workoutId) {
    return (
      <main className="screen train-screen">
        <TrainHeader onBack={() => setTab("home")} menu={menu} onMenu={() => setMenu((value) => !value)} onSwap={() => { setMenu(false); setPicking(true) }} />
        <p className="eyebrow">{formatShort(selected)}</p>
        <h1>Recovery</h1>
        <p className="lede">You chose rest for this day.</p>
        <button type="button" className="primary" onClick={() => setPicking(true)}>
          Choose a workout
        </button>
      </main>
    )
  }

  const workout = isWorkoutId(workoutId) ? WORKOUTS[workoutId] : null
  const list = plan ? exercisesFromPlan(plan) : workout ? sessionOrder(sessionExercises(workout.id, state.extras)) : []
  const log = state.logs[selected]
  const counted = list
  const count = filledCount(counted, log?.entries)
  const spot = state.cycle ? cycleOn(selected, state.cycle) : null
  const begun = started || Boolean(log?.done) || count > 0 || Boolean(log?.trainStartedAt)

  function begin() {
    setStarted(true)
    if (!log?.trainStartedAt && !log?.done) setClock(selected, workoutId, { trainStartedAt: Date.now() })
    const first = counted[0]
    if (first) setOpenId(first.id)
  }

  return (
    <main className="screen train-screen">
      {selected === today ? <ReviewNote onOpen={openReview} /> : null}
      <TrainHeader
        onBack={() => setTab("home")}
        menu={menu}
        onMenu={() => setMenu((value) => !value)}
        onSwap={() => {
          setMenu(false)
          setPicking(true)
        }}
        onAdd={() => {
          setMenu(false)
          openAdd()
        }}
      />
      <article className="session-hero">
        <img src="/session-hero.jpg" alt="" />
        <div className="session-hero-shade" />
        <div className="session-hero-copy">
          <p className="eyebrow">Today's Training</p>
          <h1>{plan ? plan.name : workout ? WORKOUT_TITLE[workout.id] : "Training"}</h1>
          <SessionFacts
            minutes={plan ? planMinutes(plan) : durationMinutes(workout!, state.extras)}
            count={counted.length}
            type={plan ? planType(plan) : intensityLabel(workout!.id)}
          />
        </div>
        {begun ? null : <PlayButton label="Start workout" onClick={begin} />}
      </article>
      <SessionWatch date={selected} workoutId={workoutId} />
      {spot ? (
        <>
          <span className="phase-chip">{PHASE_NAME[spot.phase]} phase</span>
          <p className="hint">{trainingPhaseLine(spot.phase, spot.lateLuteal)}</p>
        </>
      ) : null}
      <div className="train-progress">
        <p>
          {count} / {counted.length} exercises
        </p>
        <div className="bar" aria-hidden="true">
          <span style={{ width: `${counted.length ? (count / counted.length) * 100 : 0}%` }} />
        </div>
      </div>

      <ol className="lift-list">
        {list.map((exercise, index) =>
          exercise.kind === "strength" || exercise.kind === "core" ? (
            <LiftCard
              key={exercise.id}
              index={index + 1}
              date={selected}
              exercise={exercise}
              entry={log?.entries[exercise.id]}
              open={openId === exercise.id}
              onToggle={() => setOpenId(openId === exercise.id ? null : exercise.id)}
              onSetDone={() => {
                if (exercise.rest === "none" || log?.restStartedAt || log?.done) return
                setClock(selected, workoutId, { restStartedAt: Date.now() })
              }}
              onPreview={exercise.image ? () => setPreview({ src: exercise.image ?? "", name: exercise.name }) : undefined}
            />
          ) : (
            <CardioRow
              key={exercise.id}
              index={index + 1}
              date={selected}
              exercise={exercise}
              entry={log?.entries[exercise.id]}
              onPreview={exercise.image ? () => setPreview({ src: exercise.image ?? "", name: exercise.name }) : undefined}
            />
          ),
        )}
      </ol>

      {begun ? (
        <div className="train-cta">
          <FinishButton workoutId={workoutId} done={Boolean(log?.done)} />
        </div>
      ) : null}

      {preview ? (
        <div className="backdrop" onClick={() => setPreview(null)}>
          <div className="sheet photo-sheet" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <img src={preview.src} alt={preview.name} />
            <h2>{preview.name}</h2>
            <button type="button" className="primary" onClick={() => setPreview(null)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </main>
  )
}

function TrainHeader({
  onBack,
  menu,
  onMenu,
  onSwap,
  onAdd,
}: {
  onBack: () => void
  menu: boolean
  onMenu: () => void
  onSwap?: () => void
  onAdd?: () => void
}) {
  return (
    <div className="train-top">
      <button type="button" className="icon-btn" aria-label="Back" onClick={onBack}>
        ‹
      </button>
      <strong>Today's Training</strong>
      <div className="head-actions">
        {onSwap || onAdd ? (
          <button type="button" className="icon-btn" aria-label="More" aria-expanded={menu} onClick={onMenu}>
            ···
          </button>
        ) : null}
        <PageMenu />
      </div>
      {menu ? (
        <div className="overflow">
          {onSwap ? (
            <button type="button" onClick={onSwap}>
              Swap workout
            </button>
          ) : null}
          {onAdd ? (
            <button type="button" onClick={onAdd}>
              Add exercise
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function FinishButton({ workoutId, done }: { workoutId: SessionRef; done: boolean }) {
  const { selected, setDone } = useApp()
  return (
    <button type="button" className={done ? "primary saved" : "primary"} onClick={() => setDone(selected, workoutId, true)} disabled={done}>
      {done ? "Workout complete" : "Finish workout"}
    </button>
  )
}

function ReviewNote({ onOpen }: { onOpen: () => void }) {
  const { state, today } = useApp()
  const pending = reviewStatus(today, state.reviews)
  if (!pending || pending.overdue || state.reviews[pending.month.id]) return null
  return (
    <button type="button" className="review-card" onClick={onOpen}>
      <span>Month review</span>
      <strong>Validate your weight to close the month</strong>
    </button>
  )
}

function ChooseSession({
  onBack,
  onPick,
  showReview,
  onReview,
}: {
  onBack: () => void
  onPick: (plan: DayPlan) => void
  showReview: boolean
  onReview: () => void
}) {
  const { state, selected } = useApp()
  const suggested = workoutIdFor(selected)
  const spot = state.cycle ? cycleOn(selected, state.cycle) : null
  const advice = spot ? adviceFor(spot, state.cycleDays[selected]) : null
  const swimOff = Boolean(suggested && (suggested === "natacao-a" || suggested === "natacao-b") && advice?.swim === "skip")
  return (
    <main className="screen train-screen">
      {showReview ? <ReviewNote onOpen={onReview} /> : null}
      <TrainHeader onBack={onBack} menu={false} onMenu={() => undefined} />
      <p className="eyebrow">Choose a session</p>
      <h1>{suggested ? WORKOUT_TITLE[suggested] : "Recovery"}</h1>
      <p className="lede">
        {swimOff
          ? "The plan is a swim. During menstruation the pool can wait. You can still choose it."
          : "Pick what you will log. The plan stays visible if you choose something else."}
      </p>
      {suggested && !swimOff ? (
        <button type="button" className="primary" onClick={() => onPick(suggested)}>
          Use today's plan
        </button>
      ) : null}
      <div className="plan-list">
        {WEEK_ORDER.map((id) => (
          <button key={id} type="button" className="plan-option" style={{ "--tone": WORKOUTS[id].tone } as CSSProperties} onClick={() => onPick(id)}>
            <i />
            <span>
              <strong>
                {WORKOUT_TITLE[id]}
                {id === suggested ? <span className="tag">Today's plan</span> : null}
              </strong>
              <em>{swimOff && (id === "natacao-a" || id === "natacao-b") ? "Swimming not recommended" : WORKOUTS[id].summary}</em>
            </span>
          </button>
        ))}
        <button type="button" className="plan-option" onClick={() => onPick("rest")}>
          <i />
          <span>
            <strong>Recovery</strong>
            <em>Rest day</em>
          </span>
        </button>
      </div>
    </main>
  )
}

function LiftCard({
  index,
  date,
  exercise,
  entry,
  open,
  onToggle,
  onSetDone,
  onPreview,
}: {
  index: number
  date: string
  exercise: Exercise
  entry: Entry | undefined
  open: boolean
  onToggle: () => void
  onSetDone: () => void
  onPreview?: () => void
}) {
  const { state, updateEntry, removeExercise } = useApp()
  const choice = state.schedule[date]
  const workoutId = choice && choice !== "rest" ? choice : state.logs[date]?.workoutId
  const last = lastPerformance(state, exercise, date)
  const [unit, setUnit] = useState<WeightUnit>(entry?.unit === "lb" ? "lb" : "kg")
  const weight = entry?.secondary ?? ""
  const reps = entry?.primary ?? ""
  const todayValue = parseNum(weight)
  const lastValue = last ? parseNum(last.entry.secondary) : null
  const lastUnit: WeightUnit = last?.entry.unit === "lb" ? "lb" : "kg"
  const todayKg = todayValue == null ? null : toKg(todayValue, unit)
  const lastKg = lastValue == null ? null : toKg(lastValue, lastUnit)
  const deltaKg = todayKg != null && lastKg != null ? todayKg - lastKg : null
  const delta = deltaKg == null ? null : unit === "lb" ? deltaKg / 0.45359237 : deltaKg

  function save(next: { weight: string; reps: string; unit: WeightUnit }) {
    const was = Boolean(weight.trim() && reps.trim())
    const now = Boolean(next.weight.trim() && next.reps.trim())
    updateEntry(date, exercise, { secondary: next.weight, primary: next.reps, unit: next.unit })
    if (!was && now) onSetDone()
  }

  return (
    <li id={`lift-${exercise.id}`} className={open ? "lift open" : "lift"}>
      <div className="lift-head">
        <button type="button" className="lift-main" onClick={onToggle} aria-expanded={open}>
          <span>{String(index).padStart(2, "0")}</span>
          <div>
            <strong>{exercise.name}</strong>
            <em>{exercise.prescription}</em>
            <small>
              {last ? `Last: ${lastValue ?? last.entry.secondary} ${lastUnit} × ${last.entry.primary || "—"}` : "No previous log"}
              {todayValue != null ? ` · Today ${todayValue} ${unit}` : ""}
              {reps.trim() ? ` × ${reps.trim()}` : ""}
            </small>
          </div>
          {delta != null ? <b className={delta > 0 ? "up" : ""}>{formatSigned(delta, unit)}</b> : null}
        </button>
        {onPreview ? (
          <button type="button" className="thumb" onClick={onPreview} aria-label={`Photo of ${exercise.name}`}>
            <img src={exercise.image} alt="" />
          </button>
        ) : null}
      </div>
      {open ? (
        <div className="sets">
          <div className="set-head">
            <span>Weight</span>
            <span>Reps</span>
          </div>
          <div className="set-row">
            <div className="weight-field">
              <input
                inputMode="decimal"
                aria-label="Weight"
                placeholder="—"
                value={weight}
                onChange={(event) => save({ weight: event.target.value, reps, unit })}
              />
              <div className="unit-toggle" role="group" aria-label="Weight unit">
                <button
                  type="button"
                  aria-pressed={unit === "kg"}
                  onClick={() => {
                    setUnit("kg")
                    if (weight.trim() || reps.trim()) save({ weight, reps, unit: "kg" })
                  }}
                >
                  kg
                </button>
                <button
                  type="button"
                  aria-pressed={unit === "lb"}
                  onClick={() => {
                    setUnit("lb")
                    if (weight.trim() || reps.trim()) save({ weight, reps, unit: "lb" })
                  }}
                >
                  lb
                </button>
              </div>
            </div>
            <input
              inputMode="decimal"
              aria-label="Reps"
              placeholder="—"
              value={reps}
              onChange={(event) => save({ weight, reps: event.target.value, unit })}
            />
          </div>
          {exercise.custom && workoutId ? (
            <button type="button" className="text-link" onClick={() => removeExercise(workoutId, exercise.id)}>
              Remove exercise
            </button>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}

function SessionWatch({ date, workoutId }: { date: string; workoutId: SessionRef }) {
  const { state, setClock } = useApp()
  const log = state.logs[date]
  const running = Boolean(log?.trainStartedAt || log?.restStartedAt)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [running])

  const training = log?.trainStartedAt ? Math.max(0, Math.floor((now - log.trainStartedAt) / 1000)) : (log?.trainSeconds ?? 0)
  const resting = Boolean(log?.restStartedAt)
  const rest = resting && log?.restStartedAt ? Math.max(0, Math.floor((now - log.restStartedAt) / 1000)) : (log?.restSeconds ?? 0)

  function stopRest() {
    if (!log?.restStartedAt) return
    setClock(date, workoutId, { restSeconds: Math.max(0, Math.floor((Date.now() - log.restStartedAt) / 1000)), restStartedAt: null })
  }

  return (
    <section className="watch" aria-label="Session watch">
      <div>
        <p>Training</p>
        <strong>{formatClock(training)}</strong>
      </div>
      <div>
        <p>{resting ? "Rest" : "Last rest"}</p>
        <strong>{formatClock(rest)}</strong>
      </div>
      <button
        type="button"
        className="quiet"
        disabled={!log?.trainStartedAt || Boolean(log?.done)}
        onClick={() => (resting ? stopRest() : setClock(date, workoutId, { restStartedAt: Date.now() }))}
      >
        {resting ? "Stop rest" : "Start rest"}
      </button>
    </section>
  )
}

function formatClock(total: number): string {
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

function CardioRow({
  index,
  date,
  exercise,
  entry,
  onPreview,
}: {
  index: number
  date: string
  exercise: Exercise
  entry: Entry | undefined
  onPreview?: () => void
}) {
  const { updateEntry } = useApp()
  const primary = entry?.primary ?? ""
  const secondary = entry?.secondary ?? ""
  const minutes = exercise.kind === "swim" ? "Laps" : "Minutes"
  const extra = exercise.kind === "cardio" ? "Notes" : "Time"
  return (
    <li className="lift">
      <div className="lift-head">
        <div className="lift-main">
          <span>{String(index).padStart(2, "0")}</span>
          <div>
            <strong>{exercise.name}</strong>
            <em>{exercise.prescription}</em>
          </div>
        </div>
        {onPreview ? (
          <button type="button" className="thumb" onClick={onPreview} aria-label={`Photo of ${exercise.name}`}>
            <img src={exercise.image} alt="" />
          </button>
        ) : null}
      </div>
      <div className="sets">
        <div className="set-head">
          <span>{minutes}</span>
          <span>{extra}</span>
        </div>
        <div className="set-row">
          <input inputMode="decimal" aria-label={minutes} placeholder="—" value={primary} onChange={(event) => updateEntry(date, exercise, { primary: event.target.value })} />
          <input aria-label={extra} placeholder="—" value={secondary} onChange={(event) => updateEntry(date, exercise, { secondary: event.target.value })} />
        </div>
      </div>
    </li>
  )
}
