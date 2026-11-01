import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CONTENT, fmtDate, SITE } from '../../data/content';

export function FeaturedRelease() {
  const ref = useRef<HTMLElement>(null);
  const featured = CONTENT.find((c) => c.featured && c.status === 'published') ?? CONTENT[0];

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.registerPlugin(ScrollTrigger);
      gsap.fromTo(
        '.featured-media > *',
        { scale: 0.94, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 1.3,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.featured-media', start: 'top 80%' },
        },
      );
      gsap.fromTo(
        '.featured-body > *',
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.featured-body', start: 'top 82%' },
        },
      );
    }, ref);
    return () => ctx.revert();
  }, [featured.slug]);

  return (
    <section className="section" ref={ref}>
      <div className="container">
        <div className="featured">
          <div className="featured-media">
            <div
              className="media"
              style={{ position: 'absolute', inset: 0, background: `linear-gradient(140deg, ${featured.art.from}, ${featured.art.to})` }}
            >
              <div style={{ position: 'absolute', inset: 0, background: featured.art.accent, opacity: 0.16 }} />
              <div className="media__label">{featured.title}</div>
            </div>
          </div>
          <div className="featured-body">
            <span className="eyebrow">Featured Release</span>
            <h2 className="featured__title">{featured.title}</h2>
            <p style={{ color: 'var(--ink-on-dark)', fontSize: 16 }}>{featured.shortDescription}</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span className="badge badge--red">{featured.simulator}</span>
              <span className="badge">v{featured.version}</span>
              <span className="badge">{fmtDate(featured.releaseDate)}</span>
            </div>
            <div style={{ marginTop: 8 }}>
              <Link className="btn btn--primary" to={`/content/${featured.slug}`}>
                Explore Release
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
