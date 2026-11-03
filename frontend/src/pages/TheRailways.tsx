import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

export function TheRailways() {
  return (
    <>
      <section className="page-head page-head--paper">
        <div className="container">
          <div className="crumbs">
            <Link to="/">Home</Link>
            <span>/</span>
            <span>The Railways</span>
          </div>
          <span className="eyebrow">The Platform</span>
          <h1>The Railway Story</h1>
          <p className="section-sub" style={{ marginTop: 22 }}>
            LittleKrishna is a home for Indian railway simulation — built by enthusiasts, maintained by the
            community, and dedicated to the moving stories of the subcontinent.
          </p>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="grid grid--2" style={{ alignItems: 'start' }}>
            <div>
              <h2 className="section-title" style={{ fontSize: 'clamp(30px, 3.6vw, 48px)' }}>Our Purpose</h2>
              <p style={{ marginTop: 20, color: 'var(--ink-on-dark)', fontSize: 16 }}>
                Indian railways carry more than a billion passenger journeys a year. Yet for simulation
                enthusiasts, the subcontinent has long been a frontier — a place of majestic metre-gauge lines, hill
                railways and high-speed corridors waiting to be driven.
              </p>
              <p style={{ marginTop: 16, color: 'var(--ink-on-dark)', fontSize: 16 }}>
                LittleKrishna curates author-made content for MSTS and Train Simulator Classic, publishes releases
                with honest metadata, and keeps the community feed of creators alive.
              </p>
            </div>
            <div>
              <h2 className="section-title" style={{ fontSize: 'clamp(30px, 3.6vw, 48px)' }}>What We Build</h2>
              <ul style={{ margin: '20px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 16 }}>
                {[
                  ['Routes', 'End-to-end Indian railway routes with full scenery and operations data.'],
                  ['Traction', 'Steam, diesel and electric locomotives recreated by community authors.'],
                  ['Community', 'Development stories, showcases and fan projects from the scene.'],
                  ['Support', 'Supporter-exclusive releases and workshop tools.'],
                ].map(([t, d]) => (
                  <li key={t} style={{ borderBottom: '1px solid var(--line)', paddingBottom: 16 }}>
                    <strong style={{ fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t}</strong>
                    <div style={{ color: 'var(--ink-on-dark)', marginTop: 6, fontSize: 14 }}>{d}</div>
                  </li>
                ))}
              </ul>
              <Link className="btn btn--primary" to="/routes" style={{ marginTop: 34 }}>
                Start Exploring <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
