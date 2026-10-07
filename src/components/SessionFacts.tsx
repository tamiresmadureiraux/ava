export function SessionFacts({ minutes, count, type }: { minutes: number; count: number; type: string }) {
  return (
    <ul className="train-facts on-photo">
      <li>
        <ClockIcon />
        <span>{minutes} min</span>
      </li>
      <li>
        <CountIcon />
        <span>{count}</span>
      </li>
      <li>
        <TypeIcon />
        <span>{type}</span>
      </li>
    </ul>
  )
}

export function PlayButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="play-btn" aria-label={label} onClick={onClick}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 7.2v9.6l8.2-4.8z" />
      </svg>
    </button>
  )
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.5l3 2" />
    </svg>
  )
}

function CountIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 7h11M8 12h11M8 17h11" />
      <path d="M5 7h.01M5 12h.01M5 17h.01" />
    </svg>
  )
}

function TypeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.5 8.5v7M17.5 8.5v7M3.5 10v4M20.5 10v4M6.5 12h11" />
    </svg>
  )
}
