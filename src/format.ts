import type { Entry, ExerciseKind } from "./types"

export function parseNum(value: string): number | null {
  const trimmed = value.trim().replace(",", ".")
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null
  const number = Number(trimmed)
  return Number.isFinite(number) ? number : null
}

export function formatNumber(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return rounded.toLocaleString("pt-BR", {
    minimumFractionDigits: Number.isInteger(rounded) ? 0 : 1,
    maximumFractionDigits: 1,
  })
}

export function formatInput(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(".", ",")
}

export function formatDelta(value: number, unit: string): string {
  const rounded = Math.round(value * 10) / 10
  if (rounded === 0) return "igual"
  const sign = rounded > 0 ? "+" : "−"
  return `${sign}${formatNumber(Math.abs(rounded))} ${unit}`
}

export function toKg(value: number, unit: "kg" | "lb" | undefined): number {
  return unit === "lb" ? value * 0.45359237 : value
}

export function formatEntryLine(kind: ExerciseKind, entry: Pick<Entry, "primary" | "secondary" | "unit">): string {
  const primary = entry.primary.trim()
  const secondary = entry.secondary.trim()
  const parts: string[] = []
  if (kind === "strength" || kind === "core") {
    const unit = entry.unit === "lb" ? "lb" : "kg"
    if (primary) parts.push(parseNum(primary) == null ? primary : `${primary} rep`)
    if (secondary) parts.push(parseNum(secondary) == null ? secondary : `${secondary} ${unit}`)
  } else if (kind === "cardio") {
    if (primary) parts.push(parseNum(primary) == null ? primary : `${primary} min`)
    if (secondary) parts.push(secondary)
  } else {
    if (primary) parts.push(parseNum(primary) == null ? primary : `${primary} voltas`)
    if (secondary) parts.push(secondary)
  }
  return parts.join(" · ")
}

export function metricValue(kind: ExerciseKind, entry: Pick<Entry, "primary" | "secondary" | "unit">): number | null {
  if (kind === "strength" || kind === "core") {
    const value = parseNum(entry.secondary)
    return value == null ? null : toKg(value, entry.unit)
  }
  return parseNum(entry.primary)
}

export function metricUnit(kind: ExerciseKind): string {
  if (kind === "strength" || kind === "core") return "kg"
  if (kind === "cardio") return "min"
  return "voltas"
}
