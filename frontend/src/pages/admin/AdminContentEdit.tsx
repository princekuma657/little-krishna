import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CATEGORIES, loadPublicData } from '../../data/content';
import { useApi } from '../../hooks/useApi';
import { api, displayError } from '../../services/api';
import { readFileAsBase64 } from '../../services/files';
import { StateBlock } from '../../components/ui';
import type { ContentItem } from '../../types';

interface FormState {
  title: string;
  slug: string;
  category: string;
  simulator: string;
  packageType: string;
  accessType: string;
  version: string;
  releaseDate: string;
  shortDescription: string;
  description: string;
  author: string;
  installation: string;
  releaseNotes: string;
  artFrom: string;
  artTo: string;
  artAccent: string;
  isPublished: boolean;
  isFeatured: boolean;
}

function formFromItem(item: ContentItem): FormState {
  return {
    title: item.title,
    slug: item.slug,
    category: item.category,
    simulator: item.simulator,
    packageType: item.packageType,
    accessType: item.accessType,
    version: item.version,
    releaseDate: item.releaseDate,
    shortDescription: item.shortDescription,
    description: item.description,
    author: item.author,
    installation: item.installation,
    releaseNotes: item.releaseNotes,
    artFrom: item.art.from,
    artTo: item.art.to,
    artAccent: item.art.accent || '#b2c73a',
    isPublished: item.status === 'published',
    isFeatured: item.featured,
  };
}

