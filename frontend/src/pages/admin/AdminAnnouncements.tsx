import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { api, displayError } from '../../services/api';
import { StateBlock } from '../../components/ui';

interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  date: string;
  kind: string;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
}

interface AnnouncementDraft {
  title: string;
  description: string;
  kind: string;
}

const KINDS = ['release', 'community', 'supporter', 'maintenance'];

export function AdminAnnouncements() {
  const { data, loading, error, reload } = useApi<{ items: AnnouncementRow[] }>('/admin/announcements');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState('release');
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AnnouncementDraft | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    setNotice(null);
    try {
      await api.post('/admin/announcements', { title, description, kind, isPublished: true });
      setTitle('');
      setDescription('');
      setNotice('Announcement published.');
      reload();
    } catch (err) {
      setFormError(displayError(err));
    } finally {
      setBusy(false);
    }
  };

  const beginEdit = (row: AnnouncementRow) => {
    setEditingId(row.id);
    setDraft({ title: row.title, description: row.body, kind: row.kind });
    setFormError(null);
    setNotice(null);
  };

  const saveEdit = async (row: AnnouncementRow) => {
    if (!draft) return;
    setBusy(true);
    setFormError(null);
    try {
      await api.patch(`/admin/announcements/${row.id}`, draft);
      setEditingId(null);
      setDraft(null);
      setNotice('Announcement updated.');
      reload();
    } catch (err) {
      setFormError(displayError(err));
    } finally {
      setBusy(false);
    }
  };

  const setPublished = async (row: AnnouncementRow, isPublished: boolean) => {
    setFormError(null);
    try {
      await api.patch(`/admin/announcements/${row.id}`, { isPublished });
      reload();
    } catch (err) {
      setFormError(displayError(err));
    }
  };

  const archive = async (row: AnnouncementRow) => {
    if (!window.confirm('Archive this announcement? It will no longer appear publicly.')) return;
    setFormError(null);
    try {
      await api.patch(`/admin/announcements/${row.id}`, { archived: true, isPublished: false });
      reload();
    } catch (err) {
      setFormError(displayError(err));
    }
  };

  if (loading) return <div className="loading-block">Loading announcements...</div>;
  if (error) return <StateBlock title="Announcements unavailable" body={error} action={<button className="btn btn--outline" onClick={reload}>Retry</button>} />;

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: 'clamp(30px, 3.4vw, 44px)' }}>Announcements</h1>
          <p style={{ marginTop: 10, color: 'var(--ink-on-dark)', fontSize: 14 }}>Publish release, community, supporter and maintenance updates.</p>
        </div>
      </div>

      <form className="info-panel" style={{ position: 'static', marginBottom: 34 }} onSubmit={create}>
        <h3>New Announcement</h3>
        {formError ? <div className="form-error" style={{ marginBottom: 16 }}>{formError}</div> : null}
        {notice ? <div className="form-notice" style={{ marginBottom: 16 }}>{notice}</div> : null}
        <div className="grid grid--3">
          <div className="field"><label className="label">Title</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
          <div className="field"><label className="label">Kind</label><select className="select" value={kind} onChange={(e) => setKind(e.target.value)}>{KINDS.map((k) => <option key={k} value={k}>{k}</option>)}</select></div>
          <div className="field"><label className="label">Body</label><input className="input" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        </div>
        <button className="btn btn--primary" type="submit" disabled={busy}>{busy ? 'Publishing...' : 'Publish Announcement'}</button>
      </form>

      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Title</th><th>Kind</th><th>Published</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {(data?.items ?? []).map((a) => (
              <tr key={a.id}>
                {editingId === a.id && draft ? (
                  <>
                    <td>
                      <div style={{ display: 'grid', gap: 8, minWidth: 240 }}>
                        <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                        <textarea className="textarea" rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
                      </div>
                    </td>
                    <td><select className="select" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })}>{KINDS.map((k) => <option key={k} value={k}>{k}</option>)}</select></td>
                    <td>{a.publishedAt ? new Date(a.publishedAt).toLocaleString() : '-'}</td>
                    <td><span className={`badge ${a.isPublished ? 'badge--green' : 'badge--red'}`}>{a.isPublished ? 'published' : 'draft'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="btn btn--primary btn--sm" disabled={busy} onClick={() => void saveEdit(a)}>Save</button>
                        <button className="btn btn--ghost btn--sm" onClick={() => { setEditingId(null); setDraft(null); }}>Cancel</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td><div style={{ fontWeight: 600 }}>{a.title}</div><div style={{ fontSize: 12, color: 'var(--silver)' }}>{a.body}</div></td>
                    <td>{a.kind}</td>
                    <td>{a.publishedAt ? new Date(a.publishedAt).toLocaleString() : '-'}</td>
                    <td><span className={`badge ${a.isPublished ? 'badge--green' : 'badge--red'}`}>{a.isPublished ? 'published' : 'draft'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="btn btn--outline btn--sm" onClick={() => beginEdit(a)}>Edit</button>
                        <button className="btn btn--outline btn--sm" onClick={() => void setPublished(a, !a.isPublished)}>{a.isPublished ? 'Unpublish' : 'Publish'}</button>
                        <button className="btn btn--ghost btn--sm" onClick={() => void archive(a)}>Archive</button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
