import { useEffect, useState } from "react"
import { REST_OPTIONS, defaultRest } from "../program"
import type { RestClass } from "../types"

export function RestTimer({
  rest,
  nextName,
  onClose,
}: {
  rest: Exclude<RestClass, "none">
  nextName: string | null
  onClose: () => void
}) {
  const options = REST_OPTIONS[rest]
  const max = options[options.length - 1] ?? defaultRest(rest)
  const start = defaultRest(rest)
  const [seconds, setSeconds] = useState(start)
  const [chosen, setChosen] = useState(start)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (done) return
    const id = window.setInterval(() => {
      setSeconds((current) => (current <= 1 ? 0 : current - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [done])

  useEffect(() => {
    if (seconds === 0) setDone(true)
  }, [seconds])

  function choose(value: number) {
    setChosen(value)
    setSeconds(value)
    setDone(false)
  }

  function addFifteen() {
    setSeconds((current) => (current + 15 <= max ? current + 15 : current))
    setDone(false)
  }

  const canAdd = !done && seconds + 15 <= max
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`

  return (
    <div className="backdrop" onClick={onClose}>
      <div
        className="sheet rest-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rest-title"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="eyebrow">{rest === "big" ? "Composto · 90–120 s" : "Isolado · 60–90 s"}</p>
        <h2 id="rest-title">{done ? "Descanso concluído" : "Descanso"}</h2>
        <p className={done ? "clock done" : "clock"} aria-live="polite">
          {done ? "Pronto" : clock}
        </p>
        <p className="next-line">{nextName ? `Próximo: ${nextName}` : "Último exercício do dia"}</p>
        <div className="rest-options" role="group" aria-label="Duração">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={chosen === option}
              aria-label={`${option} segundos`}
              onClick={() => choose(option)}
            >
              {formatOption(option)}
            </button>
          ))}
        </div>
        <div className="rest-actions">
          <button type="button" className="quiet inline" onClick={onClose}>
            {done ? "Continuar" : "Pular"}
          </button>
          <button type="button" className="primary inline" disabled={!canAdd} onClick={addFifteen}>
            +15 s
          </button>
        </div>
      </div>
    </div>
  )
}

function formatOption(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
}
