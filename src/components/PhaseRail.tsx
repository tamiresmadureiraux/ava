import type { Phase } from "../cycle"

const PHASES: { id: Phase; label: string }[] = [
  { id: "period", label: "Menstrual" },
  { id: "follicular", label: "Folicular" },
  { id: "ovulation", label: "Ovulatória" },
  { id: "luteal", label: "Lútea" },
]

const FOCUS: Record<Phase, { title: string; text: string }[]> = {
  period: [
    { title: "Força", text: "Intensidade menor" },
    { title: "Progressão", text: "Carga moderada" },
    { title: "Recuperação", text: "Respeite o limite" },
  ],
  follicular: [
    { title: "Força", text: "Mais carga" },
    { title: "Progressão", text: "Suba o peso" },
    { title: "Recuperação", text: "Boa recuperação" },
  ],
  ovulation: [
    { title: "Força", text: "Performance alta" },
    { title: "Progressão", text: "Aqueça antes" },
    { title: "Recuperação", text: "Cuidado com os joelhos" },
  ],
  luteal: [
    { title: "Força", text: "Intensidade menor" },
    { title: "Progressão", text: "Reduza a carga" },
    { title: "Recuperação", text: "Descanse se precisar" },
  ],
}

export function PhaseRail({ phase }: { phase: Phase }) {
  return (
    <ol className="phase-rail" aria-label="Fase do ciclo">
      {PHASES.map((item) => (
        <li key={item.id} className={item.id === phase ? "on" : ""} data-phase={item.id}>
          <i />
          <span>{item.label}</span>
        </li>
      ))}
    </ol>
  )
}

export function FocusRow({ phase }: { phase: Phase }) {
  return (
    <section className="focus">
      <h2>Foco de hoje</h2>
      <div>
        {FOCUS[phase].map((item) => (
          <article key={item.title}>
            <strong>{item.title}</strong>
            <span>{item.text}</span>
          </article>
        ))}
      </div>
    </section>
  )
}
