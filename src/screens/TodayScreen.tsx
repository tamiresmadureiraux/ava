import { useEffect, useRef, useState, type CSSProperties } from "react"
import { RestTimer } from "../components/RestTimer"
import { adviceFor, cycleOn } from "../cycle"
import { useApp } from "../context"
import { formatLong, formatShort, isBeforeProgram, PROGRAM_START, reviewStatus, workoutIdFor } from "../dates"
import { formatDelta, formatEntryLine, formatInput, metricUnit, metricValue } from "../format"
import { filledCount, groupSession, lastPerformance, latestWeight, sessionExercises, upcoming } from "../logic"
import { isWorkoutId } from "../plans"
import { WEEK_ORDER, WORKOUT_SHORT, WORKOUTS } from "../program"
import type { DayPlan, Entry, Exercise, ExerciseKind, WorkoutId } from "../types"

const FIELDS: Record<ExerciseKind, { primary: string; secondary: string; primaryText: boolean; secondaryText: boolean; primaryHint: string; secondaryHint: string }> = {
  strength: { primary: "Repetições", secondary: "Carga (kg)", primaryText: false, secondaryText: false, primaryHint: "10", secondaryHint: "20" },
  core: { primary: "Repetições", secondary: "Carga (kg)", primaryText: false, secondaryText: false, primaryHint: "12", secondaryHint: "0" },
  cardio: { primary: "Minutos", secondary: "Notas", primaryText: false, secondaryText: true, primaryHint: "10", secondaryHint: "esteira, bike…" },
  swim: { primary: "Voltas", secondary: "Tempo", primaryText: false, secondaryText: true, primaryHint: "20", secondaryHint: "35:00" },
}

function isSwimDay(id: WorkoutId | null): boolean {
  return id === "natacao-a" || id === "natacao-b"
}

