import { WORKOUTS } from "./program"
import type { BuiltPlan, Exercise, WorkoutId } from "./types"

const WORKOUT_IDS: WorkoutId[] = ["pernas-a", "superiores-a", "natacao-a", "pernas-b", "superiores-b", "natacao-b"]

export function isWorkoutId(value: unknown): value is WorkoutId {
  return typeof value === "string" && WORKOUT_IDS.includes(value as WorkoutId)
}

export function isPlanRef(value: unknown): value is `plan:${string}` {
  return typeof value === "string" && value.startsWith("plan:") && value.length > 5
}

export function planKey(id: string): `plan:${string}` {
  return `plan:${id}`
}

export function exerciseCatalog(): Exercise[] {
  const seen = new Set<string>()
  const list: Exercise[] = []
  for (const workout of Object.values(WORKOUTS)) {
    for (const exercise of workout.exercises) {
      if (seen.has(exercise.name)) continue
      seen.add(exercise.name)
      list.push(exercise)
    }
  }
  return list
}

export function catalogById(sourceId: string): Exercise | undefined {
  for (const workout of Object.values(WORKOUTS)) {
    const found = workout.exercises.find((exercise) => exercise.id === sourceId)
    if (found) return found
  }
  return undefined
}

export function exercisesFromPlan(plan: BuiltPlan): Exercise[] {
  return plan.exercises.map((item, index) => {
    const source = catalogById(item.sourceId)
    return {
      id: `${item.sourceId}#${index}`,
      name: source?.name ?? "Exercise",
      prescription: `${item.series} × ${item.reps}`,
      kind: source?.kind ?? "strength",
      rest: source?.rest ?? "small",
      ...(source?.image ? { image: source.image } : {}),
    }
  })
}

export function planMinutes(plan: BuiltPlan): number {
  const sets = plan.exercises.reduce((total, item) => total + item.series, 0)
  return Math.max(15, sets * 2)
}

export function planType(plan: BuiltPlan): string {
  const exercises = exercisesFromPlan(plan)
  if (exercises.length > 0 && exercises.every((exercise) => exercise.kind === "swim")) return "Endurance"
  if (exercises.length > 0 && exercises.every((exercise) => exercise.kind === "cardio" || exercise.kind === "swim")) return "Steady"
  return "Strength"
}
