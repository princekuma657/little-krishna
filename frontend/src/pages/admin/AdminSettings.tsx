import { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { api, displayError } from '../../services/api';
import { StateBlock } from '../../components/ui';

interface Settings {
  site_name: string;
  supporter_price_label: string;
  maintenance_message: string;
  analytics_enabled: boolean;
  download_link_ttl_minutes: number;
}

export function AdminSettings() {
  const { data, loading, error, reload } = useApi<{ settings: Settings }>('/admin/settings');
  const [form, setForm] = useState<Settings | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data?.settings) setForm(data.settings);
  }, [data]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setNotice(null);
    setFormError(null);
    try {
      await api.patch('/admin/settings', form);
      setNotice('Settings saved. Sensitive changes are written to the audit log.');
    } catch (err) {
      setFormError(displayError(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="loading-block">Loading settings…</div>;
  if (error) return <StateBlock title="Settings unavailable" body={error} action={<button className="btn btn--outline" onClick={reload}>Retry</button>} />;
  if (!form) return null;

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: 'clamp(30px, 3.4vw, 44px)' }}>Settings</h1>
          <p style={{ marginTop: 10, color: 'var(--ink-on-dark)', fontSize: 14 }}>Application settings stored in the database. Only super admins can edit these.</p>
        </div>
      </div>

      <form className="info-panel" style={{ position: 'static', maxWidth: 760 }} onSubmit={save}>
        {notice ? <div className="form-notice" style={{ marginBottom: 18 }}>{notice}</div> : null}
        {formError ? <div className="form-error" style={{ marginBottom: 18 }}>{formError}</div> : null}
        <div className="field"><label className="label">Site name</label><input className="input" value={form.site_name} onChange={(e) => setForm({ ...form, site_name: e.target.value })} /></div>
        <div className="field"><label className="label">Supporter label</label><input className="input" value={form.supporter_price_label} onChange={(e) => setForm({ ...form, supporter_price_label: e.target.value })} /></div>
        <div className="field"><label className="label">Maintenance message</label><textarea className="textarea" value={form.maintenance_message} onChange={(e) => setForm({ ...form, maintenance_message: e.target.value })} /></div>
        <div className="field"><label className="label">Download link TTL (minutes)</label><input className="input" type="number" min={1} max={60} value={form.download_link_ttl_minutes} onChange={(e) => setForm({ ...form, download_link_ttl_minutes: Number(e.target.value) })} /></div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, marginBottom: 24 }}>
          <input type="checkbox" checked={form.analytics_enabled} onChange={(e) => setForm({ ...form, analytics_enabled: e.target.checked })} /> Collect privacy-minimal page-view analytics
        </label>
        <button className="btn btn--primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save Settings'}</button>
      </form>

      <div className="info-panel" style={{ position: 'static', marginTop: 30, maxWidth: 760 }}>
        <h3>Environment Notes</h3>
        <p style={{ fontSize: 13, color: 'var(--ink-on-dark)' }}>
          Local development uses the built-in Node API and SQLite database. Production must set Supabase, Cloudinary,
          private archive storage and a transactional email provider. Secrets belong in server-side environment
          variables only and are never sent to the browser.
        </p>
      </div>
    </>
  );
}
