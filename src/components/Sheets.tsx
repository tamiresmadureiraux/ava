import { useEffect, useRef, useState } from "react"
import { useApp } from "../context"
import { monthNoun, reviewStatus } from "../dates"
import { formatInput, parseNum } from "../format"
import { latestWeight } from "../logic"
import { WORKOUTS } from "../program"
import { uid } from "../store"
import type { ExerciseKind, RestClass, WorkoutId } from "../types"

const KINDS: { id: ExerciseKind; label: string }[] = [
  { id: "strength", label: "Força" },
  { id: "cardio", label: "Cardio" },
  { id: "core", label: "Core" },
  { id: "swim", label: "Natação" },
]

export function IntroSheet() {
  const { markIntroSeen } = useApp()
  return (
    <div className="backdrop" onClick={markIntroSeen}>
      <div
        className="sheet intro"
        role="dialog"
        aria-modal="true"
        aria-labelledby="intro-title"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="eyebrow">Outubro 2026</p>
        <h2 id="intro-title">Seu treino, dia a dia</h2>
        <p>
          Cada dia abre o treino certo. Segunda e quinta são pernas, terça e sexta são superiores,
          quarta e sábado são natação. Domingo é descanso.
        </p>
        <p>Você anota repetições e carga. No último dia do mês, valida o peso para fechar o ciclo.</p>
        <button type="button" className="primary" onClick={markIntroSeen}>
          Ver o treino de hoje
        </button>
      </div>
    </div>
  )
}

export function ReviewSheet({ blocking, onClose }: { blocking: boolean; onClose: () => void }) {
  const { state, today, saveReview } = useApp()
  const pending = reviewStatus(today, state.reviews)
  const latest = latestWeight(state.weights)
  const [kg, setKg] = useState(latest ? formatInput(latest.kg) : "")
  const [note, setNote] = useState("")
  const [error, setError] = useState("")
  const field = useRef<HTMLInputElement>(null)

  useEffect(() => {
    field.current?.focus()
  }, [])

  if (!pending) return null
  const noun = monthNoun(pending.month)

  function submit() {
    const value = parseNum(kg)
    if (value == null || value < 25 || value > 300) {
      setError("Informe um peso entre 25 e 300 kg.")
      return
    }
    saveReview(Math.round(value * 10) / 10, note.trim())
  }

  return (
    <div className="backdrop" onClick={blocking ? undefined : onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-title"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="eyebrow">{blocking ? "Ciclo em aberto" : "Último dia do ciclo"}</p>
        <h2 id="review-title">{blocking ? `Feche ${noun}` : "Valide seu peso"}</h2>
        <p>
          {blocking
            ? `Antes de seguir, confirme seu peso. Esse número fica como a marca oficial de ${noun}.`
            : `${pending.month.label.split(" ")[0]} fecha hoje. Anote o peso para concluir o mês.`}
        </p>
        <label className="metric single">
          <span>Peso (kg)</span>
          <input
            ref={field}
            inputMode="decimal"
            autoComplete="off"
            placeholder="64,5"
            value={kg}
            onChange={(event) => {
              setKg(event.target.value)
              setError("")
            }}
          />
        </label>
        <label className="metric text single">
          <span>Nota, se quiser</span>
          <input
            value={note}
            maxLength={280}
            placeholder="Como foi o mês"
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="button" className="primary" onClick={submit}>
          Validar e fechar o mês
        </button>
        {blocking ? null : (
          <button type="button" className="quiet" onClick={onClose}>
            Agora não
          </button>
        )}
      </div>
    </div>
  )
}

export function AddSheet({ workoutId, onClose }: { workoutId: WorkoutId; onClose: () => void }) {
  const { addExercise } = useApp()
  const workout = WORKOUTS[workoutId]
  const [name, setName] = useState("")
  const [prescription, setPrescription] = useState("")
  const [kind, setKind] = useState<ExerciseKind>(workout.exercises.every((item) => item.kind === "swim") ? "swim" : "strength")
  const [rest, setRest] = useState<RestClass>("small")
  const timed = kind === "strength" || kind === "core"

  function submit() {
    const clean = name.trim().replace(/\s+/g, " ")
    if (!clean) return
    const id = uid()
    addExercise(workoutId, {
      id,
      name: clean,
      prescription: prescription.trim(),
      kind,
      rest: timed ? (rest === "none" ? "small" : rest) : "none",
      custom: true,
    })
    onClose()
    window.setTimeout(() => {
      document.getElementById(`ex-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 60)
  }

  return (
    <div className="backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-title"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="eyebrow">{workout.name}</p>
        <h2 id="add-title">Novo exercício</h2>
        <p>Ele entra em todos os dias de {workout.name}.</p>
        <label className="metric text single">
          <span>Nome</span>
          <input
            autoFocus
            value={name}
            maxLength={80}
            placeholder="Ex. Prancha"
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="metric text single">
          <span>Prescrição</span>
          <input
            value={prescription}
            maxLength={40}
            placeholder="3 × 10–12"
            onChange={(event) => setPrescription(event.target.value)}
          />
        </label>
        <div className="segments" role="group" aria-label="Tipo">
          {KINDS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={kind === item.id}
              onClick={() => setKind(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        {timed ? (
          <div className="segments" role="group" aria-label="Descanso">
            <button type="button" aria-pressed={rest === "big"} onClick={() => setRest("big")}>
              Composto · 90–120s
            </button>
            <button type="button" aria-pressed={rest !== "big"} onClick={() => setRest("small")}>
              Isolado · 60–90s
            </button>
          </div>
        ) : null}
        <button type="button" className="primary" disabled={!name.trim()} onClick={submit}>
          Adicionar ao treino
        </button>
        <button type="button" className="quiet" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
