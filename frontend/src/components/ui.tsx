import type { ReactNode } from 'react';
import type { AccessType, ContentCollection, ContentItem } from '../types';
import { Link } from 'react-router-dom';

export function SectionHead({
  eyebrow,
  title,
  sub,
  center,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  center?: boolean;
}) {
  return (
    <div className={`section-head ${center ? 'section-head--center' : ''}`}>
      {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
      <h2 className="section-title">{title}</h2>
      {sub ? <p className="section-sub">{sub}</p> : null}
    </div>
  );
}

export function Badge({ kind, children }: { kind?: AccessType | 'published' | 'draft' | 'archived'; children: ReactNode }) {
  const variant = kind === 'supporter' ? 'badge--gold' : kind === 'restricted' || kind === 'draft' ? 'badge--red' : kind === 'registered' ? '' : 'badge--green';
  return <span className={`badge ${variant ?? ''}`}>{children}</span>;
}

export function StateBlock({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="state-block">
      <h3>{title}</h3>
      {body ? <p>{body}</p> : null}
      {action}
    </div>
  );
}

export function ContentCard({ item }: { item: ContentItem }) {
  return (
    <Link to={`/content/${item.slug}`} className="card">
      <div className="card__media">
        <div
          className="media"
          style={{
            aspectRatio: '16 / 10',
            background: item.coverImageUrl
              ? 'var(--midnight)'
              : `linear-gradient(140deg, ${item.art.from} 0%, ${item.art.to} 100%)`,
          }}
        >
          {item.coverImageUrl ? <div className="media__img" style={{ backgroundImage: `url(${item.coverImageUrl})` }} /> : null}
          {item.art.accent && !item.coverImageUrl ? <div style={{ position: 'absolute', inset: 0, background: item.art.accent, opacity: 0.14 }} /> : null}
          <div className="media__label">{item.categoryLabel}</div>
        </div>
      </div>
      <div className="card__body">
        <h3 className="card__title">{item.title}</h3>
        <p style={{ marginTop: 12, color: 'var(--ink-on-dark)', fontSize: 14 }}>{item.shortDescription}</p>
        <div className="card__meta">
          <Badge kind={item.accessType}>{item.accessType}</Badge>
          <span className="badge">{item.simulator}</span>
          <span className="badge">v{item.version}</span>
        </div>
        <span className="card__link">
          View Content
          <span aria-hidden>→</span>
        </span>
      </div>
    </Link>
  );
}

export function CollectionCard({ collection }: { collection: ContentCollection }) {
  return (
    <Link to={`/collection/${collection.slug}`} className="card">
      <div className="card__media">
        <div
          className="media"
          style={{
            aspectRatio: '16 / 10',
            background: `linear-gradient(140deg, ${collection.art.from} 0%, ${collection.art.to} 100%)`,
          }}
        >
          <div className="media__label">{collection.title}</div>
        </div>
      </div>
      <div className="card__body">
        <h3 className="card__title">{collection.title}</h3>
        <p style={{ marginTop: 12, color: 'var(--ink-on-dark)', fontSize: 14 }}>{collection.description}</p>
      </div>
    </Link>
  );
}
