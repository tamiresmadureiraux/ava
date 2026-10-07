import { useEffect, useState } from "react"
import { AddSheet, IntroSheet, ReviewSheet } from "./components/Sheets"
import { AppContext, type AppApi } from "./context"
import { reviewStatus, todayISO } from "./dates"
import { PlanSheet } from "./components/PlanSheet"
import { CalendarScreen } from "./screens/CalendarScreen"
import { CycleScreen } from "./screens/CycleScreen"
import { HomeScreen } from "./screens/HomeScreen"
import { BuildScreen } from "./screens/BuildScreen"
import { ProgressScreen } from "./screens/ProgressScreen"
import { TrainingScreen } from "./screens/TrainingScreen"
import { WelcomeScreen } from "./screens/WelcomeScreen"
import { isWorkoutId, planKey } from "./plans"
import { emptyState, loadState, saveState, uid } from "./store"
import type { AppState, CycleLog, DayPlan, Entry, Exercise, ProgressView, SessionRef, Tab } from "./types"

function previewWelcome(): boolean {
  if (!import.meta.env.DEV) return false
  return new URLSearchParams(window.location.search).get("welcome") === "1"
}

function initialToday(): { today: string; simulated: boolean } {
  if (import.meta.env.DEV) {
    const as = new URLSearchParams(window.location.search).get("as")
    if (as && /^\d{4}-\d{2}-\d{2}$/.test(as)) return { today: as, simulated: true }
  }
  return { today: todayISO(), simulated: false }
}

