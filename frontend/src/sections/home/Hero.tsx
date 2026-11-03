import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowDown } from 'lucide-react';
import { SITE } from '../../data/content';

export function Hero() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.registerPlugin(ScrollTrigger);
      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl.fromTo(
        '.hero__kicker',
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.9, delay: 0.15 },
      )
        .fromTo(
          '.hero__title',
          { yPercent: 55, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 1.5, ease: 'power4.out' },
          '-=0.4',
        )
        .fromTo(
          '.hero__sub',
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 1.1, ease: 'power3.out', delay: '-=0.8' },
          '-=0.5',
        )
        .fromTo(
          '.hero__cta > *',
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', stagger: 0.12, delay: '-=0.7' },
        );
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section className="hero" ref={ref}>
      <div className="hero__media" aria-hidden>
        <video
          className="hero__video"
          autoPlay
          muted
          playsInline
          loop
          preload="metadata"
          poster=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        >
          {import.meta.env.VITE_VIDEO_HERO ? <source src={import.meta.env.VITE_VIDEO_HERO} type="video/mp4" /> : null}
        </video>
        <div className="hero__art" style={{ background: 'linear-gradient(180deg, #262a20 0%, #1e2018 55%, #171914 100%)' }} />
        <div className="hero__veil" />
      </div>
      <div className="container hero__content">
        <span className="hero__kicker">MSTS · RailWorks · Train Simulator Classic</span>
        <h1 className="hero__title">
          Beyond The <em>Tracks.</em>
        </h1>
        <p className="hero__sub">{SITE.heroSub}</p>
        <div className="hero__cta">
          <Link className="btn btn--primary btn--lg" to="/routes">
            {SITE.ctaPrimary}
          </Link>
          <Link className="btn btn--outline btn--lg" to="/the-railways">
            {SITE.ctaSecondary}
          </Link>
        </div>
      </div>
      <div className="scroll-indicator">
        <span>Scroll</span>
        <ArrowDown size={14} />
      </div>
    </section>
  );
}
