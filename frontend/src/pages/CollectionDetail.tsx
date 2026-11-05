import { Link, useParams } from 'react-router-dom';
import { COLLECTIONS, CONTENT } from '../data/content';
import { StateBlock } from '../components/ui';
import { NEUTRAL_ART } from '../components/Media';

export function CollectionDetail() {
  const { slug } = useParams();
  const collection = COLLECTIONS.find((c) => c.slug === slug);

  if (!collection) {
    return (
      <section className="section">
        <div className="container">
          <StateBlock title="Collection not found" body="This collection may have been unpublished." />
        </div>
      </section>
    );
  }

  const items = collection.itemSlugs
    .map((s) => CONTENT.find((c) => c.slug === s))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <>
      <section className="page-head page-head--paper">
        <div className="container">
          <div className="crumbs">
            <Link to="/">Home</Link>
            <span>/</span>
            <Link to="/routes">Routes</Link>
            <span>/</span>
            <span>{collection.title}</span>
          </div>
          <span className="eyebrow">Collection</span>
          <h1>{collection.title}</h1>
          <p className="section-sub" style={{ marginTop: 22 }}>{collection.description}</p>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="grid grid--3 mosaic">
            {items.map((c) => (
              <Link className="card" to={`/content/${c.slug}`} key={c.id}>
                <div className="card__media">
                  <div className="media" style={{ aspectRatio: '16 / 10', background: NEUTRAL_ART }}>
                    <div className="media__label">{c.title}</div>
                  </div>
                </div>
                <div className="card__body">
                  <h3 className="card__title">{c.title}</h3>
                  <p style={{ marginTop: 10, color: 'var(--ink-on-dark)', fontSize: 14 }}>{c.shortDescription}</p>
                  <span className="card__link">Open Content</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
