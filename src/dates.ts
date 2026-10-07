import type { DayPlan, TrainingMonth, WorkoutId } from "./types"

export const PROGRAM_START = "2026-10-06"

const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
]

const MONTHS_SHORT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
]

const WEEKDAYS = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
]

export const WEEKDAY_INITIALS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"]

const WORKOUT_BY_WEEKDAY: Record<number, WorkoutId | null> = {
  0: null,
  1: "pernas-a",
  2: "superiores-a",
  3: "natacao-a",
  4: "pernas-b",
  5: "superiores-b",
  6: "natacao-b",
}

export function parseISO(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1, 12, 0, 0, 0)
}

export function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

export function addDays(iso: string, days: number): string {
  const date = parseISO(iso)
  date.setDate(date.getDate() + days)
  return isoDate(date)
}

export function todayISO(): string {
  return isoDate(new Date())
}

export function isBeforeProgram(iso: string): boolean {
  return iso < PROGRAM_START
}

export function workoutIdFor(iso: string): WorkoutId | null {
  if (isBeforeProgram(iso)) return null
  return WORKOUT_BY_WEEKDAY[parseISO(iso).getDay()] ?? null
}

export function resolvedWorkout(
  iso: string,
  schedule: Record<string, DayPlan> = {},
): WorkoutId | null {
  if (isBeforeProgram(iso)) return null
  const planned = schedule[iso]
  if (planned === "rest" || (typeof planned === "string" && planned.startsWith("plan:"))) return null
  if (planned) return planned
  return workoutIdFor(iso)
}

export function formatLong(iso: string): string {
  const date = parseISO(iso)
  const weekday = WEEKDAYS[date.getDay()] ?? ""
  const label = weekday.charAt(0).toUpperCase() + weekday.slice(1)
  return `${label}, ${date.getDate()} de ${MONTHS[date.getMonth()]}`
}

export function formatShort(iso: string): string {
  const date = parseISO(iso)
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`
}

function lastDay(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

export function trainingMonthFor(iso: string): TrainingMonth | null {
  if (isBeforeProgram(iso)) return null
  const date = parseISO(iso)
  const year = date.getFullYear()
  const monthIndex = date.getMonth()
  const id = `${year}-${String(monthIndex + 1).padStart(2, "0")}`
  const name = MONTHS[monthIndex] ?? ""
  return {
    id,
    label: `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`,
    start: id === "2026-10" ? PROGRAM_START : `${id}-01`,
    end: `${id}-${String(lastDay(year, monthIndex)).padStart(2, "0")}`,
  }
}

export function trainingMonthById(id: string): TrainingMonth | null {
  return trainingMonthFor(`${id}-15`)
}

export function shiftMonth(id: string, delta: number): string | null {
  const [year, month] = id.split("-").map(Number)
  const date = new Date(year, (month ?? 1) - 1 + delta, 15, 12)
  return trainingMonthFor(isoDate(date))?.id ?? null
}

export function monthsThrough(today: string): TrainingMonth[] {
  const first = trainingMonthFor(PROGRAM_START)
  const limit = trainingMonthFor(today)
  if (!first || !limit) return []
  const months: TrainingMonth[] = []
  let cursor: TrainingMonth | null = first
  while (cursor) {
    months.push(cursor)
    if (cursor.id === limit.id) break
    const next: TrainingMonth | null = trainingMonthFor(addDays(cursor.end, 1))
    if (!next || next.id === cursor.id) break
    cursor = next
  }
  return months
}

export function reviewStatus(
  today: string,
  reviews: Record<string, unknown>,
): { month: TrainingMonth; overdue: boolean } | null {
  for (const month of monthsThrough(today)) {
    if (reviews[month.id]) continue
    if (today > month.end) return { month, overdue: true }
    if (today === month.end) return { month, overdue: false }
  }
  return null
}

export function calendarWeeks(month: TrainingMonth): (string | null)[][] {
  const [year, monthNumber] = month.id.split("-").map(Number)
  const first = new Date(year, (monthNumber ?? 1) - 1, 1, 12)
  const lead = (first.getDay() + 6) % 7
  const days = lastDay(year, (monthNumber ?? 1) - 1)
  const cells: (string | null)[] = Array.from({ length: lead }, () => null)
  for (let day = 1; day <= days; day += 1) {
    cells.push(isoDate(new Date(year, (monthNumber ?? 1) - 1, day, 12)))
  }
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (string | null)[][] = []
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7))
  }
  return weeks
}

export function formatRange(month: TrainingMonth): string {
  const start = parseISO(month.start)
  const end = parseISO(month.end)
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} de ${MONTHS[start.getMonth()]}`
  }
  return `${start.getDate()} de ${MONTHS[start.getMonth()]} – ${end.getDate()} de ${MONTHS[end.getMonth()]}`
}

export function monthNoun(month: TrainingMonth): string {
  return month.label.split(" ")[0]?.toLowerCase() ?? month.label
}