export default function App() {
  const [{ today, simulated }] = useState(initialToday)
  const [state, setState] = useState<AppState>(loadState)
  const [tab, setTabState] = useState<Tab>(() => (window.location.hash === "#build" ? "build" : "home"))
  const [returnTab, setReturnTab] = useState<Tab>("home")
  const [progressView, setProgressView] = useState<ProgressView>("overview")
  const [selected, setSelected] = useState(today)
  const [addOpen, setAddOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [planDate, setPlanDate] = useState<string | null>(null)
  const [forceWelcome, setForceWelcome] = useState(previewWelcome)

  useEffect(() => {
    saveState(state)
  }, [state])

  const pending = reviewStatus(today, state.reviews)
  const sheetOpen = addOpen || reviewOpen || planDate != null || Boolean(pending?.overdue) || !state.introSeen

  useEffect(() => {
    document.body.classList.toggle("locked", sheetOpen)
  }, [sheetOpen])

  useEffect(() => {
    const onboarding = forceWelcome || (!state.welcomeSeen && !state.introSeen)
    const light = !onboarding && (tab === "home" || tab === "calendar" || tab === "build" || (tab === "progress" && progressView === "weight"))
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", light ? "#faf9f7" : "#0d0d0f")
  }, [tab, progressView, forceWelcome, state.welcomeSeen, state.introSeen])

  useEffect(() => {
    function onFocusIn(event: FocusEvent) {
      const target = event.target
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return
      window.setTimeout(() => {
        target.scrollIntoView({ block: "center", behavior: "smooth" })
      }, 280)
    }
    document.addEventListener("focusin", onFocusIn)
    return () => document.removeEventListener("focusin", onFocusIn)
  }, [])

  const api: AppApi = {
    state,
    today,
    simulated,
    selected,
    tab,
    returnTab,
    setTab: (next) => {
      setTabState((current) => {
        if (next === "cycle" && current !== "cycle") setReturnTab(current)
        return next
      })
      const hash = next === "build" ? "#build" : ""
      if (window.location.hash !== hash) {
        const nextUrl = `${window.location.pathname}${window.location.search}${hash}`
        window.history.replaceState(null, "", nextUrl)
      }
    },
    progressView,
    setProgressView,
    setSelected,
    updateEntry: (date, exercise, patch) => {
      setState((current) => {
        const scheduled = current.schedule[date]
        const logged = current.logs[date]?.workoutId
        const workoutId: SessionRef | null = scheduled && scheduled !== "rest" ? scheduled : logged ?? null
        if (!workoutId) return current
        const day = current.logs[date] ?? { workoutId, entries: {}, done: false }
        const prev = day.entries[exercise.id] ?? blankEntry(exercise)
        const next: Entry = { ...prev, ...patch, name: exercise.name, kind: exercise.kind, prescription: exercise.prescription }
        if (!("sets" in patch)) delete next.sets
        if (next.unit !== "lb") delete next.unit
        if (next.sets) {
          const filled = next.sets.filter((set) => set.weight.trim() || set.reps.trim())
          if (filled.length > 0) {
            const last = filled[filled.length - 1]
            next.primary = last?.reps ?? ""
            next.secondary = last?.weight ?? ""
          } else {
            delete next.sets
            next.primary = ""
            next.secondary = ""
          }
        }
        const entries = { ...day.entries }
        if (!next.primary.trim() && !next.secondary.trim()) delete entries[exercise.id]
        else entries[exercise.id] = next
        return {
          ...current,
          logs: {
            ...current.logs,
            [date]: { workoutId, entries, done: Object.keys(entries).length > 0 ? day.done : false },
          },
        }
      })
    },
    setDone: (date, workoutId, done) => {
      setState((current) => {
        const day = current.logs[date] ?? { workoutId, entries: {}, done: false }
        const now = Date.now()
        const trainSeconds = (day.trainSeconds ?? 0) + (day.trainStartedAt ? Math.floor((now - day.trainStartedAt) / 1000) : 0)
        const restSeconds = day.restStartedAt ? Math.floor((now - day.restStartedAt) / 1000) : day.restSeconds
        const next = { ...day, workoutId, done, trainSeconds, restSeconds }
        delete next.trainStartedAt
        delete next.restStartedAt
        return { ...current, logs: { ...current.logs, [date]: next } }
      })
    },
    setClock: (date, workoutId, patch) => {
      setState((current) => {
        const day = current.logs[date] ?? { workoutId, entries: {}, done: false }
        const next = { ...day, workoutId, ...patch }
        if ("trainStartedAt" in patch && patch.trainStartedAt == null) delete next.trainStartedAt
        if ("restStartedAt" in patch && patch.restStartedAt == null) delete next.restStartedAt
        return { ...current, logs: { ...current.logs, [date]: next } }
      })
    },
    addExercise: (workoutId, exercise) => {
      setState((current) => ({
        ...current,
        extras: { ...current.extras, [workoutId]: [...(current.extras[workoutId] ?? []), exercise] },
      }))
    },
    removeExercise: (workoutId, exerciseId) => {
      setState((current) => ({
        ...current,
        extras: {
          ...current.extras,
          [workoutId]: (current.extras[workoutId] ?? []).filter((exercise) => exercise.id !== exerciseId),
        },
      }))
    },
    saveWeight: (date, kg, note) => {
      setState((current) => {
        const existing = current.weights.find((item) => item.date === date)
        const trimmed = note?.trim()
        const weights = existing
          ? current.weights.map((item) => {
              if (item.date !== date) return item
              const next = { ...item, kg }
              if (trimmed) next.note = trimmed
              else delete next.note
              return next
            })
          : [...current.weights, { id: uid(), date, kg, ...(trimmed ? { note: trimmed } : {}) }]
        return { ...current, weights }
      })
    },
    setGoal: (kg) => setState((current) => ({ ...current, goalKg: kg })),
    deleteWeight: (id) => {
      setState((current) => ({ ...current, weights: current.weights.filter((item) => item.id !== id) }))
    },
    saveReview: (kg, note) => {
      setState((current) => {
        const due = reviewStatus(today, current.reviews)
        if (!due) return current
        const existing = current.weights.find((item) => item.date === today)
        const weights = existing
          ? current.weights.map((item) => (item.date === today ? { ...item, kg } : item))
          : [...current.weights, { id: uid(), date: today, kg }]
        return {
          ...current,
          weights,
          reviews: {
            ...current.reviews,
            [due.month.id]: { kg, note, at: new Date().toISOString(), date: today },
          },
        }
      })
      setReviewOpen(false)
    },
    markIntroSeen: () => setState((current) => ({ ...current, introSeen: true })),
    markWelcomeSeen: () => {
      setForceWelcome(false)
      setState((current) => ({ ...current, welcomeSeen: true }))
    },
    resetAll: () => setState({ ...emptyState(), introSeen: true }),
    openAdd: () => setAddOpen(true),
    openReview: () => setReviewOpen(true),
    openPlan: (date) => setPlanDate(date),
    setDayPlan: (date, plan) => {
      setState((current) => ({ ...current, schedule: writePlan(current.schedule, date, plan) }))
      setPlanDate(null)
    },
    saveBuiltPlan: ({ name, exercises, dates }) => {
      const id = uid()
      const plan = { id, name: name.trim() || "Training", exercises }
      setState((current) => {
        const schedule = { ...current.schedule }
        for (const date of dates) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(date)) schedule[date] = planKey(id)
        }
        return { ...current, plans: { ...current.plans, [id]: plan }, schedule }
      })
      setTabState("home")
      if (window.location.hash === "#build") {
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`)
      }
    },
    saveCycle: (cycle) => setState((current) => ({ ...current, cycle })),
    setCycleDay: (date, patch) => {
      setState((current) => {
        const prev = current.cycleDays[date] ?? { flow: "none" as const, cramps: "none" as const }
        const next: CycleLog = { ...prev, ...patch }
        if ("pill" in patch && patch.pill == null) delete next.pill
        const cycleDays = { ...current.cycleDays }
        if (next.flow === "none" && next.cramps === "none" && next.pill == null) delete cycleDays[date]
        else cycleDays[date] = next
        return { ...current, cycleDays }
      })
    },
  }

  const scheduledToday = state.schedule[selected]
  const loggedToday = state.logs[selected]?.workoutId
  const addWorkout = isWorkoutId(scheduledToday) ? scheduledToday : scheduledToday == null && isWorkoutId(loggedToday) ? loggedToday : null
  const showWelcome = forceWelcome || (!state.welcomeSeen && !state.introSeen)

  function leaveWelcome() {
    if (state.introSeen) {
      setForceWelcome(false)
      return
    }
    api.markWelcomeSeen()
  }

  return (
    <AppContext.Provider value={api}>
      <div className={showWelcome || !(tab === "home" || tab === "calendar" || tab === "build" || (tab === "progress" && progressView === "weight")) ? "app" : "app light"}>
        {showWelcome ? (
          <WelcomeScreen onStart={leaveWelcome} />
        ) : (
          <>
            {simulated ? <p className="dev-ribbon">Data simulada: {today}</p> : null}
            {tab === "home" ? <HomeScreen /> : null}
            {tab === "training" ? <TrainingScreen /> : null}
            {tab === "calendar" ? <CalendarScreen /> : null}
            {tab === "cycle" ? <CycleScreen /> : null}
            {tab === "progress" ? <ProgressScreen /> : null}
            {tab === "build" ? <BuildScreen /> : null}
            {addOpen && addWorkout ? <AddSheet workoutId={addWorkout} onClose={() => setAddOpen(false)} /> : null}
            {planDate ? <PlanSheet date={planDate} onClose={() => setPlanDate(null)} /> : null}
            {!state.introSeen && !pending?.overdue ? <IntroSheet /> : null}
            {pending && (pending.overdue || reviewOpen) ? (
              <ReviewSheet blocking={pending.overdue} onClose={() => setReviewOpen(false)} />
            ) : null}
          </>
        )}
      </div>
    </AppContext.Provider>
  )
}

function writePlan(schedule: AppState["schedule"], date: string, plan: DayPlan | null): AppState["schedule"] {
  const next = { ...schedule }
  if (!plan) delete next[date]
  else next[date] = plan
  return next
}

function blankEntry(exercise: Exercise): Entry {
  return {
    primary: "",
    secondary: "",
    name: exercise.name,
    kind: exercise.kind,
    prescription: exercise.prescription,
  }
}
