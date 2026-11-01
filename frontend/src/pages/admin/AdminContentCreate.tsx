import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CATEGORIES, loadPublicData } from '../../data/content';
import { api, displayError } from '../../services/api';
import { readFileAsBase64 } from '../../services/files';
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
  fileSizeMb: string;
  sha256: string;
  isPublished: boolean;
  isFeatured: boolean;
  driveLink: string;
  coverImageUrl: string;
}

const INITIAL: FormState = {
  title: '',
  slug: '',
  category: 'routes',
  simulator: 'MSTS',
  packageType: 'Route',
  accessType: 'public',
  version: '1.0.0',
  releaseDate: new Date().toISOString().slice(0, 10),
  shortDescription: '',
  description: '',
  author: 'LittleKrishna Workshop',
  installation: '',
  releaseNotes: '',
  fileSizeMb: '',
  sha256: '',
  isPublished: false,
  isFeatured: false,
  driveLink: '',
  coverImageUrl: '',
};

export function AdminContentCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<ContentItem | null>(null);
  const [packageData, setPackageData] = useState<string | null>(null);
  const [packageName, setPackageName] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const chooseCoverImage = async (file: File | undefined) => {
    if (!file) return;
    setUploadingImage(true);
    setError(null);
    try {
      const base64 = await readFileAsBase64(file);
      const res = await api.post<{ url: string }>('/admin/media/image', { data: base64, folder: 'littlekrishna/content' });
      setForm((f) => ({ ...f, coverImageUrl: res.url }));
    } catch (err) {
      setError(displayError(err));
    } finally {
      setUploadingImage(false);
    }
  };

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const choosePackage = async (file: File | undefined) => {
    if (!file) {
      setPackageData(null);
      setPackageName('');
      return;
    }
    setError(null);
    try {
      setPackageData(await readFileAsBase64(file));
      setPackageName(file.name);
    } catch (err) {
      setPackageData(null);
      setPackageName('');
      setError(displayError(err));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ item: ContentItem }>('/admin/content', {
        ...form,
        fileSizeMb: form.fileSizeMb === '' ? null : Number(form.fileSizeMb),
        sha256: form.sha256 || undefined,
        packageData: packageData || undefined,
        coverImageUrl: form.coverImageUrl || undefined,
        storageReference: form.driveLink || undefined,
      });
      setCreated(res.item);
      await loadPublicData().catch(() => undefined);
    } catch (err) {
      setError(displayError(err));
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: 720 }}>
          <div className="info-panel" style={{ position: 'static' }}>
            <h3>{created.status === 'published' ? 'Content Published' : 'Draft Created'}</h3>
            <p style={{ color: 'var(--ink-on-dark)', fontSize: 15 }}>
              <strong>{created.title}</strong> was written to the database.{' '}
              {created.packageKind
                ? `${created.packageKind === 'demo' ? 'A generated local demo package' : 'The uploaded package'} was stored at its actual size of ${created.fileSizeMb ?? 0} MB. `
                : 'No package was attached. '}
              The recorded package checksum is{' '}
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11, wordBreak: 'break-all' }}>{created.sha256 ?? 'not applicable'}</code>.
            </p>
            <div style={{ marginTop: 26, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link className="btn btn--primary" to="/admin/content">Back To Content</Link>
              {created.status === 'published' ? <Link className="btn btn--outline" to={`/content/${created.slug}`}>View Public Page</Link> : null}
              <button className="btn btn--ghost" onClick={() => { setCreated(null); setForm(INITIAL); }}>Create Another</button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 900 }}>
        <div className="crumbs"><span>Admin</span><span>/</span><span>Content</span><span>/</span><span>Create</span></div>
        <div className="admin-topbar">
          <div>
            <h1 style={{ fontSize: 'clamp(30px, 3.4vw, 44px)' }}>Create Content</h1>
            <p style={{ marginTop: 10, color: 'var(--ink-on-dark)', fontSize: 14 }}>Validated and persisted by the LittleKrishna API.</p>
          </div>
        </div>
        <form className="info-panel" style={{ position: 'static' }} onSubmit={submit}>
          {error ? <div className="form-error" style={{ marginBottom: 22 }} role="alert">{error}</div> : null}
          <div className="grid grid--2">
            <div className="field"><label className="label">Title</label><input className="input" value={form.title} onChange={set('title')} required /></div>
            <div className="field"><label className="label">Slug</label><input className="input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} placeholder="kolkata-delhi-grand-chord" required /></div>
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
          <div className="grid grid--2">
            <div className="field">
              <label className="label" htmlFor="package-upload">Upload ZIP package (optional)</label>
              <input id="package-upload" className="input" type="file" accept=".zip,application/zip" onChange={(e) => void choosePackage(e.target.files?.[0])} />
              <p className="field-help">Local development accepts .zip files up to 10 MB. SHA-256 and package size are computed from the uploaded bytes.</p>
              {packageName ? <p className="field-help">Selected: {packageName}</p> : null}
            </div>
            <div className="field">
              <label className="label" htmlFor="demo-size">Generate a demo package instead</label>
              <input id="demo-size" className="input" type="number" min={0} step="0.01" value={form.fileSizeMb} onChange={set('fileSizeMb')} placeholder="e.g. 24" disabled={Boolean(packageData)} />
              <p className="field-help">Demo packages are tiny sample ZIPs created by the local backend. The number is only a request trigger; the stored size and SHA-256 always describe the real bytes.</p>
            </div>
          </div>
          <p className="field-help" style={{ marginBottom: 24 }}>
            Production packages are expected in controlled storage and are not implemented in this local build. Do not describe generated demo ZIPs as full route or train archives.
          </p>
          <div className="grid grid--2">
            <div className="field">
              <label className="label" htmlFor="cover-image">Cover image (pushed to Cloudinary)</label>
              <input id="cover-image" className="input" type="file" accept="image/*" onChange={(e) => void chooseCoverImage(e.target.files?.[0])} disabled={uploadingImage} />
              <p className="field-help">{uploadingImage ? 'Uploading to Cloudinary…' : 'Optional. Uploads to Cloudinary and stores the URL.'}</p>
              {form.coverImageUrl ? <img src={form.coverImageUrl} alt="cover" style={{ marginTop: 8, maxWidth: '100%', maxHeight: 120, borderRadius: 4 }} /> : null}
            </div>
            <div className="field">
              <label className="label" htmlFor="drive-link">Google Drive link / file ID (optional)</label>
              <input id="drive-link" className="input" value={form.driveLink} onChange={set('driveLink')} placeholder="https://drive.google.com/... or file ID" />
              <p className="field-help">Stored as the package delivery reference. Leave blank to use the generated demo package.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', marginBottom: 24 }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
              <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} /> Publish immediately
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
              <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} /> Feature on homepage
            </label>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn--primary" type="submit" disabled={busy}>{busy ? 'Saving…' : form.isPublished ? 'Publish Content' : 'Save Draft'}</button>
            <button className="btn btn--ghost" type="button" onClick={() => navigate('/admin/content')} disabled={busy}>Cancel</button>
          </div>
        </form>
      </div>
    </section>
  );
}
