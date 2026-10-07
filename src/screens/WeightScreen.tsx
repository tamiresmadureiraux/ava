import { useState, type FormEvent } from "react"
import type { WeightLog } from "../types"
import { useApp } from "../context"
import { formatLong, formatShort, monthsThrough, PROGRAM_START, reviewStatus } from "../dates"
import { formatDelta, formatInput, formatNumber, parseNum } from "../format"
import { latestWeight } from "../logic"

export function WeightScreen() {
  const { state, today, saveWeight, deleteWeight, resetAll, openReview } = useApp()
  const latest = latestWeight(state.weights)
  const previous = [...state.weights].sort((a, b) => a.date.localeCompare(b.date)).filter((item) => !latest || item.date < latest.date).at(-1)
  const delta = latest && previous ? Math.round((latest.kg - previous.kg) * 10) / 10 : null
  const [date, setDate] = useState(today)
  const [kg, setKg] = useState("")
  const [error, setError] = useState("")
  const [confirmReset, setConfirmReset] = useState(false)
  const existing = state.weights.find((item) => item.date === date)
  const months = monthsThrough(today)
  const pending = reviewStatus(today, state.reviews)

  function submit(event: FormEvent) {
    event.preventDefault()
    const value = parseNum(kg)
    if (value == null || value < 25 || value > 300) {
      setError("Informe um peso entre 25 e 300 kg.")
      return
    }
    saveWeight(date, Math.round(value * 10) / 10)
    setKg("")
    setError("")
  }

  return (
    <main className="screen">
      <header className="page-head">
        <p className="eyebrow">Corpo</p>
        <h1>Peso</h1>
        <p className="weight-hero">
          {latest ? (
            <>
              {formatNumber(latest.kg)}
              <small>kg</small>
            </>
          ) : (
            "—"
          )}
        </p>
        <p className="lede">
          {latest && delta != null && previous
            ? `${formatDelta(delta, "kg")} desde ${formatShort(previous.date)}.`
            : latest
              ? `Última pesagem em ${formatShort(latest.date)}.`
              : "A primeira pesagem ancora o mês."}
        </p>
        <WeightChart weights={state.weights} />
      </header>

      {pending ? (
        <button type="button" className="review-card" onClick={openReview}>
          <span>{pending.overdue ? "Pendente" : "Hoje"}</span>
          <strong>
            {pending.overdue
              ? `Feche ${pending.month.label.split(" ")[0]?.toLowerCase()} com seu peso`
              : "Valide o peso para fechar o mês"}
          </strong>
        </button>
      ) : null}

      <form className="weight-form" onSubmit={submit}>
        <label className="metric text">
          <span>Data</span>
          <input type="date" min={PROGRAM_START} max={today} value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label className="metric">
          <span>Peso (kg)</span>
          <input
            inputMode="decimal"
            autoComplete="off"
            placeholder={existing ? formatInput(existing.kg) : "64,5"}
            value={kg}
            onChange={(event) => {
              setKg(event.target.value)
              setError("")
            }}
          />
        </label>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="primary">
          {existing ? "Atualizar pesagem" : "Registrar pesagem"}
        </button>
      </form>

      <h2 className="group-label">Ciclos</h2>
      <ul className="plain-list">
        {months.map((month) => {
          const review = state.reviews[month.id]
          return (
            <li key={month.id}>
              <div>
                <strong>{month.label}</strong>
                <span>
                  {review
                    ? `Validado · ${formatNumber(review.kg)} kg · ${formatShort(review.date)}`
                    : today > month.end
                      ? "Validação pendente"
                      : `Validação em ${formatShort(month.end)}`}
                </span>
                {review?.note ? <em>{review.note}</em> : null}
              </div>
            </li>
          )
        })}
      </ul>

      <h2 className="group-label">Pesagens</h2>
      {state.weights.length === 0 ? (
        <p className="hint">Nenhuma pesagem ainda.</p>
      ) : (
        <ul className="plain-list">
          {[...state.weights]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((item) => {
              const official = Object.values(state.reviews).some((review) => review.date === item.date)
              return (
                <li key={item.id}>
                  <div>
                    <strong>{formatNumber(item.kg)} kg</strong>
                    <span>
                      {formatLong(item.date)}
                      {official ? " · validação do mês" : ""}
                    </span>
                  </div>
                  <button type="button" className="linkish" onClick={() => deleteWeight(item.id)}>
                    Apagar
                  </button>
                </li>
              )
            })}
        </ul>
      )}

      <div className="danger-zone">
        {confirmReset ? (
          <div className="quick">
            <button type="button" className="linkish danger" onClick={resetAll}>
              Confirmar exclusão
            </button>
            <button type="button" className="linkish" onClick={() => setConfirmReset(false)}>
              Cancelar
            </button>
          </div>
        ) : (
          <button type="button" className="linkish" onClick={() => setConfirmReset(true)}>
            Apagar dados deste aparelho
          </button>
        )}
      </div>
    </main>
  )
}

function WeightChart({ weights }: { weights: WeightLog[] }) {
  const points = [...weights].sort((a, b) => a.date.localeCompare(b.date)).slice(-8)
  if (points.length < 2) return null
  const width = 320
  const height = 72
  const min = Math.min(...points.map((point) => point.kg))
  const max = Math.max(...points.map((point) => point.kg))
  const span = max - min || 1
  const line = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width
      const y = height - ((point.kg - min) / span) * (height - 8) - 4
      return `${x},${y}`
    })
    .join(" ")
  return (
    <svg className="weight-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Evolução do peso">
      <polyline points={line} />
    </svg>
  )
}
