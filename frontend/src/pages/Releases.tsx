import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { CONTENT } from '../data/content';
import { Badge, StateBlock } from '../components/ui';

export function Releases() {
  const releases = [...CONTENT].filter((c) => c.status === 'published').sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));

  return (
    <>
      <section className="page-head page-head--paper">
        <div className="container">
          <div className="crumbs">
            <Link to="/">Home</Link>
            <span>/</span>
            <span>Releases</span>
          </div>
          <span className="eyebrow">Latest</span>
          <h1>Releases</h1>
          <p className="section-sub" style={{ marginTop: 22 }}>
            The newest railway simulation content from LittleKrishna and our creator network.
          </p>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          {releases.length === 0 ? (
            <StateBlock title="No releases" body="Check back soon." />
          ) : (
            <div className="grid grid--2 mosaic">
              {releases.map((r) => (
                <Link className="card" to={`/content/${r.slug}`} key={r.id}>
                  <div className="card__media">
                    <div className="media" style={{ aspectRatio: '16 / 10', background: `linear-gradient(140deg, ${r.art.from}, ${r.art.to})` }}>
                      <div className="media__label">{r.title}</div>
                    </div>
                  </div>
                  <div className="card__body">
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                      <Badge kind={r.accessType}>{r.accessType}</Badge>
                      <span className="badge">{r.simulator}</span>
                      <span className="badge">v{r.version}</span>
                    </div>
                    <h3 className="card__title">{r.title}</h3>
                    <p style={{ marginTop: 12, color: 'var(--ink-on-dark)', fontSize: 14 }}>{r.releaseNotes}</p>
                    <p style={{ marginTop: 14, fontSize: 12, color: 'var(--silver-2)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                      Released {r.releaseDate}
                    </p>
                    <span className="card__link">
                      View Release
                      <ArrowUpRight size={14} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
