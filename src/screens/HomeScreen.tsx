import { PageMenu } from "../components/PageMenu"
import { PlayButton, SessionFacts } from "../components/SessionFacts"
import { adviceFor, cycleOn } from "../cycle"
import { useApp } from "../context"
import { sessionExercises, sessionOrder } from "../logic"
import { exercisesFromPlan, isPlanRef, isWorkoutId, planMinutes, planType } from "../plans"
import { WORKOUTS } from "../program"
import {
  PHASE_NAME,
  WORKOUT_TITLE,
  coverImage,
  durationMinutes,
  formatEnglish,
  homeWorkoutId,
  intensityLabel,
  isStrengthId,
  phaseLine,
} from "../present"

export function HomeScreen() {
  const { state, today, setSelected, setTab } = useApp()
  const spot = state.cycle ? cycleOn(today, state.cycle) : null
  const advice = spot ? adviceFor(spot, state.cycleDays[today]) : null
  const chosen = homeWorkoutId(state, today)
  const plan = chosen && isPlanRef(chosen) ? state.plans[chosen.slice(5)] : null
  const workout = chosen && isWorkoutId(chosen) ? WORKOUTS[chosen] : null
  const exercises = plan ? exercisesFromPlan(plan) : workout ? sessionOrder(sessionExercises(workout.id, state.extras)) : []
  const photo = exercises.find((exercise) => exercise.image)?.image ?? (workout ? coverImage(workout) : null) ?? "/session-hero.jpg"
  const supports =
    spot && workout
      ? isStrengthId(workout.id)
        ? advice?.gym === "yes"
        : advice?.swim === "yes"
      : false
  const ready = Boolean(workout || plan)

  return (
    <main className="screen home-screen">
      <header className="home-bar">
        <img className="brand-mark" src="/ava-logo.png" alt="AVA" />
        <PageMenu />
      </header>
      <h1>Good morning, Tamires</h1>
      <p className="home-date">{formatEnglish(today)}</p>

      <article className="session-hero home-hero">
        <img src={photo} alt="" />
        <div className="session-hero-shade" />
        <div className="session-hero-copy">
          <p className="eyebrow">Today's training</p>
          {supports && spot ? <p className="recommend">Recommended for your {PHASE_NAME[spot.phase].toLowerCase()} phase</p> : null}
          <h3>{plan ? plan.name : workout ? WORKOUT_TITLE[workout.id] : "Recovery"}</h3>
          {ready ? (
            <SessionFacts
              minutes={plan ? planMinutes(plan) : durationMinutes(workout!, state.extras)}
              count={exercises.length}
              type={plan ? planType(plan) : intensityLabel(workout!.id)}
            />
          ) : (
            <p>Rest is the plan for today.</p>
          )}
        </div>
        {ready ? (
          <PlayButton
            label="Start workout"
            onClick={() => {
              setSelected(today)
              setTab("training")
            }}
          />
        ) : null}
      </article>

      <section className="cycle-hero">
        {spot && advice ? (
          <>
            <p className="eyebrow">Day {spot.day}</p>
            <h2>{PHASE_NAME[spot.phase]} phase</h2>
            <p>{phaseLine(spot.phase, spot.lateLuteal)}</p>
          </>
        ) : (
          <>
            <p className="eyebrow">Cycle</p>
            <h2>Record your cycle</h2>
            <p>Once the dates are in, today can show the phase and a training note. Nothing is estimated until then.</p>
          </>
        )}
        <button type="button" className="text-link" onClick={() => setTab("cycle")}>
          View cycle
        </button>
      </section>

      <button type="button" className="primary home-add" onClick={() => setTab("build")}>
        Add a training
      </button>
    </main>
  )
}
