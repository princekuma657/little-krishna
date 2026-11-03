import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CONTENT, CATEGORIES } from '../data/content';
import { ContentCard } from '../components/ui';
import { StateBlock } from '../components/ui';

const KIND_TO_CATEGORY: Record<string, string> = {
  route: 'routes',
  train: 'trains',
};

export function Catalog({ kind }: { kind: string }) {
  const category = KIND_TO_CATEGORY[kind] ?? 'routes';
  const [simulator, setSimulator] = useState('all');

  const items = useMemo(
    () =>
      CONTENT.filter(
        (c) => c.category === category && c.status === 'published' && (simulator === 'all' || c.simulator === simulator),
      ),
    [category, simulator],
  );

  const heading = kind === 'train' ? 'Trains' : 'Routes';
  const sub = kind === 'train' ? 'Passenger, freight and special express services.' : 'Curated routes across the Indian subcontinent.';

  return (
    <>
      <section className="page-head page-head--paper">
        <div className="container">
          <div className="crumbs">
            <Link to="/">Home</Link>
            <span>/</span>
            <span>{heading}</span>
          </div>
          <span className="eyebrow">Content</span>
          <h1>{heading}</h1>
          <p className="section-sub" style={{ marginTop: 22 }}>{sub}</p>
          <div style={{ marginTop: 30, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {['all', 'MSTS', 'RailWorks', 'Train Simulator Classic'].map((s) => (
              <button key={s} className={`btn ${simulator === s ? 'btn--primary' : 'btn--outline'} btn--sm`} onClick={() => setSimulator(s)}>
                {s === 'all' ? 'All Simulators' : s}
              </button>
            ))}
          </div>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          {items.length === 0 ? (
            <StateBlock title="No content found" body="Try a different simulator filter." />
          ) : (
            <div className="grid grid--3 mosaic">
              {items.map((c) => (
                <ContentCard key={c.id} item={c} />
              ))}
            </div>
          )}
          <div style={{ marginTop: 60 }}>
            <h3 style={{ fontSize: 20, marginBottom: 18 }}>Categories</h3>
            <div className="grid grid--3">
              {CATEGORIES.filter((c) => ['routes', 'trains', 'locomotives', 'assets'].includes(c.slug)).map((c) => (
                <div key={c.slug} style={{ border: '1px solid var(--line)', background: 'var(--charcoal)', padding: 22 }}>
                  <h4 style={{ fontSize: 18 }}>{c.label}</h4>
                  <p style={{ marginTop: 10, color: 'var(--ink-on-dark)', fontSize: 14 }}>{c.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
