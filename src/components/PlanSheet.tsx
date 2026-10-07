import { useState, type CSSProperties } from "react"
import { useApp } from "../context"
import { formatLong, workoutIdFor } from "../dates"
import { WEEK_ORDER, WORKOUT_SHORT, WORKOUTS } from "../program"
import type { DayPlan } from "../types"

export function PlanSheet({ date, onClose }: { date: string; onClose: () => void }) {
  const { state, setDayPlan } = useApp()
  const weekly = workoutIdFor(date)
  const current = state.schedule[date] ?? weekly ?? "rest"
  const [choice, setChoice] = useState<DayPlan>(current)

  return (
    <div className="backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-title"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="eyebrow">{formatLong(date)}</p>
        <h2 id="plan-title">Novo treino</h2>
        <p>Escolha o treino deste dia. O plano da semana continua nos outros dias.</p>
        <div className="plan-list">
          {WEEK_ORDER.map((id) => (
            <button
              key={id}
              type="button"
              className={choice === id ? "plan-option on" : "plan-option"}
              style={{ "--tone": WORKOUTS[id].tone } as CSSProperties}
              aria-pressed={choice === id}
              onClick={() => setChoice(id)}
            >
              <i />
              <span>
                <strong>
                  {WORKOUT_SHORT[id]}
                  {id === weekly ? <span className="tag">Plano do dia</span> : null}
                </strong>
                <em>{WORKOUTS[id].summary}</em>
              </span>
            </button>
          ))}
          <button
            type="button"
            className={choice === "rest" ? "plan-option on" : "plan-option"}
            aria-pressed={choice === "rest"}
            onClick={() => setChoice("rest")}
          >
            <i />
            <span>
              <strong>
                Descanso
                {weekly ? null : <span className="tag">Plano do dia</span>}
              </strong>
              <em>Sem treino neste dia</em>
            </span>
          </button>
        </div>
        <button type="button" className="primary" onClick={() => setDayPlan(date, choice)}>
          Salvar neste dia
        </button>
        {state.schedule[date] ? (
          <button type="button" className="quiet" onClick={() => setDayPlan(date, null)}>
            Limpar escolha
          </button>
        ) : (
          <button type="button" className="quiet" onClick={onClose}>
            Cancelar
          </button>
        )}
      </div>
    </div>
  )
}
