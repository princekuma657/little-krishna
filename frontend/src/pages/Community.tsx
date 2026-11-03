import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ANNOUNCEMENTS, COMMUNITY_SUBMISSIONS, CREATORS } from '../data/content';
import { SectionHead, StateBlock } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { api, displayError } from '../services/api';
import type { CommunitySubmission } from '../types';

export function Community() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [mediaDataUrl, setMediaDataUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState<CommunitySubmission[]>([]);

  useEffect(() => {
    if (!user) { setMine([]); return; }
    api.get<{ items: CommunitySubmission[] }>('/community/submissions')
      .then((res) => setMine(res.items))
      .catch(() => undefined);
  }, [user]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    setMediaDataUrl(null);
    setFileName('');
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
      setFileError('Choose a PNG, JPEG, WebP or GIF image.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setFileError('Images must be 2 MB or smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setMediaDataUrl(String(reader.result));
      setFileName(file.name);
    };
    reader.onerror = () => setFileError('The image could not be read.');
    reader.readAsDataURL(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await api.post<{ submission: CommunitySubmission }>('/community/submissions', {
        title, description, mediaUrl: mediaUrl || undefined, mediaDataUrl: mediaDataUrl || undefined,
      });
      setNotice('Submission received and awaiting moderation.');
      setMine((items) => [res.submission, ...items]);
      setTitle('');
      setDescription('');
      setMediaUrl('');
      setMediaDataUrl(null);
      setFileName('');
    } catch (err) {
      setError(displayError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section className="page-head page-head--paper">
        <div className="container">
          <div className="crumbs">
            <Link to="/">Home</Link>
            <span>/</span>
            <span>Community</span>
          </div>
          <span className="eyebrow">Community</span>
          <h1>The Community</h1>
          <p className="section-sub" style={{ marginTop: 22 }}>
            Creators, screenshots and development stories from Indian railway simulation enthusiasts.
          </p>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <SectionHead eyebrow="Featured Creators" title="People Behind The Routes." sub="The authors and fan builders making Indian railway simulation richer every month." />
          {CREATORS.length === 0 ? <StateBlock title="No creators published" body="Creator profiles will appear here." /> : (
            <div className="grid grid--3">
              {CREATORS.map((c) => (
                <article className="card" key={c.id}>
                  <div className="card__media">
                    <div className="media" style={{ aspectRatio: '16 / 10', background: `linear-gradient(140deg, ${c.art.from}, ${c.art.to})` }}>
                      <div className="media__label">{c.projectTitle}</div>
                    </div>
                  </div>
                  <div className="card__body">
                    <h3 className="card__title">{c.name}</h3>
                    <p style={{ marginTop: 8, color: 'var(--silver)', fontSize: 13 }}>{c.handle}</p>
                    <p style={{ marginTop: 12, fontSize: 14, color: 'var(--ink-on-dark)' }}>{c.focus}</p>
                  </div>
                </article>
              ))}
            </div>
          )}

          <SectionHead eyebrow="Community Gallery" title="Recent Submissions." center />
          {COMMUNITY_SUBMISSIONS.length === 0 ? <StateBlock title="No approved submissions" body="Approved community screenshots will appear here." /> : (
            <div className="grid grid--2">
              {COMMUNITY_SUBMISSIONS.map((s) => (
                <article className="card" key={s.id}>
                  <div className="card__media">
                    {s.mediaUrl ? (
                      <img src={s.mediaUrl} alt={s.title} loading="lazy" style={{ width: '100%', aspectRatio: '16 / 10', objectFit: 'cover' }} />
                    ) : (
                      <div className="media" style={{ aspectRatio: '16 / 10', background: `linear-gradient(140deg, ${s.art.from}, ${s.art.to})` }}>
                        <div className="media__label">{s.title}</div>
                      </div>
                    )}
                  </div>
                  <div className="card__body">
                    <h3 className="card__title">{s.title}</h3>
                    <p style={{ marginTop: 8, color: 'var(--silver)', fontSize: 13 }}>by {s.author}</p>
                  </div>
                </article>
              ))}
            </div>
          )}

          <SectionHead eyebrow="Submit" title="Share Your Work." sub="Submit a screenshot or development update for moderation. Images up to 2 MB, or an external HTTPS media URL." />
          <div className="grid grid--2" style={{ alignItems: 'start' }}>
            <div className="info-panel" style={{ position: 'static' }}>
              {!user ? (
                <>
                  <h3>Sign in to submit</h3>
                  <p style={{ color: 'var(--ink-on-dark)', fontSize: 14 }}>Community submissions require an authenticated account and are moderated before publication.</p>
                  <Link className="btn btn--primary" style={{ marginTop: 18 }} to="/login?next=/community">Sign In</Link>
                </>
              ) : (
                <form onSubmit={submit}>
                  <h3>New Submission</h3>
                  {notice ? <div className="form-notice" style={{ marginBottom: 16 }}>{notice}</div> : null}
                  {error ? <div className="form-error" style={{ marginBottom: 16 }}>{error}</div> : null}
                  {fileError ? <div className="form-error" style={{ marginBottom: 16 }}>{fileError}</div> : null}
                  <div className="field"><label className="label">Title</label><input className="input" maxLength={140} value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
                  <div className="field"><label className="label">Description</label><textarea className="textarea" maxLength={3000} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                  <div className="field"><label className="label">External media URL (optional)</label><input className="input" type="url" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="https://…" /></div>
                  <div className="field"><label className="label">Or upload an image (max 2 MB)</label><input className="input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={onFile} /></div>
                  {fileName ? <p style={{ fontSize: 12, color: 'var(--muted-gold)', marginBottom: 14 }}>{fileName} ready to upload</p> : null}
                  <button className="btn btn--primary" type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit For Moderation'}</button>
                </form>
              )}
            </div>
            <div className="info-panel" style={{ position: 'static' }}>
              <h3>Your Submissions</h3>
              {!user ? <p style={{ color: 'var(--ink-on-dark)', fontSize: 14 }}>Sign in to track moderation status.</p> : mine.length === 0 ? (
                <p style={{ color: 'var(--ink-on-dark)', fontSize: 14 }}>You have not submitted anything yet.</p>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {mine.map((s) => (
                    <div key={s.id} style={{ borderBottom: '1px solid var(--line)', paddingBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                        <strong>{s.title}</strong>
                        <span className="badge">{s.moderationStatus ?? 'pending'}</span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--silver-2)', marginTop: 6 }}>{s.createdAt ? new Date(s.createdAt).toLocaleString() : ''}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <SectionHead eyebrow="Announcements" title="From The Team." />
          {ANNOUNCEMENTS.length === 0 ? <StateBlock title="No announcements" body="Team updates will appear here." /> : (
            <div className="grid grid--2">
              {ANNOUNCEMENTS.map((a) => (
                <article className="card" key={a.id}>
                  <div className="card__body">
                    <span className="badge" style={{ marginBottom: 14 }}>{a.kind}</span>
                    <h3 className="card__title">{a.title}</h3>
                    <p style={{ marginTop: 12, color: 'var(--ink-on-dark)', fontSize: 14 }}>{a.body}</p>
                    <p style={{ marginTop: 14, fontSize: 12, color: 'var(--silver-2)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>{a.date}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
