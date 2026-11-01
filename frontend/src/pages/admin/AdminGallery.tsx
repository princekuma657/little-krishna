import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { api, displayError } from '../../services/api';
import { Badge, StateBlock } from '../../components/ui';
import type { ContentItem, CommunitySubmission } from '../../types';

interface GalleryResponse {
  content: ContentItem[];
  submissions: Array<CommunitySubmission & { moderationStatus: string; mediaUrl: string | null; createdAt: string }>;
}

export function AdminGallery() {
  const { data, loading, error, reload } = useApi<GalleryResponse>('/admin/gallery');
  const [actionError, setActionError] = useState<string | null>(null);

  const moderate = async (id: string, moderationStatus: 'approved' | 'rejected') => {
    setActionError(null);
    try {
      await api.patch(`/admin/community/${id}`, { moderationStatus });
      reload();
    } catch (err) {
      setActionError(displayError(err));
    }
  };

  if (loading) return <div className="loading-block">Loading gallery data…</div>;
  if (error) return <StateBlock title="Gallery unavailable" body={error} action={<button className="btn btn--outline" onClick={reload}>Retry</button>} />;

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: 'clamp(30px, 3.4vw, 44px)' }}>Gallery</h1>
          <p style={{ marginTop: 10, color: 'var(--ink-on-dark)', fontSize: 14 }}>Gallery content and community submission moderation.</p>
        </div>
        <Link className="btn btn--primary" to="/admin/content/create">+ New Gallery Entry</Link>
      </div>

      {actionError ? <div className="form-error" style={{ marginBottom: 20 }}>{actionError}</div> : null}

      <h3 style={{ fontSize: 20, marginBottom: 16 }}>Community Submissions</h3>
      {(data?.submissions.length ?? 0) === 0 ? <StateBlock title="No submissions" body="Signed-in users can submit screenshots from the Community page." /> : (
        <div className="table-wrap" style={{ marginBottom: 40 }}>
          <table className="table">
            <thead><tr><th>Title</th><th>Author</th><th>Status</th><th>Submitted</th><th>Actions</th></tr></thead>
            <tbody>
              {data?.submissions.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{s.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--silver)' }}>{s.description}</div>
                    {s.mediaUrl ? <a href={s.mediaUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>View media</a> : null}
                  </td>
                  <td>@{s.author}</td>
                  <td><Badge kind={s.moderationStatus === 'approved' ? 'public' : s.moderationStatus === 'rejected' ? 'restricted' : 'draft'}>{s.moderationStatus}</Badge></td>
                  <td>{new Date(s.createdAt).toLocaleString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className="btn btn--outline btn--sm" onClick={() => void moderate(s.id, 'approved')} disabled={s.moderationStatus === 'approved'}>Approve</button>
                      <button className="btn btn--ghost btn--sm" onClick={() => void moderate(s.id, 'rejected')} disabled={s.moderationStatus === 'rejected'}>Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 style={{ fontSize: 20, marginBottom: 16 }}>Gallery Content</h3>
      {(data?.content.length ?? 0) === 0 ? <StateBlock title="No gallery content" body="Create content in the Gallery category." /> : (
        <div className="grid grid--3">
          {data?.content.map((g) => (
            <div className="info-panel" key={g.id} style={{ position: 'static' }}>
              <div className="media" style={{ aspectRatio: '16 / 10', background: `linear-gradient(140deg, ${g.art.from}, ${g.art.to})` }}>
                <div className="media__label">{g.title}</div>
              </div>
              <h3 style={{ fontSize: 18, marginTop: 16 }}>{g.title}</h3>
              <p style={{ marginTop: 8, color: 'var(--silver)', fontSize: 13 }}>{g.author}</p>
              <div style={{ marginTop: 14 }}><Badge kind={g.status}>{g.status}</Badge></div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
