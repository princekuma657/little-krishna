import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { api, displayError } from '../../services/api';
import { StateBlock } from '../../components/ui';

interface SupporterRow {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  email: string;
  status: string;
  startsAt: string;
  expiresAt: string | null;
  createdAt: string;
}

export function AdminSupporters() {
  const { data, loading, error, reload } = useApi<{ items: SupporterRow[] }>('/admin/supporters');
  const [identifier, setIdentifier] = useState('');
  const [hours, setHours] = useState('168');
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const grant = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    setNotice(null);
    try {
      await api.post('/admin/supporters/grant', { userId: identifier, expiresInHours: Number(hours) });
      setNotice(`Supporter access granted to ${identifier}.`);
      setIdentifier('');
      reload();
    } catch (err) {
      setFormError(displayError(err));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    if (!window.confirm('Revoke this supporter entitlement? Future protected downloads will be denied.')) return;
    setFormError(null);
    try {
      await api.post(`/admin/supporters/${id}/revoke`);
      reload();
    } catch (err) {
      setFormError(displayError(err));
    }
  };

  if (loading) return <div className="loading-block">Loading supporter entitlements…</div>;
  if (error) return <StateBlock title="Supporters unavailable" body={error} action={<button className="btn btn--outline" onClick={reload}>Retry</button>} />;

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: 'clamp(30px, 3.4vw, 44px)' }}>Supporters</h1>
          <p style={{ marginTop: 10, color: 'var(--ink-on-dark)', fontSize: 14 }}>Manage supporter entitlements. Grants and revocations are audit logged.</p>
        </div>
      </div>

      <form className="info-panel" style={{ position: 'static', marginBottom: 34 }} onSubmit={grant}>
        <h3>Grant Supporter Access</h3>
        {formError ? <div className="form-error" style={{ marginBottom: 16 }}>{formError}</div> : null}
        {notice ? <div className="form-notice" style={{ marginBottom: 16 }}>{notice}</div> : null}
        <div className="grid grid--3" style={{ alignItems: 'end' }}>
          <div className="field"><label className="label">User (id, username or email)</label><input className="input" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required /></div>
          <div className="field"><label className="label">Duration (hours)</label><input className="input" type="number" min={1} max={8760} value={hours} onChange={(e) => setHours(e.target.value)} /></div>
          <div className="field" style={{ marginBottom: 0 }}><button className="btn btn--primary" type="submit" disabled={busy}>{busy ? 'Granting…' : 'Grant Access'}</button></div>
        </div>
      </form>

      {(data?.items.length ?? 0) === 0 ? <StateBlock title="No entitlements yet" body="Redeemed tokens and administrator grants will appear here." /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>User</th><th>Starts</th><th>Expires</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {data?.items.map((s) => (
                <tr key={s.id}>
                  <td><div style={{ fontWeight: 600 }}>@{s.username}</div><div style={{ fontSize: 12, color: 'var(--silver)' }}>{s.email}</div></td>
                  <td>{new Date(s.startsAt).toLocaleString()}</td>
                  <td>{s.expiresAt ? new Date(s.expiresAt).toLocaleString() : 'no expiry'}</td>
                  <td><span className={`badge ${s.status === 'active' ? 'badge--green' : 'badge--red'}`}>{s.status}</span></td>
                  <td>{s.status === 'active' ? <button className="btn btn--ghost btn--sm" onClick={() => void revoke(s.id)}>Revoke Access</button> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
