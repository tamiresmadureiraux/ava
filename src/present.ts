import { addDays, parseISO, workoutIdFor } from "./dates"
import { metricValue, parseNum } from "./format"
import { sessionExercises } from "./logic"
import type { Phase as CyclePhase } from "./cycle"
import type { AppState, DayPlan, Entry, Exercise, ExerciseKind, Workout, WorkoutId } from "./types"

export const PHASE_NAME: Record<CyclePhase, string> = {
  period: "Menstrual",
  follicular: "Follicular",
  ovulation: "Ovulatory",
  luteal: "Luteal",
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export function formatEnglish(iso: string): string {
  const date = parseISO(iso)
  return `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`
}

export function formatEnglishShort(iso: string): string {
  const date = parseISO(iso)
  return `${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`
}

export function formatMonthTitle(id: string): string {
  const [year, month] = id.split("-").map(Number)
  return `${MONTHS[(month ?? 1) - 1]} ${year}`
}

export function daysUntil(from: string, to: string): number {
  return Math.round((parseISO(to).getTime() - parseISO(from).getTime()) / 86_400_000)
}

export const WORKOUT_TITLE: Record<WorkoutId, string> = {
  "pernas-a": "Lower Body Strength",
  "superiores-a": "Upper Body Strength",
  "natacao-a": "Swim",
  "pernas-b": "Lower Body Strength",
  "superiores-b": "Upper Body Strength",
  "natacao-b": "Long Swim",
}

export const WORKOUT_CARD: Record<WorkoutId, string> = {
  "pernas-a": "Lower Body",
  "superiores-a": "Upper Body",
  "natacao-a": "Swim",
  "pernas-b": "Lower Body",
  "superiores-b": "Upper Body",
  "natacao-b": "Long Swim",
}

export function intensityLabel(id: WorkoutId): string {
  if (id === "natacao-b") return "Endurance"
  if (id === "natacao-a") return "Steady"
  return "Strength"
}

function minutesIn(prescription: string): number | null {
  const range = prescription.match(/(\d+)\s*[–-]\s*(\d+)\s*min/i)
  if (range) return Math.round((Number(range[1]) + Number(range[2])) / 2)
  const single = prescription.match(/(\d+)\s*min/i)
  if (single) return Number(single[1])
  return null
}

export function durationMinutes(workout: Workout, extras: AppState["extras"]): number {
  const exercises = sessionExercises(workout.id, extras)
  let total = 0
  for (const exercise of exercises) {
    const known = minutesIn(exercise.prescription)
    if (known != null) total += known
    else if (exercise.kind === "strength" || exercise.kind === "core") total += 8
  }
  return Math.max(20, total)
}

export function coverImage(workout: Workout): string | null {
  const strength = workout.exercises.find((exercise) => exercise.kind === "strength" && exercise.image)
  return strength?.image ?? workout.exercises.find((exercise) => exercise.image)?.image ?? null
}

export function isStrengthId(id: WorkoutId | null | undefined): boolean {
  return id === "pernas-a" || id === "pernas-b" || id === "superiores-a" || id === "superiores-b"
}

export function plannedId(date: string): WorkoutId | null {
  return workoutIdFor(date)
}

export function homeWorkoutId(state: AppState, date: string): DayPlan | null {
  const choice = state.schedule[date]
  if (choice) return choice
  return workoutIdFor(date)
}

export function phaseLine(phase: CyclePhase, late: boolean): string {
  if (phase === "follicular") return "Energy may be increasing. A good time to focus on strength and progression."
  if (phase === "ovulation") return "Strength may be high. Warm up well and look after your joints."
  if (phase === "period") return "Energy may be lower. Lighter work fits, and the pool can wait unless flow is light."
  if (late) return "Fatigue is common now. Lower the load or leave room to rest."
  return "Energy and breath may dip. Ease the load if your body asks."
}

export function phaseInsight(phase: CyclePhase, late: boolean): { title: string; body: string } {
  if (phase === "follicular") {
    return {
      title: "Your energy may be increasing",
      body: "This phase can be a good time to build strength and gradually increase training intensity.",
    }
  }
  if (phase === "ovulation") {
    return {
      title: "Strength is often high",
      body: "Warm up well and look after your knees before you add load.",
    }
  }
  if (phase === "period") {
    return {
      title: "A lighter day can be enough",
      body: "Lighter work fits this phase. Swimming stays off unless the flow is light.",
    }
  }
  if (late) {
    return {
      title: "Leave room to rest",
      body: "Fatigue and bloating are common now. Lower the load, shorten the session, or rest.",
    }
  }
  return {
    title: "Ease the intensity",
    body: "Breath and energy can dip in this phase. A moderate session is enough.",
  }
}

export function trainingPhaseLine(phase: CyclePhase, late: boolean): string {
  if (phase === "follicular") return "Your energy may be higher today, so we're focusing on progressive strength."
  if (phase === "ovulation") return "Strength may be high. Warm up well and look after your knees."
  if (phase === "period") return "Energy may be lower. Keep the session lighter, and leave swimming unless flow is light."
  if (late) return "Fatigue is common now. Lower the load or keep the session short."
  return "Ease the intensity today. A moderate pace is enough."
}

export type PhaseWindow = {
  remaining: number
  nextPhase: CyclePhase
  daysUntilNext: number
}

export function phaseWindow(day: number, cycleLength: number, periodLength: number, phase: CyclePhase): PhaseWindow {
  const ovulation = cycleLength - 14
  if (phase === "period") {
    return { remaining: Math.max(0, periodLength - day), nextPhase: "follicular", daysUntilNext: periodLength + 1 - day }
  }
  if (phase === "follicular") {
    return { remaining: Math.max(0, ovulation - 2 - day), nextPhase: "ovulation", daysUntilNext: ovulation - 1 - day }
  }
  if (phase === "ovulation") {
    return { remaining: Math.max(0, ovulation - day), nextPhase: "luteal", daysUntilNext: ovulation + 1 - day }
  }
  return { remaining: Math.max(0, cycleLength - day), nextPhase: "period", daysUntilNext: cycleLength - day + 1 }
}

export function formatSigned(value: number, unit: string): string {
  const rounded = Math.round(value * 10) / 10
  const abs = Math.abs(rounded)
  const text = Number.isInteger(abs) ? String(abs) : abs.toFixed(1)
  if (rounded === 0) return `0 ${unit}`
  return `${rounded > 0 ? "+" : "−"}${text} ${unit}`
}

export function formatKg(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

export function formatPercent(value: number): string {
  const rounded = Math.round(value)
  if (rounded === 0) return "0%"
  return `${rounded > 0 ? "+" : "−"}${Math.abs(rounded)}%`
}

export function prescribedCount(prescription: string): number {
  const match = prescription.match(/^(\d+)/)
  const count = match ? Number(match[1]) : 1
  if (!Number.isFinite(count) || count < 1) return 1
  return Math.min(count, 8)
}

export function entrySets(entry: Entry | undefined): { weight: string; reps: string }[] {
  if (!entry) return []
  if (entry.sets && entry.sets.length > 0) return entry.sets
  if (entry.primary.trim() || entry.secondary.trim()) return [{ weight: entry.secondary, reps: entry.primary }]
  return []
}

export function loggedMinutes(entries: Record<string, Entry> | undefined): number | null {
  if (!entries) return null
  let total = 0
  let found = false
  for (const entry of Object.values(entries)) {
    if (entry.kind !== "cardio" && entry.kind !== "swim") continue
    const minutes = parseNum(entry.primary)
    if (minutes == null) continue
    total += minutes
    found = true
  }
  return found ? Math.round(total) : null
}

export function strengthMoves(exercises: Exercise[]): Exercise[] {
  return exercises.filter((exercise) => exercise.kind === "strength" || exercise.kind === "core")
}

export function supportMoves(exercises: Exercise[]): Exercise[] {
  return exercises.filter((exercise) => exercise.kind === "cardio" || exercise.kind === "swim")
}

export function isLoadKind(kind: ExerciseKind): boolean {
  return kind === "strength" || kind === "core"
}

export function rangeStart(today: string, days: number): string {
  return addDays(today, -days)
}

export function weightsInRange(weights: AppState["weights"], today: string, days: number | null): AppState["weights"] {
  const start = days == null ? null : rangeStart(today, days)
  return [...weights]
    .filter((item) => item.date <= today && (start == null || item.date >= start))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function meanPercentChange(state: AppState, today: string, days: number): number | null {
  const start = rangeStart(today, days)
  const changes: number[] = []
  for (const series of loadSeries(state, today, start)) {
    if (series.first <= 0) continue
    changes.push(((series.last - series.first) / series.first) * 100)
  }
  if (changes.length === 0) return null
  return changes.reduce((sum, value) => sum + value, 0) / changes.length
}

export type LoadPoint = { date: string; kg: number }

export function strengthIndex(state: AppState, today: string, days: number): LoadPoint[] {
  const start = rangeStart(today, days)
  const byDate = new Map<string, number[]>()
  for (const log of Object.entries(state.logs)) {
    const [date, day] = log
    if (date < start || date > today) continue
    for (const entry of Object.values(day.entries)) {
      if (!isLoadKind(entry.kind)) continue
      const kg = metricValue(entry.kind, entry)
      if (kg == null) continue
      const list = byDate.get(date) ?? []
      list.push(kg)
      byDate.set(date, list)
    }
  }
  const dates = [...byDate.keys()].sort()
  if (dates.length < 2) return []
  const means = dates.map((date) => {
    const list = byDate.get(date) ?? []
    return { date, kg: list.reduce((sum, value) => sum + value, 0) / list.length }
  })
  const base = means[0]?.kg
  if (base == null || base <= 0) return []
  return means.map((point) => ({ date: point.date, kg: (point.kg / base) * 100 }))
}

function loadSeries(state: AppState, today: string, start: string): { name: string; first: number; last: number; date: string }[] {
  const map = new Map<string, { name: string; points: { date: string; kg: number }[] }>()
  for (const [date, day] of Object.entries(state.logs)) {
    if (date < start || date > today) continue
    for (const entry of Object.values(day.entries)) {
      if (!isLoadKind(entry.kind)) continue
      const kg = metricValue(entry.kind, entry)
      if (kg == null) continue
      const key = `${entry.kind}::${entry.name}`
      const series = map.get(key) ?? { name: entry.name, points: [] }
      series.points.push({ date, kg })
      map.set(key, series)
    }
  }
  const result: { name: string; first: number; last: number; date: string }[] = []
  for (const series of map.values()) {
    series.points.sort((a, b) => a.date.localeCompare(b.date))
    if (series.points.length < 2) continue
    const first = series.points[0]
    const last = series.points[series.points.length - 1]
    if (!first || !last) continue
    result.push({ name: series.name, first: first.kg, last: last.kg, date: last.date })
  }
  return result
}

export type RecordRow = { name: string; kg: number; delta: number; date: string }

export function recentRecords(state: AppState): RecordRow[] {
  const map = new Map<string, { name: string; points: { date: string; kg: number }[] }>()
  for (const [date, day] of Object.entries(state.logs)) {
    for (const entry of Object.values(day.entries)) {
      if (!isLoadKind(entry.kind)) continue
      const kg = metricValue(entry.kind, entry)
      if (kg == null) continue
      const key = `${entry.kind}::${entry.name}`
      const series = map.get(key) ?? { name: entry.name, points: [] }
      series.points.push({ date, kg })
      map.set(key, series)
    }
  }
  const rows: RecordRow[] = []
  for (const series of map.values()) {
    series.points.sort((a, b) => a.date.localeCompare(b.date))
    let best = -Infinity
    let bestDate = ""
    let previous = -Infinity
    for (const point of series.points) {
      if (point.kg > best) {
        if (best > -Infinity) previous = best
        best = point.kg
        bestDate = point.date
      }
    }
    if (previous > -Infinity && best > previous) {
      rows.push({ name: series.name, kg: best, delta: best - previous, date: bestDate })
    }
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)
}

export function monthWeightDelta(weights: AppState["weights"], today: string): number | null {
  const month = today.slice(0, 7)
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date))
  const inMonth = sorted.filter((item) => item.date.startsWith(month) && item.date <= today)
  const latest = inMonth.at(-1)
  if (!latest) return null
  const prior = sorted.filter((item) => item.date < latest.date).at(-1)
  if (!prior) return null
  return Math.round((latest.kg - prior.kg) * 10) / 10
}

export function weeklyWorkoutCount(state: AppState, today: string): number {
  return Array.from({ length: 7 }, (_, index) => addDays(today, index - 6)).filter((date) => state.logs[date]?.done).length
}
