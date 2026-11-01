import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { api, displayError } from '../../services/api';
import { StateBlock } from '../../components/ui';

interface TokenRow {
  id: string;
  label: string;
  createdBy: string;
  boundUser: string | null;
  expiresAt: string | null;
  maximumUses: number | null;
  redemptionCount: number;
  revokedAt: string | null;
  status: string;
  createdAt: string;
}

export function AdminTokens() {
  const { data, loading, error, reload } = useApi<{ items: TokenRow[] }>('/admin/tokens');
  const [expiresInHours, setExpiresInHours] = useState('168');
  const [maximumUses, setMaximumUses] = useState('1');
  const [boundUserId, setBoundUserId] = useState('');
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      const res = await api.post<{ token: string; item: TokenRow }>('/admin/tokens', {
        expiresInHours: Number(expiresInHours),
        maximumUses: Number(maximumUses),
        boundUserId: boundUserId || null,
      });
      setGeneratedToken(res.token);
      setBoundUserId('');
      reload();
    } catch (err) {
      setFormError(displayError(err));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    if (!window.confirm('Revoke this token and all active entitlements created from it?')) return;
    setFormError(null);
    try {
      await api.post(`/admin/tokens/${id}/revoke`);
      reload();
    } catch (err) {
      setFormError(displayError(err));
    }
  };

  if (loading) return <div className="loading-block">Loading supporter tokens…</div>;
  if (error) return <StateBlock title="Tokens unavailable" body={error} action={<button className="btn btn--outline" onClick={reload}>Retry</button>} />;

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: 'clamp(30px, 3.4vw, 44px)' }}>Tokens</h1>
          <p style={{ marginTop: 10, color: 'var(--ink-on-dark)', fontSize: 14 }}>Tokens are generated securely on the server. Only hashes are stored.</p>
        </div>
      </div>

      <form className="info-panel" style={{ position: 'static', marginBottom: 40 }} onSubmit={generate}>
        <h3>Generate Token</h3>
        {formError ? <div className="form-error" style={{ marginBottom: 16 }}>{formError}</div> : null}
        {generatedToken ? (
          <div className="form-notice" style={{ marginBottom: 20 }}>
            Token generated. Copy it now — it cannot be displayed again.
            <span className="token-value">{generatedToken}</span>
          </div>
        ) : null}
        <div className="grid grid--3" style={{ alignItems: 'end' }}>
          <div className="field"><label className="label">Expires (hours)</label><input className="input" type="number" min={1} max={8760} value={expiresInHours} onChange={(e) => setExpiresInHours(e.target.value)} /></div>
          <div className="field"><label className="label">Max Uses</label><input className="input" type="number" min={1} max={10000} value={maximumUses} onChange={(e) => setMaximumUses(e.target.value)} /></div>
          <div className="field"><label className="label">Bind to user (id, username or email)</label><input className="input" value={boundUserId} onChange={(e) => setBoundUserId(e.target.value)} placeholder="Optional" /></div>
          <div className="field" style={{ marginBottom: 0 }}><button className="btn btn--primary" type="submit" disabled={busy}>{busy ? 'Generating…' : 'Generate Token'}</button></div>
        </div>
      </form>

      {(data?.items.length ?? 0) === 0 ? <StateBlock title="No tokens issued" body="Generate a supporter token to grant access." /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Token</th><th>Created By</th><th>Expires</th><th>Uses</th><th>Redeemed</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {data?.items.map((t) => (
                <tr key={t.id}>
                  <td>{t.label}{t.boundUser ? <div style={{ fontSize: 11, color: 'var(--silver)' }}>bound to @{t.boundUser}</div> : null}</td>
                  <td>@{t.createdBy}</td>
                  <td>{t.expiresAt ? new Date(t.expiresAt).toLocaleString() : 'no expiry'}</td>
                  <td>{t.maximumUses ?? 'unlimited'}</td>
                  <td>{t.redemptionCount}</td>
                  <td><span className={`badge ${t.status === 'active' ? 'badge--green' : 'badge--red'}`}>{t.status}</span></td>
                  <td>{t.status === 'active' ? <button className="btn btn--ghost btn--sm" onClick={() => void revoke(t.id)}>Revoke</button> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
