import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { StateBlock } from '../../components/ui';

interface DownloadRow {
  id: string;
  contentTitle: string;
  version: string;
  status: string;
  authorizedAt: string;
  completedAt: string | null;
  fileSizeMb: number | null;
  username: string;
  displayName: string;
  failureReason: string | null;
}

export function AdminDownloads() {
  const [status, setStatus] = useState('');
  const path = status ? `/admin/downloads?status=${encodeURIComponent(status)}` : '/admin/downloads';
  const { data, loading, error, reload } = useApi<{ items: DownloadRow[]; total: number }>(path);

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: 'clamp(30px, 3.4vw, 44px)' }}>Downloads</h1>
          <p style={{ marginTop: 10, color: 'var(--ink-on-dark)', fontSize: 14 }}>Authorization and completion events recorded by the API.</p>
        </div>
        <select className="select" style={{ maxWidth: 220 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="authorized">Authorized</option>
          <option value="started">Started</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {loading ? <div className="loading-block">Loading download events…</div> : error ? (
        <StateBlock title="Downloads unavailable" body={error} action={<button className="btn btn--outline" onClick={reload}>Retry</button>} />
      ) : (data?.items.length ?? 0) === 0 ? (
        <StateBlock title="No download events" body="Authorized downloads will appear here." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>User</th><th>Content</th><th>Version</th><th>Status</th><th>Authorized</th><th>Completed</th><th>Size</th></tr></thead>
            <tbody>
              {data?.items.map((d) => (
                <tr key={d.id}>
                  <td>@{d.username}</td>
                  <td>{d.contentTitle}</td>
                  <td>v{d.version}</td>
                  <td>
                    <span className={`badge ${d.status === 'completed' ? 'badge--green' : d.status === 'failed' ? 'badge--red' : ''}`}>{d.status}</span>
                    {d.failureReason ? <div style={{ fontSize: 11, color: 'var(--signal-red)', marginTop: 4 }}>{d.failureReason}</div> : null}
                  </td>
                  <td>{new Date(d.authorizedAt).toLocaleString()}</td>
                  <td>{d.completedAt ? new Date(d.completedAt).toLocaleString() : '—'}</td>
                  <td>{d.fileSizeMb ? `${d.fileSizeMb} MB` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
