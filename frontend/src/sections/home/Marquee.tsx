const PHRASE = 'Indian Railway Simulation · MSTS · RailWorks · Train Simulator Classic · Routes · Locomotives · Community · ';

/**
 * Decorative marquee band (reference: cinematic brand ticker).
 * Purely presentational — aria-hidden, reduced-motion disables it globally.
 */
export function HomeMarquee() {
  return (
    <section className="band" aria-hidden>
      <div className="band__track">
        <span>{PHRASE.repeat(3)}</span>
        <span>{PHRASE.repeat(3)}</span>
      </div>
    </section>
  );
}
