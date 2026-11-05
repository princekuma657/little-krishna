import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowUpRight } from 'lucide-react';
import { CREATORS } from '../../data/content';
import { NEUTRAL_ART } from '../../components/Media';

export function BeyondTheTracks() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.registerPlugin(ScrollTrigger);
      gsap.fromTo(
        '.creator-card',
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.creator-card', start: 'top 88%' },
        },
      );
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section className="section" ref={ref}>
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Beyond The Tracks</span>
          <h2 className="section-title">Stories From The Workshop.</h2>
          <p className="section-sub">
            Development stories, community projects and behind-the-scenes content from Indian railway simulation
            creators.
          </p>
        </div>
        <div className="grid grid--3">
          {CREATORS.map((c) => (
            <article className="card creator-card" key={c.id}>
              <div className="card__media">
                <div className="media" style={{ aspectRatio: '16 / 10', background: NEUTRAL_ART }}>
                  <div className="media__label">{c.projectTitle}</div>
                </div>
              </div>
              <div className="card__body">
                <h3 className="card__title">{c.name}</h3>
                <p style={{ marginTop: 8, color: 'var(--silver)', fontSize: 13 }}>{c.handle}</p>
                <p style={{ marginTop: 12, fontSize: 14, color: 'var(--ink-on-dark)' }}>{c.focus}</p>
                <div style={{ marginTop: 16 }}>
                  <span className="badge">{c.simulator}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
        <div style={{ marginTop: 48, textAlign: 'center' }}>
          <Link className="btn btn--outline" to="/community">
            Community Showcase <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
