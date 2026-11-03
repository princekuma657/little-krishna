import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function BrandStory() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.registerPlugin(ScrollTrigger);
      gsap.fromTo(
        '.story-media',
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1.2,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.story-media', start: 'top 82%' },
        },
      );
      gsap.fromTo(
        '.story-copy > *',
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.story-copy', start: 'top 80%' },
        },
      );
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section className="section section--paper" ref={ref}>
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'clamp(40px, 6vw, 90px)',
            alignItems: 'center',
          }}
          className="story-grid"
        >
          <div className="story-media">
            <div
              className="media"
              style={{ aspectRatio: '4 / 5', background: 'linear-gradient(150deg, #3d4232 0%, #262a1e 100%)' }}
            >
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(210,255,0,0.12)' }} />
              <div className="media__label">The Iron Road</div>
            </div>
          </div>
          <div className="story-copy">
            <span className="eyebrow">The Platform</span>
            <h2 className="section-title" style={{ fontSize: 'clamp(38px, 4.6vw, 64px)' }}>
              Every Journey Has A Story.
            </h2>
            <p style={{ marginTop: 24, color: 'var(--ink-on-dark)', fontSize: 17 }}>
              LittleKrishna began as a small workshop of railway dreamers. We build cinematic Indian railway
              simulation content for MSTS and Train Simulator Classic, then hand the keys to the community that
              keeps the subcontinent's railways moving in imagination.
            </p>
            <p style={{ marginTop: 16, color: 'var(--ink-on-dark)', fontSize: 17 }}>
              From the Great Indian Peninsula Railway to the modern high-speed corridors, every route carries a
              human story. Ours is to keep those stories driving forward.
            </p>
            <Link className="btn btn--outline" to="/the-railways" style={{ marginTop: 30 }}>
              Read The Railway Story
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
