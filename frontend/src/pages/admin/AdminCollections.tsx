import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { api, displayError } from '../../services/api';
import { Badge, StateBlock } from '../../components/ui';
import type { ContentItem } from '../../types';

interface CollectionRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  isPublished: boolean;
  itemSlugs: string[];
}

interface CollectionDraft {
  title: string;
  slug: string;
  description: string;
  isPublished: boolean;
  itemSlugs: string[];
}

export function AdminCollections() {
  const collections = useApi<{ items: CollectionRow[] }>('/admin/collections');
  const content = useApi<{ items: ContentItem[] }>('/admin/content?pageSize=100');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CollectionDraft | null>(null);

  const toggle = (itemSlug: string) => {
    setSelected((prev) => prev.includes(itemSlug) ? prev.filter((s) => s !== itemSlug) : [...prev, itemSlug]);
  };

  const toggleDraftItem = (itemSlug: string) => {
    setDraft((current) => current ? {
      ...current,
      itemSlugs: current.itemSlugs.includes(itemSlug)
        ? current.itemSlugs.filter((s) => s !== itemSlug)
        : [...current.itemSlugs, itemSlug],
    } : current);
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api.post('/admin/collections', { title, slug, description, itemSlugs: selected });
      setTitle('');
      setSlug('');
      setDescription('');
      setSelected([]);
      setNotice('Collection created.');
      collections.reload();
    } catch (err) {
      setError(displayError(err));
    } finally {
      setBusy(false);
    }
  };

  const beginEdit = (row: CollectionRow) => {
    setEditingId(row.id);
    setDraft({ title: row.title, slug: row.slug, description: row.description, isPublished: row.isPublished, itemSlugs: row.itemSlugs });
    setError(null);
    setNotice(null);
  };

  const saveEdit = async (row: CollectionRow) => {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/admin/collections/${row.id}`, draft);
      setEditingId(null);
      setDraft(null);
      setNotice('Collection updated.');
      collections.reload();
    } catch (err) {
      setError(displayError(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: CollectionRow) => {
    if (!window.confirm(`Delete collection "${row.title}"? Content items are not deleted.`)) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api.delete(`/admin/collections/${row.id}`);
      setNotice('Collection deleted.');
      collections.reload();
    } catch (err) {
      setError(displayError(err));
    } finally {
      setBusy(false);
    }
  };

  if (collections.loading) return <div className="loading-block">Loading collections...</div>;
  if (collections.error) return <StateBlock title="Collections unavailable" body={collections.error} action={<button className="btn btn--outline" onClick={collections.reload}>Retry</button>} />;

  const allContent = content.data?.items ?? [];

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: 'clamp(30px, 3.4vw, 44px)' }}>Collections</h1>
          <p style={{ marginTop: 10, color: 'var(--ink-on-dark)', fontSize: 14 }}>Curated groupings of railway content.</p>
        </div>
      </div>

      {error ? <div className="form-error" style={{ marginBottom: 20 }}>{error}</div> : null}
      {notice ? <div className="form-notice" style={{ marginBottom: 20 }}>{notice}</div> : null}

      <form className="info-panel" style={{ position: 'static', marginBottom: 34 }} onSubmit={create}>
        <h3>New Collection</h3>
        <div className="grid grid--3">
          <div className="field"><label className="label">Title</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
          <div className="field"><label className="label">Slug</label><input className="input" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto from title" /></div>
          <div className="field"><label className="label">Description</label><input className="input" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        </div>
        <div className="field">
          <label className="label">Included content</label>
          <div className="check-list">
            {allContent.map((c) => (
              <label key={c.id} className="check-list__item">
                <input type="checkbox" checked={selected.includes(c.slug)} onChange={() => toggle(c.slug)} /> {c.title}
              </label>
            ))}
          </div>
        </div>
        <button className="btn btn--primary" type="submit" disabled={busy}>{busy ? 'Creating...' : 'Create Collection'}</button>
      </form>

      <div className="grid grid--3">
        {(collections.data?.items ?? []).map((c) => (
          <div className="info-panel" key={c.id} style={{ position: 'static' }}>
            {editingId === c.id && draft ? (
              <>
                <div className="field"><label className="label">Title</label><input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></div>
                <div className="field"><label className="label">Slug</label><input className="input" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} /></div>
                <div className="field"><label className="label">Description</label><textarea className="textarea" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, marginBottom: 16 }}>
                  <input type="checkbox" checked={draft.isPublished} onChange={(e) => setDraft({ ...draft, isPublished: e.target.checked })} /> Published
                </label>
                <div className="field">
                  <label className="label">Included content</label>
                  <div className="check-list">
                    {allContent.map((entry) => (
                      <label key={entry.id} className="check-list__item">
                        <input type="checkbox" checked={draft.itemSlugs.includes(entry.slug)} onChange={() => toggleDraftItem(entry.slug)} /> {entry.title}
                      </label>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn--primary btn--sm" disabled={busy} onClick={() => void saveEdit(c)}>Save</button>
                  <button className="btn btn--ghost btn--sm" onClick={() => { setEditingId(null); setDraft(null); }}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <h3 style={{ fontSize: 22 }}>{c.title}</h3>
                  <Badge kind={c.isPublished ? 'public' : 'draft'}>{c.isPublished ? 'published' : 'draft'}</Badge>
                </div>
                <p style={{ marginTop: 12, color: 'var(--ink-on-dark)', fontSize: 14 }}>{c.description}</p>
                <p style={{ marginTop: 18, fontSize: 13, color: 'var(--silver)' }}>{c.itemSlugs.length} items included.</p>
                <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn--outline btn--sm" onClick={() => beginEdit(c)}>Edit</button>
                  <Link className="btn btn--outline btn--sm" to={`/collection/${c.slug}`}>Public Page</Link>
                  <button className="btn btn--ghost btn--sm" disabled={busy} onClick={() => void remove(c)}>Delete</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
