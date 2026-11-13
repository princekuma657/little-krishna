import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

const TAGLINE = 'Indian Railway Simulation';
const MARK = [
  { text: 'LITTLE' },
  { text: 'KRISHNA' },
];
const MARQUEE = 'MSTS · RAILWORKS · TRAIN SIMULATOR CLASSIC · INDIAN RAILWAY SIMULATION';

/** Hand the reveal to the site once the black canvas is cleared. */
export function revealCanvas() {
  // Kill the dark pre-paint (style attribute + head style block) and restore
  // the light canvas before the iris opens.
  document.querySelector('#intro-canvas')?.remove();
  document.documentElement.style.background = '';
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.setAttribute('content', '#f4f4ed');
}

export function CinematicIntro({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const finishedRef = useRef(false);
  const [visible, setVisible] = useState(true);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setVisible(false);
    revealCanvas();
    // Deferred one tick so listeners (Hero entrance) are already mounted.
    window.setTimeout(() => window.dispatchEvent(new Event('littlekrishna:intro-done')), 0);
    onDone();
  };

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish();
      return;
    }

    const ctx = gsap.context(() => {
      const letters = gsap.utils.toArray<HTMLElement>('.intro__letter');
      const tl = gsap.timeline({
        defaults: { ease: 'power4.out' },
        onComplete: finish,
      });

      // 1 — typography rises out of the black, one letter at a time
      tl.fromTo(
        letters,
        { yPercent: 118 },
        { yPercent: 0, duration: 1.5, stagger: 0.07 },
        0.2,
      )
        // 2 — accent rule sweeps open
        .fromTo(
          '.intro__rule',
          { scaleX: 0 },
          { scaleX: 1, duration: 1.1, ease: 'power3.inOut' },
          1.0,
        )
        // 3 — tagline and meta settle in
        .fromTo(
          '.intro__tagline',
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 1.0, ease: 'power3.out' },
          1.3,
        )
        .fromTo(
          '.intro__corner',
          { opacity: 0 },
          { opacity: 1, duration: 0.9, stagger: 0.15, ease: 'power2.out' },
          1.5,
        )
        // 4 — chrome fades up (skip button, bottom marquee)
        .to('.intro__skip', { opacity: 1, duration: 0.7, ease: 'power2.out' }, 1.8)
        .to('.intro__marquee', { opacity: 1, duration: 0.7, ease: 'power2.out' }, 1.7)
        // 5 — hold the frame, brief and confident
        .to({}, { duration: 0.8 }, '+=0.1')
        // 6 — outro: inner layer collapses, then the black iris closes
        .to(
          ['.intro__tagline', '.intro__rule', '.intro__mark'],
          { opacity: 0, y: -16, duration: 0.6, ease: 'power3.in', stagger: 0.06 },
          '+=0',
        )
        .to(
          ['.intro__corner', '.intro__skip', '.intro__marquee'],
          { opacity: 0, duration: 0.5, ease: 'power2.in' },
          '<',
        )
        .to(
          '.intro',
          { clipPath: 'circle(0% at 50% 47%)', duration: 1.2, ease: 'power3.inOut' },
          '-=0.2',
        );

      // Skip via Escape as well as the on-screen button.
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') finish();
      };
      window.addEventListener('keydown', onKey);
      // Never trap the user in the intro.
      const safety = window.setTimeout(finish, 6000);

      return () => {
        window.removeEventListener('keydown', onKey);
        window.clearTimeout(safety);
      };
    }, ref);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  return (
    <div className="intro" ref={ref} role="presentation">
      <div className="intro__inner">
        <div className="intro__mark" aria-label="LittleKrishna">
          {MARK.map((word) => (
            <span className="intro__word" key={word.text} aria-hidden>
              {word.text.split('').map((ch, i) => (
                <span className="intro__mask" key={`${word.text}-${i}`}>
                  <span className="intro__letter">{ch}</span>
                </span>
              ))}
            </span>
          ))}
        </div>
        <span className="intro__rule" aria-hidden />
        <div className="intro__tagline">{TAGLINE}</div>
      </div>
      <span className="intro__corner intro__corner--tl">MSTS · RailWorks · TSC</span>
      <span className="intro__corner intro__corner--br">MMXXVI</span>
      <button className="intro__skip" type="button" onClick={finish}>
        Skip
      </button>
      <div className="intro__marquee" aria-hidden>
        <div className="intro__marquee-track">
          <span>{MARQUEE}</span>
          <span>{MARQUEE}</span>
        </div>
      </div>
    </div>
  );
}
