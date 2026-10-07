import type { Exercise, ExerciseKind, RestClass, Workout, WorkoutId } from "./types"

function move(
  id: string,
  name: string,
  prescription: string,
  kind: ExerciseKind,
  rest: RestClass,
  image: string,
): Exercise {
  return { id, name, prescription, kind, rest, image }
}

const CARDIO = `${import.meta.env.BASE_URL}exercises/cardio.png`

const warmup = (id: string) =>
  move(id, "Incline treadmill, bike, or elliptical", "8–10 min", "cardio", "none", CARDIO)

const cooldown = (id: string) =>
  move(id, "Incline treadmill, stair climber, bike, or elliptical", "15–20 min", "cardio", "none", CARDIO)

export const WORKOUTS: Record<WorkoutId, Workout> = {
  "pernas-a": {
    id: "pernas-a",
    name: "Pernas A",
    summary: "Quadríceps, glúteos e panturrilha",
    weekday: 1,
    tone: "#d4531b",
    mark: "A",
    exercises: [
      warmup("pa-warm"),
      move("pa-leg", "Leg press", "4 × 8–12", "strength", "big", `${import.meta.env.BASE_URL}exercises/leg-press.png`),
      move("pa-squat", "Smith machine squat or hack squat", "3 × 8–10", "strength", "big", `${import.meta.env.BASE_URL}exercises/smith-squat.png`),
      move("pa-ext", "Leg extension", "3 × 10–15", "strength", "small", `${import.meta.env.BASE_URL}exercises/leg-extension.png`),
      move("pa-hip", "Hip thrust", "4 × 8–12", "strength", "big", `${import.meta.env.BASE_URL}exercises/hip-thrust.png`),
      move("pa-abd", "Hip abduction machine", "3 × 12–15", "strength", "small", `${import.meta.env.BASE_URL}exercises/hip-abduction.png`),
      move("pa-calf", "Calf raise", "3 × 12–15", "strength", "small", `${import.meta.env.BASE_URL}exercises/calf-raise.png`),
      cooldown("pa-cool"),
    ],
  },
  "superiores-a": {
    id: "superiores-a",
    name: "Superiores A",
    summary: "Costas, peito e braços",
    weekday: 2,
    tone: "#b23b62",
    mark: "A",
    exercises: [
      warmup("sa-warm"),
      move("sa-pull", "Lat pulldown", "3 × 8–12", "strength", "big", `${import.meta.env.BASE_URL}exercises/lat-pulldown.png`),
      move("sa-row", "Seated row", "3 × 8–12", "strength", "big", `${import.meta.env.BASE_URL}exercises/seated-row.png`),
      move("sa-press", "Chest press", "3 × 8–12", "strength", "big", `${import.meta.env.BASE_URL}exercises/chest-press.png`),
      move("sa-fly", "Chest fly machine", "3 × 10–12", "strength", "small", `${import.meta.env.BASE_URL}exercises/chest-fly.png`),
      move("sa-curl", "Biceps curl", "3 × 10–12", "strength", "small", `${import.meta.env.BASE_URL}exercises/biceps-curl.png`),
      move("sa-tri", "Cable triceps pushdown", "3 × 10–12", "strength", "small", `${import.meta.env.BASE_URL}exercises/triceps-pushdown.png`),
      move("sa-abs", "Abs", "3 séries", "core", "small", `${import.meta.env.BASE_URL}exercises/abs.png`),
      cooldown("sa-cool"),
    ],
  },
  "natacao-a": {
    id: "natacao-a",
    name: "Natação",
    summary: "Sessão curta, 30–40 min",
    weekday: 3,
    tone: "#1a7f9a",
    mark: "30",
    exercises: [move("na-swim", "Swimming", "30–40 min", "swim", "none", `${import.meta.env.BASE_URL}exercises/swimming.png`)],
  },
  "pernas-b": {
    id: "pernas-b",
    name: "Pernas B",
    summary: "Posteriores, glúteos e panturrilha",
    weekday: 4,
    tone: "#2c7450",
    mark: "B",
    exercises: [
      warmup("pb-warm"),
      move("pb-rdl", "Romanian deadlift", "3 × 8–10", "strength", "big", `${import.meta.env.BASE_URL}exercises/romanian-deadlift.png`),
      move("pb-curl", "Lying or seated leg curl", "3 × 10–12", "strength", "big", `${import.meta.env.BASE_URL}exercises/leg-curl.png`),
      move("pb-hip", "Hip thrust", "4 × 8–12", "strength", "big", `${import.meta.env.BASE_URL}exercises/hip-thrust.png`),
      move("pb-split", "Bulgarian split squat", "3 × 8–10 cada perna", "strength", "big", `${import.meta.env.BASE_URL}exercises/bulgarian-split-squat.png`),
      move("pb-kick", "Cable glute kickback", "3 × 12–15", "strength", "small", `${import.meta.env.BASE_URL}exercises/glute-kickback.png`),
      move("pb-abd", "Hip abduction", "3 × 12–15", "strength", "small", `${import.meta.env.BASE_URL}exercises/hip-abduction.png`),
      move("pb-calf", "Calf raise", "3 × 12–15", "strength", "small", `${import.meta.env.BASE_URL}exercises/calf-raise.png`),
      cooldown("pb-cool"),
    ],
  },
  "superiores-b": {
    id: "superiores-b",
    name: "Superiores B",
    summary: "Ombros, costas e braços",
    weekday: 5,
    tone: "#3a5196",
    mark: "B",
    exercises: [
      warmup("sb-warm"),
      move("sb-row", "Cable row", "3 × 8–12", "strength", "big", `${import.meta.env.BASE_URL}exercises/cable-row.png`),
      move("sb-lat", "Lat pulldown", "3 × 8–12", "strength", "big", `${import.meta.env.BASE_URL}exercises/lat-pulldown.png`),
      move("sb-press", "Shoulder press", "3 × 8–12", "strength", "big", `${import.meta.env.BASE_URL}exercises/shoulder-press.png`),
      move("sb-lat-raise", "Lateral raise", "3 × 12–15", "strength", "small", `${import.meta.env.BASE_URL}exercises/lateral-raise.png`),
      move("sb-face", "Face pull", "3 × 12–15", "strength", "small", `${import.meta.env.BASE_URL}exercises/face-pull.png`),
      move("sb-curl", "Biceps curl", "3 × 10–12", "strength", "small", `${import.meta.env.BASE_URL}exercises/biceps-curl.png`),
      move("sb-tri", "Triceps pushdown", "3 × 10–12", "strength", "small", `${import.meta.env.BASE_URL}exercises/triceps-pushdown.png`),
      move("sb-abs", "Abs", "3 séries", "core", "small", `${import.meta.env.BASE_URL}exercises/abs.png`),
      cooldown("sb-cool"),
    ],
  },
  "natacao-b": {
    id: "natacao-b",
    name: "Natação",
    summary: "Sessão longa, 30–45 min",
    weekday: 6,
    tone: "#245f86",
    mark: "45",
    exercises: [move("nb-swim", "Swimming", "30–45 min", "swim", "none", `${import.meta.env.BASE_URL}exercises/swimming.png`)],
  },
}

export const WEEK_ORDER: WorkoutId[] = [
  "pernas-a",
  "superiores-a",
  "natacao-a",
  "pernas-b",
  "superiores-b",
  "natacao-b",
]

export const WORKOUT_SHORT: Record<WorkoutId, string> = {
  "pernas-a": "Pernas A",
  "superiores-a": "Superiores A",
  "natacao-a": "Natação",
  "pernas-b": "Pernas B",
  "superiores-b": "Superiores B",
  "natacao-b": "Natação longa",
}

export const REST_OPTIONS: Record<"big" | "small", number[]> = {
  big: [90, 105, 120],
  small: [60, 75, 90],
}

export function defaultRest(rest: "big" | "small"): number {
  return rest === "big" ? 105 : 75
}
