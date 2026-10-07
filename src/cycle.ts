import { addDays, parseISO } from "./dates"
import type { Cramps, CycleLog, CycleSettings, Flow } from "./types"

export type Phase = "period" | "follicular" | "ovulation" | "luteal"
export type Readiness = "yes" | "easy" | "skip"

export type CycleSpot = {
  day: number
  phase: Phase
  periodLength: number
  cycleLength: number
  nextStart: string
  lateLuteal: boolean
  closed: boolean
}

export type DayAdvice = {
  phaseLabel: string
  dayLabel: string
  summary: string
  gym: Readiness
  swim: Readiness
  gymText: string
  swimText: string
}

const PHASE_LABEL: Record<Phase, string> = {
  period: "Menstruação",
  follicular: "Fase folicular",
  ovulation: "Ovulação",
  luteal: "Fase lútea",
}

export function clampCycle(settings: CycleSettings): CycleSettings {
  const cycle: CycleSettings = {
    lastStart: settings.lastStart,
    cycleLength: Math.min(45, Math.max(21, Math.round(settings.cycleLength))),
    periodLength: Math.min(10, Math.max(2, Math.round(settings.periodLength))),
  }
  if (settings.endedOn && /^\d{4}-\d{2}-\d{2}$/.test(settings.endedOn) && settings.endedOn >= settings.lastStart) {
    cycle.endedOn = settings.endedOn
  }
  return cycle
}

function daysBetween(from: string, to: string): number {
  const ms = parseISO(to).getTime() - parseISO(from).getTime()
  return Math.round(ms / 86_400_000)
}

export function cycleOn(date: string, settings: CycleSettings): CycleSpot | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(settings.lastStart) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const clean = clampCycle(settings)
  if (clean.endedOn && (date < clean.lastStart || date > clean.endedOn)) return null
  const delta = daysBetween(clean.lastStart, date)
  const mod = ((delta % clean.cycleLength) + clean.cycleLength) % clean.cycleLength
  const day = mod + 1
  const ovulation = clean.cycleLength - 14
  let phase: Phase
  if (day <= clean.periodLength) phase = "period"
  else if (day === ovulation || day === ovulation - 1) phase = "ovulation"
  else if (day < ovulation) phase = "follicular"
  else phase = "luteal"
  return {
    day,
    phase,
    periodLength: clean.periodLength,
    cycleLength: clean.cycleLength,
    nextStart: addDays(date, clean.cycleLength - mod),
    lateLuteal: phase === "luteal" && day > clean.cycleLength - 4,
    closed: Boolean(clean.endedOn),
  }
}

export function adviceFor(spot: CycleSpot, log?: CycleLog): DayAdvice {
  const flow: Flow = log?.flow ?? "none"
  const cramps: Cramps = log?.cramps ?? "none"
  let gym: Readiness = "yes"
  let swim: Readiness = "yes"
  let gymText = "Pode fazer os exercícios."
  let swimText = "Pode nadar."
  let summary = "Bom dia para treinar e para a piscina."

  if (spot.phase === "period") {
    gym = "easy"
    gymText = "Energia mais baixa. Prefira um treino leve. Se estiver bem, a força moderada cabe, sem carga alta."
    swim = "skip"
    swimText = "Na menstruação, a natação fica de fora."
    summary = "Fase menstrual: treino leve. A piscina espera o fim do fluxo."
  } else if (spot.phase === "follicular") {
    gymText = "Boa fase para força pesada e para subir carga. A recuperação costuma estar melhor."
    swimText = "Boa fase para nadar e sustentar o ritmo."
    summary = "Fase folicular: momento de treinar mais pesado e nadar."
  } else if (spot.phase === "ovulation") {
    gymText = "A força costuma estar alta. Aqueça bem e cuide dos joelhos antes da carga."
    swimText = "Pode nadar. Comece devagar para aquecer as articulações."
    summary = "Ovulação: boa performance, com aquecimento caprichado."
  } else if (spot.lateLuteal) {
    gym = "easy"
    swim = "easy"
    gymText = "Fadiga e inchaço são comuns agora. Baixe a carga, encurte a sessão ou descanse."
    swimText = "O fôlego pode estar menor. Nade em ritmo leve ou deixe para outro dia."
    summary = "Reta final da fase lútea: reduza a intensidade ou descanse."
  } else {
    gym = "easy"
    swim = "easy"
    gymText = "A disposição e o fôlego podem cair. Reduza um pouco a carga e não force o ritmo."
    swimText = "A natação cabe, mais leve. Se o inchaço apertar, encurte a série."
    summary = "Fase lútea: treine mais leve e descanse se o corpo pedir."
  }

  if (flow === "heavy") {
    gym = "easy"
    swim = "skip"
    gymText = "Fluxo forte. Treino curto e leve, sem carga alta."
    swimText = "Com fluxo forte, melhor não nadar hoje."
    summary = "Fluxo forte: treino leve sim, piscina não."
  } else if (flow === "light" && spot.phase === "period") {
    swim = "easy"
    swimText = "Fluxo leve. A natação só se você estiver confortável."
    summary = "Fluxo leve. O treino fica moderado; a piscina é opcional."
  } else if (flow === "medium" && spot.phase === "period") {
    swim = "skip"
    swimText = "Com fluxo moderado, melhor não nadar hoje."
    summary = "Fluxo moderado: treino leve sim, piscina não."
  }

  if (cramps === "strong") {
    gym = "easy"
    gymText = "Cólica forte. Faça um treino leve e pare se a dor aumentar."
    if (swim !== "skip") {
      swim = "easy"
      swimText = "A natação pode aliviar, se o fluxo permitir. Saia se a dor piorar."
    }
    summary = flow === "heavy" ? "Cólica e fluxo forte: treino leve, sem piscina." : "Cólica forte: treine leve e só nade se o corpo deixar."
  } else if (cramps === "mild" && gym === "yes") {
    gym = "easy"
    gymText = "Cólica leve. Pode treinar, sem forçar a carga."
  }

  return {
    phaseLabel: PHASE_LABEL[spot.phase],
    dayLabel: `Dia ${spot.day}`,
    summary,
    gym,
    swim,
    gymText,
    swimText,
  }
}

export function periodDates(dates: string[], settings: CycleSettings): Set<string> {
  const marks = new Set<string>()
  for (const date of dates) {
    const spot = cycleOn(date, settings)
    if (spot?.phase === "period") marks.add(date)
  }
  return marks
}
