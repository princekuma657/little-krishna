import { useApi } from '../../hooks/useApi';
import { StateBlock } from '../../components/ui';

interface AuditRow {
  id: string;
  actor: string;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export function AdminAuditLogs() {
  const { data, loading, error, reload } = useApi<{ items: AuditRow[]; total: number }>('/admin/audit-logs?pageSize=100');

  if (loading) return <div className="loading-block">Loading audit logs…</div>;
  if (error) return <StateBlock title="Audit logs unavailable" body={error} action={<button className="btn btn--outline" onClick={reload}>Retry</button>} />;

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: 'clamp(30px, 3.4vw, 44px)' }}>Audit Logs</h1>
          <p style={{ marginTop: 10, color: 'var(--ink-on-dark)', fontSize: 14 }}>{data?.total ?? 0} recorded security and administrative events.</p>
        </div>
      </div>
      {(data?.items.length ?? 0) === 0 ? <StateBlock title="No audit events" body="Administrative activity will be recorded here." /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Target</th><th>Metadata</th></tr></thead>
            <tbody>
              {data?.items.map((a) => (
                <tr key={a.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(a.createdAt).toLocaleString()}</td>
                  <td>@{a.actor}</td>
                  <td>{a.action}</td>
                  <td>{a.targetType}{a.targetId ? <div style={{ fontSize: 11, color: 'var(--silver)' }}>{a.targetId.slice(0, 12)}…</div> : null}</td>
                  <td><code style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--silver-2)', wordBreak: 'break-all' }}>{JSON.stringify(a.metadata)}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
