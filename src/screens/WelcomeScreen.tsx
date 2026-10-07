export function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <section className="welcome">
      <img className="welcome-photo" src="/welcome.jpg" alt="" />
      <div className="welcome-shade" />
      <div className="welcome-glow" />
      <div className="welcome-copy">
        <img className="welcome-logo" src="/ava-logo.png" alt="AVA" />
      </div>
      <button type="button" className="welcome-go" onClick={onStart}>
        Get started
      </button>
    </section>
  )
}
