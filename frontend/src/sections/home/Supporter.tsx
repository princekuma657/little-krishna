import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { CONTENT } from '../../data/content';
import { NEUTRAL_ART } from '../../components/Media';

export function Supporter() {
  const exclusive = CONTENT.filter((c) => c.accessType === 'supporter').slice(0, 3);

  return (
    <section className="section supporter">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">The Supporter Zone</span>
          <h2 className="section-title">Behind The Scenes.</h2>
          <p className="section-sub">
            Exclusive content for supporters of LittleKrishna — unreleased routes, workshop tools and developer
            commentary.
          </p>
        </div>
        <div className="grid grid--3">
          {exclusive.map((c) => (
            <Link className="card" to={`/content/${c.slug}`} key={c.id}>
              <div className="card__media">
                <div className="media" style={{ aspectRatio: '16 / 10', background: NEUTRAL_ART }}>
                  <div className="media__label">{c.title}</div>
                </div>
              </div>
              <div className="card__body">
                <h3 className="card__title">{c.title}</h3>
                <p style={{ marginTop: 12, color: 'var(--ink-on-dark)', fontSize: 14 }}>{c.shortDescription}</p>
                <div style={{ marginTop: 16 }}>
                  <span className="badge badge--gold">{c.accessType}</span>
                </div>
                <span className="card__link">
                  Supporter Access
                  <ArrowUpRight size={14} />
                </span>
              </div>
            </Link>
          ))}
        </div>
        <div className="token-box">
          <h3 style={{ fontSize: 26 }}>Support The Workshop</h3>
          <p style={{ marginTop: 12, color: 'var(--ink-on-dark)', maxWidth: 640 }}>
            Become a LittleKrishna supporter to unlock exclusive routes, workshop tools and early development
            releases. Tokens are issued by the team and never sold through the platform.
          </p>
          <div style={{ marginTop: 26, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <Link className="btn btn--gold" to="/supporter">
              Enter Supporter Zone
            </Link>
            <Link className="btn btn--outline" to="/releases">
              Latest Releases
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
