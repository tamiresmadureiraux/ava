import { isPlanRef, isWorkoutId } from "./plans"
import type { AppState, BuiltMove, BuiltPlan, Cramps, CycleLog, CycleSettings, Exercise, ExerciseKind, Flow, RestClass, WeightLog, WorkoutId } from "./types"

const KEY = "progressao-treino-v1"

export function emptyState(): AppState {
  return { logs: {}, weights: [], reviews: {}, extras: {}, plans: {}, schedule: {}, cycle: null, cycleDays: {}, introSeen: false, welcomeSeen: false, goalKg: null }
}

function isKind(value: unknown): value is ExerciseKind {
  return value === "strength" || value === "cardio" || value === "swim" || value === "core"
}

function isExercise(value: unknown): value is Exercise {
  if (!value || typeof value !== "object") return false
  const item = value as Partial<Exercise>
  if (typeof item.id !== "string" || typeof item.name !== "string" || !isKind(item.kind)) return false
  const rest: RestClass =
    item.rest === "big" || item.rest === "small" || item.rest === "none"
      ? item.rest
      : item.kind === "cardio" || item.kind === "swim"
        ? "none"
        : "small"
  item.rest = rest
  item.prescription = typeof item.prescription === "string" ? item.prescription : ""
  if (typeof item.image !== "string") delete item.image
  return true
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyState()
    const data = JSON.parse(raw) as Partial<AppState>
    const extras: AppState["extras"] = {}
    if (data.extras && typeof data.extras === "object") {
      for (const [id, list] of Object.entries(data.extras)) {
        if (Array.isArray(list)) extras[id as WorkoutId] = list.filter(isExercise)
      }
    }
    const plans = sanitizePlans(data.plans)
    return {
      logs: data.logs && typeof data.logs === "object" ? data.logs : {},
      weights: sanitizeWeights(data.weights),
      reviews: data.reviews && typeof data.reviews === "object" ? data.reviews : {},
      extras,
      plans,
      schedule: sanitizeSchedule(data.schedule, plans),
      cycle: sanitizeCycle(data.cycle),
      cycleDays: sanitizeCycleDays(data.cycleDays),
      introSeen: Boolean(data.introSeen),
      welcomeSeen: data.welcomeSeen === true,
      goalKg: sanitizeGoal(data.goalKg),
    }
  } catch {
    return emptyState()
  }
}

function sanitizeSchedule(value: unknown, plans: AppState["plans"]): AppState["schedule"] {
  if (!value || typeof value !== "object") return {}
  const schedule: AppState["schedule"] = {}
  for (const [date, plan] of Object.entries(value)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
    if (plan === "rest" || isWorkoutId(plan)) schedule[date] = plan
    else if (isPlanRef(plan) && plans[plan.slice(5)]) schedule[date] = plan
  }
  return schedule
}

function sanitizePlans(value: unknown): AppState["plans"] {
  if (!value || typeof value !== "object") return {}
  const plans: AppState["plans"] = {}
  for (const [id, raw] of Object.entries(value)) {
    if (!raw || typeof raw !== "object") continue
    const item = raw as Partial<BuiltPlan>
    if (!Array.isArray(item.exercises)) continue
    const exercises: BuiltMove[] = []
    for (const move of item.exercises) {
      if (!move || typeof move !== "object") continue
      const row = move as Partial<BuiltMove>
      const series = Number(row.series)
      const reps = typeof row.reps === "string" ? row.reps.trim() : ""
      if (typeof row.sourceId !== "string" || !reps || !Number.isFinite(series) || series < 1) continue
      exercises.push({ sourceId: row.sourceId, series: Math.min(20, Math.round(series)), reps })
    }
    if (exercises.length === 0) continue
    const name = typeof item.name === "string" && item.name.trim() ? item.name.trim() : "Training"
    plans[id] = { id, name, exercises }
  }
  return plans
}

function sanitizeCycle(value: unknown): CycleSettings | null {
  if (!value || typeof value !== "object") return null
  const item = value as Partial<CycleSettings>
  if (typeof item.lastStart !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(item.lastStart)) return null
  const cycleLength = Number(item.cycleLength)
  const periodLength = Number(item.periodLength)
  if (!Number.isFinite(cycleLength) || !Number.isFinite(periodLength)) return null
  const cycle: CycleSettings = {
    lastStart: item.lastStart,
    cycleLength: Math.min(45, Math.max(21, Math.round(cycleLength))),
    periodLength: Math.min(10, Math.max(2, Math.round(periodLength))),
  }
  if (typeof item.endedOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.endedOn) && item.endedOn >= item.lastStart) {
    cycle.endedOn = item.endedOn
  }
  return cycle
}

function isFlow(value: unknown): value is Flow {
  return value === "none" || value === "light" || value === "medium" || value === "heavy"
}

function isCramps(value: unknown): value is Cramps {
  return value === "none" || value === "mild" || value === "strong"
}

function sanitizeGoal(value: unknown): number | null {
  const number = Number(value)
  if (!Number.isFinite(number) || number < 25 || number > 300) return null
  return Math.round(number * 10) / 10
}

function sanitizeWeights(value: unknown): WeightLog[] {
  if (!Array.isArray(value)) return []
  const weights: WeightLog[] = []
  for (const item of value) {
    if (!item || typeof item !== "object") continue
    const row = item as Partial<WeightLog>
    if (typeof row.id !== "string" || typeof row.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) continue
    if (typeof row.kg !== "number" || !Number.isFinite(row.kg)) continue
    const entry: WeightLog = { id: row.id, date: row.date, kg: row.kg }
    if (typeof row.note === "string" && row.note.trim()) entry.note = row.note.trim()
    weights.push(entry)
  }
  return weights
}

function sanitizeCycleDays(value: unknown): Record<string, CycleLog> {
  if (!value || typeof value !== "object") return {}
  const days: Record<string, CycleLog> = {}
  for (const [date, item] of Object.entries(value)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !item || typeof item !== "object") continue
    const log = item as Partial<CycleLog>
    if (!isFlow(log.flow) || !isCramps(log.cramps)) continue
    const entry: CycleLog = { flow: log.flow, cramps: log.cramps }
    if (log.pill === true || log.pill === false) entry.pill = log.pill
    days[date] = entry
  }
  return days
}

export function saveState(state: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Private mode or a full disk should not block the session.
  }
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}
