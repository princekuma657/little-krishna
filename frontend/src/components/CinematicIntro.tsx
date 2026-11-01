import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const TAGLINE = 'Indian Railway Simulation';

export function CinematicIntro({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  const finish = () => {
    setVisible(false);
    onDone();
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish();
      return;
    }
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: finish });
      tl.fromTo(
        '.intro__wordmark',
        { yPercent: 60, opacity: 0, letterSpacing: '0.5em' },
        { yPercent: 0, opacity: 1, letterSpacing: '0.2em', duration: 1.4, ease: 'power4.out' },
        0,
      );
      tl.fromTo('.intro__tagline', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1, ease: 'power2.out', delay: 0.7 }, 0.8);
      tl.to('.intro', { yPercent: -100, duration: 1.1, delay: 2.2, ease: 'power4.inOut' }, 2.6);
    }, ref);
    return () => ctx.revert();
  }, [onDone]);

  if (!visible) return null;

  const MARQUEE = 'MSTS · RAILWORKS · TRAIN SIMULATOR CLASSIC · INDIAN RAILWAY SIMULATION';

  return (
    <div className="intro" ref={ref} role="presentation">
      <div className="intro__inner">
        <div className="intro__wordmark">Little<span>Krishna</span></div>
        <div className="intro__tagline">{TAGLINE}</div>
      </div>
      <div className="intro__marquee" aria-hidden>
        <div className="intro__marquee-track">
          <span>{MARQUEE}</span>
          <span>{MARQUEE}</span>
        </div>
      </div>
    </div>
  );
}
