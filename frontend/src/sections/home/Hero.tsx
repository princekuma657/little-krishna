import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowDown } from 'lucide-react';
import { SITE } from '../../data/content';
import heroPhoto from '../../assets/home/home-photo-8.jpeg';

export function Hero() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = gsap.context(() => {
      gsap.registerPlugin(ScrollTrigger);

      // immediateRender: false keeps the DOM at its CSS-default (visible)
      // state while the timeline sits paused — the hero can never be left
      // stranded invisible/overlapping if the intro hands over late.
      const tl = gsap.timeline({ defaults: { ease: 'power4.out' }, paused: true });
      tl.fromTo(
        '.hero__kicker',
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.9, delay: 0.15, immediateRender: false },
      )
        .fromTo(
          '.hero__title',
          { yPercent: 55, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 1.5, ease: 'power4.out', immediateRender: false },
          '-=0.4',
        )
        .fromTo(
          '.hero__sub',
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 1.1, ease: 'power3.out', immediateRender: false },
          '-=0.5',
        )
        .fromTo(
          '.hero__cta > *',
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', stagger: 0.12, immediateRender: false },
          '-=0.7',
        );

      let played = false;
      const play = () => {
        if (played) return;
        played = true;
        if (reduced) tl.progress(1);
        else tl.play();
      };

      // Subtle controlled drift as the hero scrolls away (scrub-bound, no bounce).
      gsap.to('.hero__content', {
        yPercent: 7,
        opacity: 0.4,
        ease: 'none',
        scrollTrigger: {
          trigger: ref.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });

      // Hold entrance until the cinematic intro has handed over.
      if (!document.querySelector('.intro')) {
        play();
        return;
      }
      const onIntroDone = () => {
        window.removeEventListener('littlekrishna:intro-done', onIntroDone);
        play();
      };
      window.addEventListener('littlekrishna:intro-done', onIntroDone);
      // Safety net: the entrance can never stay locked behind a stuck intro.
      const fallback = window.setTimeout(play, 6500);
      return () => {
        window.removeEventListener('littlekrishna:intro-done', onIntroDone);
        window.clearTimeout(fallback);
      };
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
        <div className="hero__art" style={{ backgroundImage: `url(${heroPhoto})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="hero__veil" style={{ background: 'linear-gradient(180deg, rgba(8,8,8,0.45) 0%, rgba(8,8,8,0.62) 55%, rgba(8,8,8,0.88) 100%)' }} />
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
