import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { COMMUNITY_SUBMISSIONS, CREATORS } from '../../data/content';

export function Community() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.registerPlugin(ScrollTrigger);
      gsap.fromTo(
        '.community-card',
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.community-card', start: 'top 88%' },
        },
      );
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section className="section section--alt" ref={ref}>
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Community</span>
          <h2 className="section-title">Built By Enthusiasts.</h2>
          <p className="section-sub">
            Featured creators, community screenshots and development stories from the Indian railway simulation
            scene.
          </p>
        </div>
        <div className="grid grid--3">
          {CREATORS.map((c) => (
            <article className="card community-card" key={c.id}>
              <div className="card__media">
                <div className="media" style={{ aspectRatio: '16 / 10', background: `linear-gradient(140deg, ${c.art.from}, ${c.art.to})` }}>
                  <div className="media__label">{c.projectTitle}</div>
                </div>
              </div>
              <div className="card__body">
                <h3 className="card__title">{c.name}</h3>
                <p style={{ marginTop: 8, color: 'var(--silver)', fontSize: 13 }}>{c.handle}</p>
                <p style={{ marginTop: 12, fontSize: 14, color: 'var(--ink-on-dark)' }}>{c.focus}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="grid grid--3" style={{ marginTop: 28 }}>
          {COMMUNITY_SUBMISSIONS.map((s) => (
            <article className="card community-card" key={s.id}>
              <div className="card__media">
                <div className="media" style={{ aspectRatio: '16 / 10', background: `linear-gradient(140deg, ${s.art.from}, ${s.art.to})` }}>
                  <div className="media__label">{s.title}</div>
                </div>
              </div>
              <div className="card__body">
                <h3 className="card__title">{s.title}</h3>
                <p style={{ marginTop: 8, color: 'var(--silver)', fontSize: 13 }}>by {s.author}</p>
                <div style={{ marginTop: 12 }}>
                  <span className="badge">{s.simulator}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
