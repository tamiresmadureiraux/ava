import { useEffect, useRef, useState } from "react"
import { useApp } from "../context"
import { IconHome, IconMonth, IconProgress, IconTraining } from "../icons"
import type { Tab } from "../types"

const ITEMS: { id: Exclude<Tab, "cycle">; label: string; icon: typeof IconHome }[] = [
  { id: "home", label: "Home", icon: IconHome },
  { id: "training", label: "Training", icon: IconTraining },
  { id: "calendar", label: "Calendar", icon: IconMonth },
  { id: "progress", label: "Progress", icon: IconProgress },
  { id: "build", label: "Build a training", icon: IconTraining },
]

export function PageMenu() {
  const { tab, returnTab, setTab, setProgressView } = useApp()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const current = tab === "cycle" ? (returnTab === "cycle" ? "calendar" : returnTab) : tab === "build" ? "home" : tab

  useEffect(() => {
    if (!open) return
    function onPointer(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", onPointer)
    return () => document.removeEventListener("pointerdown", onPointer)
  }, [open])

  return (
    <div className="page-menu" ref={root}>
      <button type="button" className="avatar" aria-label="Pages" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        T
      </button>
      {open ? (
        <div className="page-menu-panel" role="menu">
          {ITEMS.map((item) => {
            const Icon = item.icon
            const active = current === item.id
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  if (item.id === "progress") setProgressView("overview")
                  setTab(item.id)
                  setOpen(false)
                }}
              >
                <Icon />
                {item.label}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