export function AdminContentEdit() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApi<{ item: ContentItem }>(`/admin/content/${id}`);
  const [form, setForm] = useState<FormState | null>(null);
  const [packageData, setPackageData] = useState<string | null>(null);
  const [packageName, setPackageName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data?.item) setForm(formFromItem(data.item));
  }, [data]);

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((current) => current ? { ...current, [key]: e.target.value } : current);

  const choosePackage = async (file: File | undefined) => {
    if (!file) {
      setPackageData(null);
      setPackageName('');
      return;
    }
    setFormError(null);
    try {
      setPackageData(await readFileAsBase64(file));
      setPackageName(file.name);
    } catch (err) {
      setPackageData(null);
      setPackageName('');
      setFormError(displayError(err));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setFormError(null);
    setNotice(null);
    try {
      const res = await api.patch<{ item: ContentItem }>(`/admin/content/${id}`, {
        ...form,
        art: { from: form.artFrom, to: form.artTo, accent: form.artAccent },
        packageData: packageData || undefined,
      });
      setForm(formFromItem(res.item));
      setPackageData(null);
      setPackageName('');
      setNotice('Content saved and the public catalog refreshed.');
      await loadPublicData().catch(() => undefined);
    } catch (err) {
      setFormError(displayError(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="loading-block">Loading content record...</div>;
  if (error) return <StateBlock title="Content unavailable" body={error} action={<button className="btn btn--outline" onClick={reload}>Retry</button>} />;
  if (!data?.item || !form) return <StateBlock title="Content not found" body="This record may have been removed." action={<Link className="btn btn--primary" to="/admin/content">Back To Content</Link>} />;

  const item = data.item;

  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="container" style={{ maxWidth: 980 }}>
        <div className="crumbs">
          <Link to="/admin">Admin</Link><span>/</span><Link to="/admin/content">Content</Link><span>/</span><span>Edit</span>
        </div>
        <div className="admin-topbar">
          <div>
            <h1 style={{ fontSize: 'clamp(30px, 3.4vw, 44px)' }}>Edit Content</h1>
            <p style={{ marginTop: 10, color: 'var(--ink-on-dark)', fontSize: 14 }}>
              Every field below is validated by the API. Publishing requires a package for downloadable content.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {item.status === 'published' ? <Link className="btn btn--outline" to={`/content/${item.slug}`}>View Public Page</Link> : null}
            <button className="btn btn--ghost" onClick={() => navigate('/admin/content')}>Back</button>
          </div>
        </div>

        <form className="info-panel" style={{ position: 'static' }} onSubmit={submit}>
          {formError ? <div className="form-error" style={{ marginBottom: 22 }} role="alert">{formError}</div> : null}
          {notice ? <div className="form-notice" style={{ marginBottom: 22 }}>{notice}</div> : null}

          <div className="grid grid--2">
            <div className="field"><label className="label">Title</label><input className="input" value={form.title} onChange={set('title')} required /></div>
            <div className="field"><label className="label">Slug</label><input className="input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} required /></div>
          </div>

          <div className="grid grid--3">
            <div className="field"><label className="label">Category</label><select className="select" value={form.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}</select></div>
            <div className="field"><label className="label">Simulator</label><select className="select" value={form.simulator} onChange={set('simulator')}><option>MSTS</option><option>RailWorks</option><option>Train Simulator Classic</option></select></div>
            <div className="field"><label className="label">Package Type</label><input className="input" value={form.packageType} onChange={set('packageType')} required /></div>
          </div>

          <div className="grid grid--3">
            <div className="field"><label className="label">Version</label><input className="input" value={form.version} onChange={set('version')} required /></div>
            <div className="field"><label className="label">Release Date</label><input className="input" type="date" value={form.releaseDate} onChange={set('releaseDate')} required /></div>
            <div className="field"><label className="label">Access Type</label><select className="select" value={form.accessType} onChange={set('accessType')}><option value="public">Public</option><option value="registered">Registered</option><option value="supporter">Supporter</option><option value="restricted">Restricted</option></select></div>
          </div>

          <div className="field"><label className="label">Author</label><input className="input" value={form.author} onChange={set('author')} /></div>
          <div className="field"><label className="label">Short Description</label><textarea className="textarea" value={form.shortDescription} onChange={set('shortDescription')} /></div>
          <div className="field"><label className="label">Description</label><textarea className="textarea" value={form.description} onChange={set('description')} /></div>

          <div className="grid grid--2">
            <div className="field"><label className="label">Installation Instructions</label><textarea className="textarea" value={form.installation} onChange={set('installation')} /></div>
            <div className="field"><label className="label">Release Notes</label><textarea className="textarea" value={form.releaseNotes} onChange={set('releaseNotes')} /></div>
          </div>

          <div className="grid grid--3">
            <div className="field"><label className="label">Art From</label><input className="input" value={form.artFrom} onChange={set('artFrom')} pattern="^#[0-9a-fA-F]{6}$" /></div>
            <div className="field"><label className="label">Art To</label><input className="input" value={form.artTo} onChange={set('artTo')} pattern="^#[0-9a-fA-F]{6}$" /></div>
            <div className="field"><label className="label">Art Accent</label><input className="input" value={form.artAccent} onChange={set('artAccent')} pattern="^#[0-9a-fA-F]{6}$" /></div>
          </div>

          <div className="info-panel" style={{ position: 'static', marginBottom: 24, background: 'var(--charcoal)' }}>
            <h3 style={{ fontSize: 18 }}>Package</h3>
            <p style={{ marginTop: 10, color: 'var(--ink-on-dark)', fontSize: 14 }}>
              {item.hasDownload
                ? `${item.packageKind === 'demo' ? 'Generated demo package' : 'Uploaded package'} · ${item.fileSizeMb ?? 0} MB actual size`
                : 'No package is attached to this record.'}
            </p>
            {item.sha256 ? <p style={{ marginTop: 8, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--silver-2)', wordBreak: 'break-all' }}>{item.sha256}</p> : null}
            <div className="field" style={{ marginTop: 18, marginBottom: 0 }}>
              <label className="label" htmlFor="replacement-package">Replace package with a ZIP (optional)</label>
              <input id="replacement-package" className="input" type="file" accept=".zip,application/zip" onChange={(e) => void choosePackage(e.target.files?.[0])} />
              <p className="field-help">Uploading replaces the stored file, size and SHA-256. Local limits: ZIP only, 10 MB maximum.</p>
              {packageName ? <p className="field-help">Selected: {packageName}</p> : null}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', marginBottom: 24 }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
              <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} /> Published
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
              <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} /> Featured on homepage
            </label>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn--primary" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save Changes'}</button>
            <button className="btn btn--ghost" type="button" onClick={() => navigate('/admin/content')} disabled={busy}>Cancel</button>
          </div>
        </form>
      </div>
    </section>
  );
}
