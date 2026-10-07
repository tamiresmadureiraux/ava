import { addDays, resolvedWorkout } from "./dates"
import { isWorkoutId } from "./plans"
import { metricUnit, metricValue } from "./format"
import { WORKOUTS } from "./program"
import type { AppState, Entry, Exercise, ExerciseKind, WorkoutId } from "./types"

export function sessionOrder(exercises: Exercise[]): Exercise[] {
  if (exercises.length === 0 || exercises.every((exercise) => exercise.kind === "swim")) return exercises
  const body = exercises.filter((exercise) => exercise.kind !== "cardio")
  if (body.length === 0) return exercises
  const cardios = exercises.filter((exercise) => exercise.kind === "cardio")
  if (cardios.length === 0) return exercises
  const first = exercises[0]
  const last = exercises[exercises.length - 1]
  const list = [...body]
  if (first?.kind === "cardio") list.unshift(first)
  else if (last?.kind !== "cardio") list.unshift(cardios[0])
  const end = last?.kind === "cardio" ? last : cardios.length > 1 ? cardios[cardios.length - 1] : undefined
  if (end && list[list.length - 1]?.id !== end.id) list.push(end)
  return list
}

export function sessionExercises(workoutId: WorkoutId, extras: AppState["extras"]): Exercise[] {
  const base = WORKOUTS[workoutId].exercises
  const extra = extras[workoutId] ?? []
  if (extra.length === 0) return base
  const last = base[base.length - 1]
  if (last && last.kind === "cardio" && base.length > 1 && base[0]?.kind === "cardio") {
    return [...base.slice(0, -1), ...extra, last]
  }
  return [...base, ...extra]
}

export function groupSession(exercises: Exercise[]): { title: string; items: Exercise[] }[] {
  if (exercises.length > 0 && exercises.every((exercise) => exercise.kind === "swim")) {
    return [{ title: "Natação", items: exercises }]
  }
  let rest = exercises
  const groups: { title: string; items: Exercise[] }[] = []
  if (rest[0]?.kind === "cardio") {
    groups.push({ title: "Aquecimento", items: [rest[0]] })
    rest = rest.slice(1)
  }
  if (rest.length > 0 && rest[rest.length - 1]?.kind === "cardio") {
    const cool = rest[rest.length - 1]
    rest = rest.slice(0, -1)
    if (rest.length > 0) groups.push({ title: "Exercícios", items: rest })
    if (cool) groups.push({ title: "Volta à calma", items: [cool] })
  } else if (rest.length > 0) {
    groups.push({ title: "Exercícios", items: rest })
  }
  return groups
}

export function lastPerformance(
  state: AppState,
  exercise: Exercise,
  beforeDate: string,
): { date: string; entry: Entry } | null {
  const dates = Object.keys(state.logs)
    .filter((date) => date < beforeDate)
    .sort()
    .reverse()
  for (const date of dates) {
    const log = state.logs[date]
    if (!log) continue
    for (const entry of Object.values(log.entries)) {
      if (entry.name === exercise.name && entry.kind === exercise.kind) {
        if (entry.primary.trim() || entry.secondary.trim()) return { date, entry }
      }
    }
  }
  return null
}

export function filledCount(exercises: Exercise[], entries: Record<string, Entry> | undefined): number {
  if (!entries) return 0
  return exercises.filter((exercise) => {
    const entry = entries[exercise.id]
    return Boolean(entry && (entry.primary.trim() || entry.secondary.trim()))
  }).length
}

export function latestWeight(weights: AppState["weights"]) {
  return [...weights].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))[0] ?? null
}

export function upcoming(
  from: string,
  schedule: AppState["schedule"] = {},
): { date: string; workoutId: WorkoutId } | null {
  let date = addDays(from, 1)
  for (let step = 0; step < 14; step += 1) {
    const workoutId = resolvedWorkout(date, schedule)
    if (workoutId) return { date, workoutId }
    date = addDays(date, 1)
  }
  return null
}

export type SeriesPoint = {
  date: string
  entry: Entry
  workoutId: WorkoutId | null
}

export type Series = {
  key: string
  name: string
  kind: ExerciseKind
  prescription: string
  points: SeriesPoint[]
}

export function buildSeries(state: AppState): Series[] {
  const map = new Map<string, Series>()
  for (const [date, log] of Object.entries(state.logs)) {
    for (const entry of Object.values(log.entries)) {
      if (!entry.primary.trim() && !entry.secondary.trim()) continue
      const key = `${entry.kind}::${entry.name}`
      const series = map.get(key) ?? {
        key,
        name: entry.name,
        kind: entry.kind,
        prescription: entry.prescription,
        points: [],
      }
      series.prescription = entry.prescription || series.prescription
      series.points.push({ date, entry, workoutId: isWorkoutId(log.workoutId) ? log.workoutId : null })
      map.set(key, series)
    }
  }
  for (const series of map.values()) {
    series.points.sort((a, b) => a.date.localeCompare(b.date))
  }
  return [...map.values()].sort((a, b) => {
    const left = a.points[a.points.length - 1]?.date ?? ""
    const right = b.points[b.points.length - 1]?.date ?? ""
    return right.localeCompare(left)
  })
}

export function seriesNumbers(series: Series): number[] {
  return series.points
    .map((point) => metricValue(series.kind, point.entry))
    .filter((value): value is number => value != null)
}

export function seriesUnit(series: Series): string {
  return metricUnit(series.kind)
}
