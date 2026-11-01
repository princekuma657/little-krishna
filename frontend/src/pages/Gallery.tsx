import { CONTENT } from '../data/content';
import { Media } from '../components/Media';
import { StateBlock } from '../components/ui';
import { Link } from 'react-router-dom';

export function Gallery() {
  const galleryItems = CONTENT.filter((c) => c.category === 'gallery');

  return (
    <>
      <section className="page-head">
        <div className="container">
          <div className="crumbs">
            <Link to="/">Home</Link>
            <span>/</span>
            <span>Gallery</span>
          </div>
          <span className="eyebrow">Photography</span>
          <h1>Railway Gallery</h1>
          <p className="section-sub" style={{ marginTop: 22 }}>
            Captures, studies and artwork from the LittleKrishna community.
          </p>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          {galleryItems.length === 0 ? (
            <StateBlock title="Gallery empty" body="New gallery submissions will appear here." />
          ) : (
            <div className="grid grid--3">
              {galleryItems.map((g) => (
                <article className="card" key={g.id}>
                  <div className="card__media">
                    <Media art={g.art} label={g.title} />
                  </div>
                  <div className="card__body">
                    <h3 className="card__title">{g.title}</h3>
                    <p style={{ marginTop: 10, color: 'var(--ink-on-dark)', fontSize: 14 }}>{g.author}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
          <div style={{ marginTop: 60, textAlign: 'center' }}>
            <Link className="btn btn--outline" to="/community">
              Community Submissions
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
