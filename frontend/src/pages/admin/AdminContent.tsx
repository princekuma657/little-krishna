import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, StateBlock } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import { api, displayError } from '../../services/api';
import type { ContentItem } from '../../types';

interface ListResponse {
  items: ContentItem[];
  total: number;
}

export function AdminContent() {
  const { data, loading, error, reload, setData } = useApi<ListResponse>('/admin/content?pageSize=100');
  const [query, setQuery] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const items = (data?.items ?? []).filter((c) => `${c.title} ${c.slug}`.toLowerCase().includes(query.toLowerCase()));

  const updateItem = (item: ContentItem) => {
    if (!data) return;
    setData({ ...data, items: data.items.map((c) => (c.id === item.id ? item : c)) });
  };

  const togglePublish = async (item: ContentItem) => {
    setBusy(true);
    setActionError(null);
    try {
      const res = await api.patch<{ item: ContentItem }>(`/admin/content/${item.id}`, { isPublished: item.status !== 'published' });
      updateItem(res.item);
    } catch (err) {
      setActionError(displayError(err));
    } finally {
      setBusy(false);
    }
  };

  const archive = async (item: ContentItem) => {
    if (!window.confirm(`Archive "${item.title}"? It will be unpublished and restricted.`)) return;
    setBusy(true);
    setActionError(null);
    try {
      await api.delete(`/admin/content/${item.id}`);
      reload();
    } catch (err) {
      setActionError(displayError(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="loading-block">Loading content records...</div>;
  if (error) return <StateBlock title="Content unavailable" body={error} action={<button className="btn btn--outline" onClick={reload}>Retry</button>} />;

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: 'clamp(30px, 3.4vw, 44px)' }}>Content</h1>
          <p style={{ marginTop: 10, color: 'var(--ink-on-dark)', fontSize: 14 }}>Manage railway simulation content from the database.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input className="input" style={{ maxWidth: 260 }} placeholder="Search content" value={query} onChange={(e) => setQuery(e.target.value)} />
          <Link className="btn btn--primary" to="/admin/content/create">+ New Content</Link>
        </div>
      </div>

      {actionError ? <div className="form-error" style={{ marginBottom: 20 }}>{actionError}</div> : null}

      {items.length === 0 ? <StateBlock title="No content found" body="Create a new content record to get started." /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Title</th><th>Category</th><th>Simulator</th><th>Access</th><th>Package</th><th>Version</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--silver)' }}>/{c.slug}</div>
                  </td>
                  <td>{c.categoryLabel}</td>
                  <td>{c.simulator}</td>
                  <td>{c.accessType}</td>
                  <td>
                    {c.hasDownload
                      ? <span title={c.sha256 ?? undefined}>{c.packageKind === 'demo' ? 'demo ZIP' : 'uploaded ZIP'}</span>
                      : <span style={{ color: 'var(--silver)' }}>none</span>}
                  </td>
                  <td>v{c.version}</td>
                  <td><Badge kind={c.status}>{c.status}</Badge></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <Link className="btn btn--outline btn--sm" to={`/admin/content/${c.id}/edit`}>Edit</Link>
                      <button className="btn btn--outline btn--sm" disabled={busy} onClick={() => void togglePublish(c)}>
                        {c.status === 'published' ? 'Unpublish' : 'Publish'}
                      </button>
                      <button className="btn btn--ghost btn--sm" disabled={busy} onClick={() => void archive(c)}>Archive</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
