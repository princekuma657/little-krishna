import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { api, displayError } from '../../services/api';
import { StateBlock } from '../../components/ui';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'new' | 'handled' | 'archived';
  username: string | null;
  userId: string | null;
  createdAt: string;
  handledAt: string | null;
}

export function AdminMessages() {
  const [status, setStatus] = useState('');
  const { data, loading, error, reload } = useApi<{ items: ContactMessage[]; total: number }>(`/admin/messages?pageSize=100${status ? `&status=${status}` : ''}`);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const setMessageStatus = async (row: ContactMessage, next: 'new' | 'handled' | 'archived') => {
    setBusyId(row.id);
    setActionError(null);
    try {
      await api.patch(`/admin/messages/${row.id}`, { status: next });
      reload();
    } catch (err) {
      setActionError(displayError(err));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div className="loading-block">Loading contact messages...</div>;
  if (error) return <StateBlock title="Contact inbox unavailable" body={error} action={<button className="btn btn--outline" onClick={reload}>Retry</button>} />;

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: 'clamp(30px, 3.4vw, 44px)' }}>Messages</h1>
          <p style={{ marginTop: 10, color: 'var(--ink-on-dark)', fontSize: 14 }}>
            Contact form submissions stored in the database. No email is sent by this local build.
          </p>
        </div>
        <select className="select" style={{ maxWidth: 200 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="new">New</option>
          <option value="handled">Handled</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {actionError ? <div className="form-error" style={{ marginBottom: 20 }}>{actionError}</div> : null}

      {(data?.items ?? []).length === 0 ? <StateBlock title="No messages found" body="Contact submissions will appear here." /> : (
        <div style={{ display: 'grid', gap: 12 }}>
          {(data?.items ?? []).map((m) => (
            <article key={m.id} className="info-panel" style={{ position: 'static' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: 20 }}>{m.subject || '(no subject)'}</h3>
                  <p style={{ marginTop: 8, fontSize: 13, color: 'var(--silver)' }}>
                    {m.name} · {m.email}{m.username ? ` · @${m.username}` : ''} · {new Date(m.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className={`badge ${m.status === 'new' ? 'badge--gold' : m.status === 'handled' ? 'badge--green' : 'badge--red'}`}>{m.status}</span>
              </div>
              <p style={{ marginTop: 16, color: 'var(--ink-on-dark)', fontSize: 14, whiteSpace: 'pre-line' }}>
                {openId === m.id || m.message.length <= 260 ? m.message : `${m.message.slice(0, 260)}...`}
              </p>
              <div style={{ marginTop: 18, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {m.message.length > 260 ? (
                  <button className="btn btn--ghost btn--sm" onClick={() => setOpenId(openId === m.id ? null : m.id)}>{openId === m.id ? 'Collapse' : 'Read Full'}</button>
                ) : null}
                {m.status !== 'handled' ? <button className="btn btn--outline btn--sm" disabled={busyId === m.id} onClick={() => void setMessageStatus(m, 'handled')}>Mark Handled</button> : null}
                {m.status !== 'new' ? <button className="btn btn--outline btn--sm" disabled={busyId === m.id} onClick={() => void setMessageStatus(m, 'new')}>Mark New</button> : null}
                {m.status !== 'archived' ? <button className="btn btn--ghost btn--sm" disabled={busyId === m.id} onClick={() => void setMessageStatus(m, 'archived')}>Archive</button> : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