export function TodayScreen() {
  const { state, today, selected, setSelected, openAdd, openReview, setDayPlan } = useApp()
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [restFor, setRestFor] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ src: string; name: string } | null>(null)
  const [picking, setPicking] = useState(false)
  const offered = useRef(new Set<string>())
  const { removeExercise } = useApp()
  const before = isBeforeProgram(selected)
  const choice = state.schedule[selected]
  const loggedId = state.logs[selected]?.workoutId
  const workoutId = isWorkoutId(choice) ? choice : choice == null && isWorkoutId(loggedId) ? loggedId : null
  const needsPick = picking || (choice == null && loggedId == null)
  const workout = workoutId ? WORKOUTS[workoutId] : null
  const suggested = workoutIdFor(selected)
  const pendingToday = selected === today

  useEffect(() => {
    setPicking(false)
  }, [selected])

  useEffect(() => {
    if (!restFor && !preview) return
    document.body.classList.add("locked")
    return () => document.body.classList.remove("locked")
  }, [restFor, preview])

  if (before) {
    return (
      <main className="screen">
        <header className="hero rest">
          <p className="eyebrow">Antes do ciclo</p>
          <h1>O treino começa em 6 de outubro</h1>
          <p className="lede">A partir de terça, cada dia mostra o plano e você escolhe o que vai fazer.</p>
          <button type="button" className="primary" onClick={() => setSelected(PROGRAM_START)}>
            Ir para o primeiro dia
          </button>
        </header>
      </main>
    )
  }

  if (needsPick) {
    return (
      <ChooseDay
        onPick={(plan) => {
          setPicking(false)
          setDayPlan(selected, plan)
        }}
      />
    )
  }

  if (!workout || !workoutId) {
    const next = upcoming(selected, state.schedule)
    const nextWorkout = next ? WORKOUTS[next.workoutId] : null
    const suggestedWorkout = suggested ? WORKOUTS[suggested] : null
    return (
      <main className="screen">
        <header className="hero rest">
          <div className="hero-top">
            <p className="eyebrow">{formatLong(selected)}</p>
            {selected === today ? null : (
              <button type="button" className="text-btn" onClick={() => setSelected(today)}>
                Hoje
              </button>
            )}
          </div>
          <h1>Descanso</h1>
          <p className="lede">
            {suggestedWorkout
              ? `Você escolheu descansar. O plano deste dia era ${WORKOUT_SHORT[suggestedWorkout.id]}.`
              : "Você escolheu descansar. O plano deste dia também é descanso."}
          </p>
          <button type="button" className="ghost" onClick={() => setPicking(true)}>
            Escolher um treino
          </button>
        </header>
        {next && nextWorkout ? (
          <button
            type="button"
            className="next-card"
            style={{ "--tone": nextWorkout.tone } as CSSProperties}
            onClick={() => setSelected(next.date)}
          >
            <span>Próximo treino</span>
            <strong>{nextWorkout.name}</strong>
            <em>{formatLong(next.date)}</em>
          </button>
        ) : null}
      </main>
    )
  }

  const exercises = sessionExercises(workoutId, state.extras)
  const log = state.logs[selected]
  const count = filledCount(exercises, log?.entries)
  const groups = groupSession(exercises)
  const resting = exercises.find((item) => item.id === restFor)
  const nextExercise = resting ? exercises[exercises.findIndex((item) => item.id === resting.id) + 1] : undefined
  let index = 0

  function openRest(id: string, automatic: boolean) {
    if (automatic && offered.current.has(id)) return
    const exercise = exercises.find((item) => item.id === id)
    if (!exercise || exercise.rest === "none") return
    offered.current.add(id)
    setRestFor(id)
  }

  return (
    <main className="screen">
      <ReviewBanner show={pendingToday} onOpen={openReview} />
      <header className="hero" style={{ "--tone": workout.tone } as CSSProperties}>
        <span className="watermark" aria-hidden="true">
          {workout.mark}
        </span>
        <div className="hero-top">
          <p className="eyebrow">{formatLong(selected)}</p>
          {selected === today ? (
            <WeightChip />
          ) : (
            <button type="button" className="text-btn" onClick={() => setSelected(today)}>
              Hoje
            </button>
          )}
        </div>
        <h1>{workout.name}</h1>
        <p className="lede">{workout.summary}</p>
        <p className="plan-note">
          {suggested && suggested !== workoutId
            ? `Plano do dia: ${WORKOUT_SHORT[suggested]}.`
            : suggested
              ? "Este é o plano do dia."
              : "O plano deste dia era descanso."}
        </p>
        <button type="button" className="text-btn plan-switch" onClick={() => setPicking(true)}>
          Trocar treino
        </button>
        <div className="progress-row">
          <div className="bar" aria-hidden="true">
            <span style={{ width: `${exercises.length ? (count / exercises.length) * 100 : 0}%` }} />
          </div>
          <p aria-live="polite">
            {log?.done ? "Concluído" : `${count} de ${exercises.length}`}
          </p>
        </div>
      </header>

      {groups.map((group) => (
        <section key={group.title}>
          <h2 className="group-label">{group.title}</h2>
          {group.items.map((exercise) => {
            index += 1
            return (
              <ExerciseCard
                key={exercise.id}
                index={index}
                date={selected}
                exercise={exercise}
                entry={log?.entries[exercise.id]}
                tone={workout.tone}
                confirmId={confirmId}
                onConfirm={setConfirmId}
                onRemove={() => removeExercise(workoutId, exercise.id)}
                onRest={() => openRest(exercise.id, false)}
                onFilled={() => openRest(exercise.id, true)}
                onPreview={
                  exercise.image
                    ? () => setPreview({ src: exercise.image ?? "", name: exercise.name })
                    : undefined
                }
              />
            )
          })}
        </section>
      ))}

      <button type="button" className="add-card" onClick={openAdd}>
        Adicionar exercício
      </button>
      <FinishBar workoutId={workoutId} count={count} done={Boolean(log?.done)} tone={workout.tone} />
      {resting && resting.rest !== "none" ? (
        <RestTimer
          rest={resting.rest}
          nextName={nextExercise?.name ?? null}
          onClose={() => {
            const target = nextExercise?.id
            setRestFor(null)
            if (target) {
              window.setTimeout(() => {
                document.getElementById(`ex-${target}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
              }, 40)
            }
          }}
        />
      ) : null}
      {preview ? (
        <div className="backdrop" onClick={() => setPreview(null)}>
          <div
            className="sheet photo-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="photo-title"
            onClick={(event) => event.stopPropagation()}
          >
            <img src={preview.src} alt={preview.name} />
            <h2 id="photo-title">{preview.name}</h2>
            <button type="button" className="primary" onClick={() => setPreview(null)}>
              Fechar
            </button>
          </div>
        </div>
      ) : null}
    </main>
  )
}

function ChooseDay({ onPick }: { onPick: (plan: DayPlan) => void }) {
  const { state, today, selected, setSelected, openReview } = useApp()
  const suggested = workoutIdFor(selected)
  const suggestedWorkout = suggested ? WORKOUTS[suggested] : null
  const spot = state.cycle ? cycleOn(selected, state.cycle) : null
  const advice = spot ? adviceFor(spot, state.cycleDays[selected]) : null
  const swimOff = Boolean(suggested && isSwimDay(suggested) && advice?.swim === "skip")

  return (
    <main className="screen">
      <ReviewBanner show={selected === today} onOpen={openReview} />
      <header className="hero rest">
        <div className="hero-top">
          <p className="eyebrow">{formatLong(selected)}</p>
          {selected === today ? (
            <WeightChip />
          ) : (
            <button type="button" className="text-btn" onClick={() => setSelected(today)}>
              Hoje
            </button>
          )}
        </div>
        <p className="eyebrow">Plano do dia</p>
        <h1>{suggestedWorkout ? WORKOUT_SHORT[suggestedWorkout.id] : "Descanso"}</h1>
        <p className="lede">
          {swimOff
            ? "O plano é natação, mas na menstruação a piscina fica de fora. Escolha outro treino ou descanse."
            : suggestedWorkout
              ? "Escolha este treino para anotar, ou troque por outro."
              : "O plano de hoje é descanso. Você pode escolher um treino mesmo assim."}
        </p>
      </header>
      {suggested && !swimOff ? (
        <button type="button" className="primary" onClick={() => onPick(suggested)}>
          Fazer o plano de hoje
        </button>
      ) : null}
      <div className="plan-list">
        {WEEK_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            className="plan-option"
            style={{ "--tone": WORKOUTS[id].tone } as CSSProperties}
            onClick={() => onPick(id)}
          >
            <i />
            <span>
              <strong>
                {WORKOUT_SHORT[id]}
                {id === suggested ? <span className="tag">Plano do dia</span> : null}
              </strong>
              <em>{swimOff && isSwimDay(id) ? "Melhor não nadar hoje" : WORKOUTS[id].summary}</em>
            </span>
          </button>
        ))}
        <button type="button" className="plan-option" onClick={() => onPick("rest")}>
          <i />
          <span>
            <strong>
              Descanso
              {suggested ? null : <span className="tag">Plano do dia</span>}
            </strong>
            <em>Sem treino neste dia</em>
          </span>
        </button>
      </div>
    </main>
  )
}

function WeightChip() {
  const { state, setTab } = useApp()
  const latest = latestWeight(state.weights)
  return (
    <button type="button" className="weight-chip" onClick={() => setTab("progress")}>
      {latest ? `${formatInput(latest.kg).replace(".", ",")} kg` : "Peso"}
    </button>
  )
}

function ReviewBanner({ show, onOpen }: { show: boolean; onOpen: () => void }) {
  const { state, today } = useApp()
  if (!show) return null
  const pending = reviewStatus(today, state.reviews)
  if (!pending || pending.overdue || state.reviews[pending.month.id]) return null
  return (
    <button type="button" className="review-card" onClick={onOpen}>
      <span>Fim de {pending.month.label.split(" ")[0]?.toLowerCase()}</span>
      <strong>Valide seu peso para fechar o mês</strong>
    </button>
  )
}

function FinishBar({
  workoutId,
  count,
  done,
  tone,
}: {
  workoutId: WorkoutId
  count: number
  done: boolean
  tone: string
}) {
  const { selected, setDone } = useApp()
  return (
    <button
      type="button"
      className={done ? "primary saved" : "primary"}
      style={{ "--tone": tone } as CSSProperties}
      disabled={!done && count === 0}
      onClick={() => setDone(selected, workoutId, !done)}
    >
      {done ? "Treino concluído" : "Concluir treino"}
    </button>
  )
}

function ExerciseCard({
  index,
  date,
  exercise,
  entry,
  tone,
  confirmId,
  onConfirm,
  onRemove,
  onRest,
  onFilled,
  onPreview,
}: {
  index: number
  date: string
  exercise: Exercise
  entry: Entry | undefined
  tone: string
  confirmId: string | null
  onConfirm: (id: string | null) => void
  onRemove: () => void
  onRest: () => void
  onFilled: () => void
  onPreview?: () => void
}) {
  const { state, updateEntry } = useApp()
  const fields = FIELDS[exercise.kind]
  const last = lastPerformance(state, exercise, date)
  const current = entry ?? { primary: "", secondary: "", name: exercise.name, kind: exercise.kind, prescription: exercise.prescription }
  const filled = Boolean(current.primary.trim() || current.secondary.trim())
  const unit = metricUnit(exercise.kind)
  const currentMetric = metricValue(exercise.kind, current)
  const lastMetric = last ? metricValue(exercise.kind, last.entry) : null
  const delta = currentMetric != null && lastMetric != null ? currentMetric - lastMetric : null
  const loadKind = exercise.kind === "strength" || exercise.kind === "core"

  function patch(next: Partial<Entry>) {
    updateEntry(date, exercise, next)
  }

  function repeat() {
    if (!last) return
    patch({ primary: last.entry.primary, secondary: last.entry.secondary })
  }

  function bump(amount: number) {
    if (lastMetric == null) return
    patch({
      secondary: formatInput(lastMetric + amount),
      primary: current.primary.trim() ? current.primary : (last?.entry.primary ?? ""),
    })
  }

  return (
    <article
      id={`ex-${exercise.id}`}
      className={filled ? "card filled" : "card"}
      style={{ "--tone": tone } as CSSProperties}
    >
      <div className="card-top">
        <span className="idx">{String(index).padStart(2, "0")}</span>
        <div>
          <h3>
            {exercise.name}
            {exercise.custom ? <em> seu</em> : null}
          </h3>
          {exercise.prescription ? <span className="pill">{exercise.prescription}</span> : null}
        </div>
        {exercise.image && onPreview ? (
          <button type="button" className="thumb" onClick={onPreview} aria-label={`Foto de ${exercise.name}`}>
            <img src={exercise.image} alt="" />
          </button>
        ) : null}
      </div>
      <p className="last">
        {last
          ? `Última vez · ${formatShort(last.date)} · ${formatEntryLine(exercise.kind, last.entry)}`
          : "Primeira vez neste exercício"}
      </p>
      <div className={fields.secondaryText ? "metrics notes" : "metrics"}>
        <label className="metric">
          <span>{fields.primary}</span>
          <input
            inputMode={fields.primaryText ? "text" : "decimal"}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder={fields.primaryHint}
            value={current.primary}
            onChange={(event) => patch({ primary: event.target.value })}
            onBlur={(event) => {
              if (event.currentTarget.value.trim() || current.secondary.trim()) onFilled()
            }}
          />
        </label>
        <label className={fields.secondaryText ? "metric text" : "metric"}>
          <span>{fields.secondary}</span>
          <input
            inputMode={fields.secondaryText ? "text" : "decimal"}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder={fields.secondaryHint}
            value={current.secondary}
            onChange={(event) => patch({ secondary: event.target.value })}
            onBlur={(event) => {
              if (current.primary.trim() || event.currentTarget.value.trim()) onFilled()
            }}
          />
        </label>
      </div>
      {delta != null ? (
        <p className={delta > 0 ? "delta up" : delta < 0 ? "delta down" : "delta"}>
          {formatDelta(delta, unit)}
        </p>
      ) : null}
      {last ? (
        <div className="quick">
          <button type="button" onClick={() => { repeat(); onFilled() }}>
            Repetir
          </button>
          {loadKind && lastMetric != null ? (
            <>
              <button type="button" onClick={() => { bump(2.5); onFilled() }}>
                +2,5 kg
              </button>
              <button type="button" onClick={() => { bump(5); onFilled() }}>
                +5 kg
              </button>
            </>
          ) : null}
        </div>
      ) : null}
      {exercise.custom ? (
        confirmId === exercise.id ? (
          <div className="quick">
            <button type="button" onClick={onRemove}>
              Confirmar remoção
            </button>
            <button type="button" onClick={() => onConfirm(null)}>
              Cancelar
            </button>
          </div>
        ) : (
          <button type="button" className="linkish" onClick={() => onConfirm(exercise.id)}>
            Remover exercício
          </button>
        )
      ) : null}
      {exercise.rest !== "none" ? (
        <button type="button" className="rest-btn" onClick={onRest}>
          Descansar
        </button>
      ) : null}
    </article>
  )
}
