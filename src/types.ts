export type ExerciseKind = "strength" | "cardio" | "swim" | "core"

export type RestClass = "big" | "small" | "none"

export type WorkoutId =
  | "pernas-a"
  | "superiores-a"
  | "natacao-a"
  | "pernas-b"
  | "superiores-b"
  | "natacao-b"

export type Exercise = {
  id: string
  name: string
  prescription: string
  kind: ExerciseKind
  rest: RestClass
  image?: string
  custom?: boolean
}

export type Workout = {
  id: WorkoutId
  name: string
  summary: string
  weekday: number
  tone: string
  mark: string
  exercises: Exercise[]
}

export type SetLog = {
  weight: string
  reps: string
}

export type WeightUnit = "kg" | "lb"

export type Entry = {
  primary: string
  secondary: string
  name: string
  kind: ExerciseKind
  prescription: string
  sets?: SetLog[]
  unit?: WeightUnit
}

export type BuiltMove = {
  sourceId: string
  series: number
  reps: string
}

export type BuiltPlan = {
  id: string
  name: string
  exercises: BuiltMove[]
}

export type SessionRef = WorkoutId | `plan:${string}`

export type DayLog = {
  workoutId: SessionRef
  entries: Record<string, Entry>
  done: boolean
  trainStartedAt?: number
  trainSeconds?: number
  restStartedAt?: number
  restSeconds?: number
}

export type WeightLog = {
  id: string
  date: string
  kg: number
  note?: string
}

export type Review = {
  kg: number
  note: string
  at: string
  date: string
}

export type AppState = {
  logs: Record<string, DayLog>
  weights: WeightLog[]
  reviews: Record<string, Review>
  extras: Partial<Record<WorkoutId, Exercise[]>>
  plans: Record<string, BuiltPlan>
  schedule: Record<string, DayPlan>
  cycle: CycleSettings | null
  cycleDays: Record<string, CycleLog>
  introSeen: boolean
  welcomeSeen: boolean
  goalKg: number | null
}

export type DayPlan = WorkoutId | "rest" | `plan:${string}`

export type Flow = "none" | "light" | "medium" | "heavy"

export type Cramps = "none" | "mild" | "strong"

export type CycleSettings = {
  lastStart: string
  cycleLength: number
  periodLength: number
  endedOn?: string
}

export type CycleLog = {
  flow: Flow
  cramps: Cramps
  pill?: boolean
}

export type Tab = "home" | "training" | "calendar" | "progress" | "cycle" | "build"

export type ProgressView = "overview" | "weight" | "strength" | "body"

export type TrainingMonth = {
  id: string
  label: string
  start: string
  end: string
}
