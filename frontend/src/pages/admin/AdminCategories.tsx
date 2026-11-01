import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { api, displayError } from '../../services/api';
import { StateBlock } from '../../components/ui';

interface CategoryRow {
  id: string;
  label: string;
  slug: string;
  description: string;
  contentCount: number;
}

export function AdminCategories() {
  const { data, loading, error, reload } = useApi<{ items: CategoryRow[] }>('/admin/categories');
  const [label, setLabel] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    setNotice(null);
    try {
      await api.post('/admin/categories', { label, slug, description });
      setLabel('');
      setSlug('');
      setDescription('');
      setNotice('Category created.');
      reload();
    } catch (err) {
      setFormError(displayError(err));
    } finally {
      setBusy(false);
    }
  };

  const beginEdit = (row: CategoryRow) => {
    setEditingId(row.id);
    setEditLabel(row.label);
    setEditSlug(row.slug);
    setEditDescription(row.description);
    setFormError(null);
    setNotice(null);
  };

  const saveEdit = async (row: CategoryRow) => {
    setBusy(true);
    setFormError(null);
    try {
      await api.patch(`/admin/categories/${row.id}`, { label: editLabel, slug: editSlug, description: editDescription });
      setEditingId(null);
      setNotice('Category updated. Existing content labels were refreshed.');
      reload();
    } catch (err) {
      setFormError(displayError(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: CategoryRow) => {
    if (!window.confirm(`Delete category "${row.label}"? Categories that still contain content cannot be deleted.`)) return;
    setBusy(true);
    setFormError(null);
    setNotice(null);
    try {
      await api.delete(`/admin/categories/${row.id}`);
      setNotice('Category deleted.');
      reload();
    } catch (err) {
      setFormError(displayError(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="loading-block">Loading categories...</div>;
  if (error) return <StateBlock title="Categories unavailable" body={error} action={<button className="btn btn--outline" onClick={reload}>Retry</button>} />;

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: 'clamp(30px, 3.4vw, 44px)' }}>Categories</h1>
          <p style={{ marginTop: 10, color: 'var(--ink-on-dark)', fontSize: 14 }}>Classify routes, trains, assets and community content.</p>
        </div>
      </div>

      <form className="info-panel" style={{ position: 'static', marginBottom: 34 }} onSubmit={create}>
        <h3>New Category</h3>
        {formError ? <div className="form-error" style={{ marginBottom: 16 }}>{formError}</div> : null}
        {notice ? <div className="form-notice" style={{ marginBottom: 16 }}>{notice}</div> : null}
        <div className="grid grid--3">
          <div className="field"><label className="label">Name</label><input className="input" value={label} onChange={(e) => setLabel(e.target.value)} required /></div>
          <div className="field"><label className="label">Slug</label><input className="input" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto from name" /></div>
          <div className="field"><label className="label">Description</label><input className="input" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        </div>
        <button className="btn btn--primary" type="submit" disabled={busy}>{busy ? 'Creating...' : 'Create Category'}</button>
      </form>

      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Name</th><th>Slug</th><th>Description</th><th>Content</th><th>Actions</th></tr></thead>
          <tbody>
            {(data?.items ?? []).map((c) => (
              <tr key={c.id}>
                {editingId === c.id ? (
                  <>
                    <td><input className="input" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} /></td>
                    <td><input className="input" value={editSlug} onChange={(e) => setEditSlug(e.target.value)} /></td>
                    <td><input className="input" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} /></td>
                    <td>{c.contentCount}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="btn btn--primary btn--sm" disabled={busy} onClick={() => void saveEdit(c)}>Save</button>
                        <button className="btn btn--ghost btn--sm" onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ fontWeight: 600 }}>{c.label}</td>
                    <td>/{c.slug}</td>
                    <td>{c.description}</td>
                    <td>{c.contentCount}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="btn btn--outline btn--sm" onClick={() => beginEdit(c)}>Edit</button>
                        <button className="btn btn--ghost btn--sm" disabled={busy || c.contentCount > 0} title={c.contentCount > 0 ? 'Move or delete its content first' : undefined} onClick={() => void remove(c)}>Delete</button>
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
