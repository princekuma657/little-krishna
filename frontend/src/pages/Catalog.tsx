import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CONTENT, CATEGORIES } from '../data/content';
import { ContentCard } from '../components/ui';
import { StateBlock } from '../components/ui';
import { Badge } from '../components/ui';
import { Search, SlidersHorizontal, Grid3x3, List, ArrowUpDown } from 'lucide-react';

const KIND_TO_CATEGORY: Record<string, string> = {
  route: 'routes',
  train: 'trains',
};

type SortKey = 'newest' | 'name' | 'popular';

export function Catalog({ kind }: { kind: string }) {
  const category = KIND_TO_CATEGORY[kind] ?? 'routes';
  const [simulator, setSimulator] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  const items = useMemo(() => {
    let filtered = CONTENT.filter(
      (c) => c.category === category && c.status === 'published' && (simulator === 'all' || c.simulator === simulator),
    );
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((c) => c.title.toLowerCase().includes(q) || c.shortDescription.toLowerCase().includes(q));
    }
    const sorted = [...filtered];
    if (sort === 'name') sorted.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === 'newest') sorted.sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
    else if (sort === 'popular') sorted.sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0));
    return sorted;
  }, [category, simulator, search, sort]);

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

          {/* Search + Sort toolbar */}
          <div style={{ marginTop: 30, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 260px', minWidth: 200 }}>
              <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--silver)', pointerEvents: 'none' }} />
              <input
                className="input"
                type="search"
                placeholder={`Search ${heading.toLowerCase()}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: 40 }}
              />
            </div>
            <select className="input" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} style={{ flex: '0 1 160px', cursor: 'pointer' }}>
              <option value="newest">Newest first</option>
              <option value="name">Name A–Z</option>
              <option value="popular">Most popular</option>
            </select>
            <button className={`btn ${view === 'grid' ? 'btn--primary' : 'btn--outline'} btn--sm`} onClick={() => setView('grid')} title="Grid view" style={{ padding: '0 12px' }}>
              <Grid3x3 size={16} />
            </button>
            <button className={`btn ${view === 'list' ? 'btn--primary' : 'btn--outline'} btn--sm`} onClick={() => setView('list')} title="List view" style={{ padding: '0 12px' }}>
              <List size={16} />
            </button>
            <button className="btn btn--outline btn--sm" onClick={() => setShowFilters(!showFilters)} title="Filters" style={{ padding: '0 12px' }}>
              <SlidersHorizontal size={16} />
            </button>
          </div>

          {/* Simulator filter chips */}
          <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
          {showFilters && (
            <div style={{ marginBottom: 30, padding: 20, border: '1px solid var(--line)', background: 'var(--charcoal)', borderRadius: 8 }}>
              <h4 style={{ fontSize: 14, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Filters</h4>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--silver)' }}>Access:</span>
                <span className="badge">Public</span>
                <span className="badge badge--gold">Supporter</span>
                <span style={{ fontSize: 13, color: 'var(--silver)', marginLeft: 12 }}>Showing {items.length} of {CONTENT.filter(c => c.category === category && c.status === 'published').length} items</span>
              </div>
            </div>
          )}

          {items.length === 0 ? (
            <StateBlock title="No content found" body={search ? `No results for "${search}". Try a different search.` : 'Try a different simulator filter.'} />
          ) : view === 'grid' ? (
            <div className="grid grid--3 mosaic">
              {items.map((c) => (
                <ContentCard key={c.id} item={c} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {items.map((c) => (
                <Link key={c.id} to={`/content/${c.slug}`} className="card" style={{ display: 'flex', gap: 16, alignItems: 'center', padding: 12 }}>
                  <div style={{ width: 120, height: 75, flexShrink: 0, background: c.coverImageUrl ? 'var(--midnight)' : 'var(--charcoal-3)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                    {c.coverImageUrl ? <div className="media__img" style={{ backgroundImage: `url(${c.coverImageUrl})` }} /> : null}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 className="card__title" style={{ fontSize: 16 }}>{c.title}</h3>
                    <p style={{ marginTop: 4, color: 'var(--ink-on-dark)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.shortDescription}</p>
                    <div className="card__meta" style={{ marginTop: 6 }}>
                      <Badge kind={c.accessType}>{c.accessType}</Badge>
                      <span className="badge">{c.simulator}</span>
                    </div>
                  </div>
                  <span className="card__link" style={{ flexShrink: 0 }}>View →</span>
                </Link>
              ))}
            </div>
          )}

          <div style={{ marginTop: 60 }}>
            <h3 style={{ fontSize: 20, marginBottom: 18 }}>Categories</h3>
            <div className="grid grid--3">
              {CATEGORIES.filter((c) => ['routes', 'trains', 'locomotives', 'assets'].includes(c.slug)).map((c) => (
                <div key={c.slug} style={{ border: '1px solid var(--line)', background: 'var(--charcoal)', padding: 22, borderRadius: 8 }}>
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