import { createContext, useContext } from "react"
import type { AppState, BuiltPlan, CycleLog, CycleSettings, DayPlan, Entry, Exercise, ProgressView, SessionRef, Tab, WorkoutId } from "./types"

export type AppApi = {
  state: AppState
  today: string
  simulated: boolean
  selected: string
  tab: Tab
  returnTab: Tab
  setTab: (tab: Tab) => void
  progressView: ProgressView
  setProgressView: (view: ProgressView) => void
  setSelected: (iso: string) => void
  updateEntry: (date: string, exercise: Exercise, patch: Partial<Entry>) => void
  setDone: (date: string, workoutId: SessionRef, done: boolean) => void
  setClock: (
    date: string,
    workoutId: SessionRef,
    patch: {
      trainStartedAt?: number | null
      trainSeconds?: number
      restStartedAt?: number | null
      restSeconds?: number
    },
  ) => void
  saveBuiltPlan: (plan: { name: string; exercises: BuiltPlan["exercises"]; dates: string[] }) => void
  addExercise: (workoutId: WorkoutId, exercise: Exercise) => void
  removeExercise: (workoutId: WorkoutId, exerciseId: string) => void
  saveWeight: (date: string, kg: number, note?: string) => void
  setGoal: (kg: number | null) => void
  deleteWeight: (id: string) => void
  saveReview: (kg: number, note: string) => void
  markIntroSeen: () => void
  markWelcomeSeen: () => void
  resetAll: () => void
  openAdd: () => void
  openReview: () => void
  openPlan: (date: string) => void
  setDayPlan: (date: string, plan: DayPlan | null) => void
  saveCycle: (cycle: CycleSettings) => void
  setCycleDay: (date: string, patch: Partial<CycleLog>) => void
}

export const AppContext = createContext<AppApi | null>(null)

export function useApp(): AppApi {
  const value = useContext(AppContext)
  if (!value) throw new Error("useApp fora do provedor")
  return value
}
