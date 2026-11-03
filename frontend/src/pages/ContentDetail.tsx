import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CONTENT, fmtMb } from '../data/content';
import { useAuth } from '../context/AuthContext';
import { api, displayError } from '../services/api';
import { Badge, StateBlock } from '../components/ui';
import { Media } from '../components/Media';
import { CheckCircle2, Download, FileWarning, ShieldAlert } from 'lucide-react';

interface AuthorizeResponse {
  downloadId: string;
  url: string;
  expiresAt: string;
  content: { id: string; title: string; slug: string; version: string; fileSizeMb: number | null };
}

export function ContentDetail() {
  const { slug } = useParams();
  const { user, status, entitlements } = useAuth();
  const item = useMemo(() => CONTENT.find((c) => c.slug === slug), [slug]);
  const [phase, setPhase] = useState<'idle' | 'authorizing' | 'authorized'>('idle');
  const [download, setDownload] = useState<AuthorizeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!item) {
    return (
      <section className="section">
        <div className="container">
          <StateBlock
            title="Content not found"
            body="The content you are looking for has been unpublished or the link is incorrect."
            action={<Link className="btn btn--primary" to="/routes">Back To Content</Link>}
          />
        </div>
      </section>
    );
  }

  const hasSupporterEntitlement = entitlements.includes(item.slug);
  const requiresSupporter = item.accessType === 'supporter';
  const accessAllowed = !requiresSupporter || hasSupporterEntitlement;
  const hasFile = item.hasDownload !== false;
  const categoryHref = item.category === 'trains' ? '/trains' : item.category === 'routes' ? '/routes' : '/releases';

  const startDownload = async () => {
    if (!user || !accessAllowed) {
      setError('You must be signed in and authorized to download this content.');
      return;
    }
    setPhase('authorizing');
    setError(null);
    try {
      const res = await api.post<AuthorizeResponse>('/downloads/authorize', { contentId: item.id });
      setDownload(res);
      setPhase('authorized');
    } catch (e) {
      setPhase('idle');
      setError(displayError(e));
    }
  };

  return (
    <article className="detail">
      <div className="detail__cover">
        <div className="container">
          <div style={{ position: 'relative', zIndex: 2, width: '100%', paddingBottom: 60, background: 'linear-gradient(180deg, transparent, rgba(17,17,18,0.85))' }}>
            <div className="crumbs" style={{ marginBottom: 20 }}>
              <Link to="/">Home</Link>
              <span>/</span>
              <Link to={`${categoryHref}`}>{item.categoryLabel || 'Content'}</Link>
              <span>/</span>
              <span>{item.title}</span>
            </div>
            <h1 className="detail__title">{item.title}</h1>
          </div>
        </div>
        <div className="media" style={{ position: 'absolute', inset: 0, background: `linear-gradient(140deg, ${item.art.from}, ${item.art.to})` }}>
          <div style={{ position: 'absolute', inset: 0, background: item.art.accent, opacity: 0.16 }} />
        </div>
      </div>

      <div className="container detail__layout">
        <div>
          <Badge kind={item.accessType}>{item.accessType}</Badge>
          <h2 style={{ fontSize: 'clamp(22px, 2.4vw, 30px)', marginTop: 18 }}>{item.shortDescription}</h2>
          <p style={{ marginTop: 18, color: 'var(--ink-on-dark)', fontSize: 16, whiteSpace: 'pre-line' }}>{item.description}</p>

          {item.gallery.length > 0 ? (
            <div className="detail__gallery">
              {item.gallery.map((g, i) => (
                <Media key={i} art={g} ratio="4 / 3" />
              ))}
            </div>
          ) : null}

          <div style={{ marginTop: 44 }}>
            <h3 style={{ fontSize: 24, marginBottom: 18 }}>Release Notes</h3>
            <p style={{ color: 'var(--ink-on-dark)', fontSize: 15, whiteSpace: 'pre-line' }}>{item.releaseNotes || 'No release notes supplied.'}</p>
          </div>

          {item.sha256 ? (
            <div style={{ marginTop: 30 }}>
              <h3 style={{ fontSize: 16, marginBottom: 8 }}>SHA-256 Integrity</h3>
              <code style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--silver-2)', wordBreak: 'break-all' }}>{item.sha256}</code>
            </div>
          ) : null}
        </div>

        <aside className="info-panel">
          <h3>Content Details</h3>
          <dl>
            <div className="info-row"><dt>Simulator</dt><dd>{item.simulator}</dd></div>
            <div className="info-row"><dt>Package</dt><dd>{item.packageType}</dd></div>
            <div className="info-row"><dt>Category</dt><dd>{item.categoryLabel}</dd></div>
            <div className="info-row"><dt>Version</dt><dd>v{item.version}</dd></div>
            <div className="info-row"><dt>Released</dt><dd>{item.releaseDate}</dd></div>
            <div className="info-row"><dt>File Size</dt><dd>{fmtMb(item.fileSizeMb)}</dd></div>
            <div className="info-row"><dt>Author</dt><dd>{item.author}</dd></div>
          </dl>

          <div className="download-box">
            <div className="download-box__preview" style={{
              aspectRatio: '16 / 10',
              background: item.coverImageUrl
                ? `url(${item.coverImageUrl}) center/cover no-repeat, linear-gradient(140deg, ${item.art.from}, ${item.art.to})`
                : `linear-gradient(140deg, ${item.art.from}, ${item.art.to})`,
              borderRadius: 0,
              marginBottom: 14,
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid var(--line)',
            }}>
              <div style={{ position: 'absolute', inset: 0, background: item.art.accent, opacity: 0.14 }} />
              <div className="media__label" style={{ fontSize: 14 }}>{item.title}</div>
            </div>
            <h3>{requiresSupporter ? <><ShieldAlert size={18} style={{ verticalAlign: -4 }} /> Supporter Exclusive</> : 'Download'}</h3>
            {item.packageKind === 'demo' ? (
              <p style={{ marginBottom: 14, fontSize: 12, color: 'var(--muted-gold)' }}>
                Local demo package: this is a small generated sample ZIP, not a full route or train archive. The displayed size and SHA-256 describe the actual file.
              </p>
            ) : null}
            {status === 'loading' ? (
              <p style={{ fontSize: 14, color: 'var(--ink-on-dark)' }}>Checking your session…</p>
            ) : !hasFile ? (
              <p style={{ fontSize: 14, color: 'var(--ink-on-dark)' }}><FileWarning size={15} style={{ verticalAlign: -3 }} /> This entry does not include a downloadable package.</p>
            ) : !user ? (
              <Link className={`btn ${requiresSupporter ? 'btn--gold' : 'btn--primary'} btn--block`} to={`/login?next=/content/${item.slug}`}>
                Sign In To {requiresSupporter ? 'Access' : 'Download'}
              </Link>
            ) : !accessAllowed ? (
              <p style={{ fontSize: 14, color: 'var(--ink-on-dark)' }}>
                Your account does not hold a valid supporter entitlement. Redeem a supporter token in the <Link to="/supporter">Supporter Zone</Link>.
              </p>
            ) : phase === 'authorized' && download ? (
              <>
                <a className={`btn ${requiresSupporter ? 'btn--gold' : 'btn--primary'} btn--block`} href={download.url}>
                  <Download size={14} /> Download {download.content.title}
                </a>
                <p style={{ marginTop: 12, fontSize: 12, color: 'var(--silver-2)' }}>
                  <CheckCircle2 size={13} style={{ verticalAlign: -3 }} /> Authorized. This link expires at{' '}
                  {new Date(download.expiresAt).toLocaleTimeString()} and your download is recorded in <Link to="/downloads">history</Link>.
                </p>
              </>
            ) : (
              <button className={`btn ${requiresSupporter ? 'btn--gold' : 'btn--primary'} btn--block`} onClick={() => void startDownload()} disabled={phase === 'authorizing'}>
                <Download size={14} /> {phase === 'authorizing' ? 'Authorizing…' : 'Authorize Download'}
              </button>
            )}
            {error ? <p style={{ marginTop: 14, fontSize: 13, color: 'var(--signal-red)' }} role="alert">{error}</p> : null}
          </div>

          <div style={{ marginTop: 30 }}>
            <h3 style={{ fontSize: 18, marginBottom: 14 }}>Installation</h3>
            <p style={{ fontSize: 13, color: 'var(--ink-on-dark)', whiteSpace: 'pre-line' }}>{item.installation || 'Installation instructions are included in the package.'}</p>
          </div>
        </aside>
      </div>
    </article>
  );
}
