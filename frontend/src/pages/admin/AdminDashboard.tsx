import { Link } from 'react-router-dom';
import { Download, FileText, Users } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { StateBlock } from '../../components/ui';

interface DashboardResponse {
  stats: { totalUsers: number; monthlyActiveUsers: number; publishedContent: number; totalDownloads: number; failedDownloads: number; newUsersLast7Days: number };
  popularContent: Array<{ id: string; title: string; slug: string; downloads: number }>;
  recentUsers: Array<{ id: string; username: string; displayName: string; email: string; status: string; createdAt: string }>;
  failedEvents: Array<{ id: string; content: string; reason: string | null; createdAt: string }>;
  recentActivity: Array<{ id: string; action: string; targetType: string; createdAt: string; actor: string | null }>;
  recentContent: Array<{ id: string; title: string; slug: string; version: string; accessType: string; isPublished: number; updatedAt: string }>;
}

export function AdminDashboard() {
  const { data, loading, error, reload } = useApi<DashboardResponse>('/admin/dashboard');

  if (loading) return <div className="loading-block">Loading operational data…</div>;
  if (error) return <StateBlock title="Dashboard unavailable" body={error} action={<button className="btn btn--outline" onClick={reload}>Retry</button>} />;
  if (!data) return null;

  const stats = [
    { label: 'Published Content', value: data.stats.publishedContent, icon: FileText },
    { label: 'Registered Users', value: data.stats.totalUsers, icon: Users },
    { label: 'Completed Downloads', value: data.stats.totalDownloads, icon: Download },
    { label: 'Failed Downloads', value: data.stats.failedDownloads, icon: Download },
  ];

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: 'clamp(30px, 3.4vw, 44px)' }}>Dashboard</h1>
          <p style={{ marginTop: 10, color: 'var(--ink-on-dark)', fontSize: 14 }}>
            Live operational overview. {data.stats.newUsersLast7Days} new registrations this week · {data.stats.monthlyActiveUsers} active in 30 days.
          </p>
        </div>
        <Link className="btn btn--primary" to="/admin/content/create">+ New Content</Link>
      </div>

      <div className="stat-grid">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div className="stat-card" key={s.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="stat-card__value">{s.value}</div>
                <Icon size={20} color="var(--muted-gold)" />
              </div>
              <div className="stat-card__label">{s.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid--2" style={{ marginTop: 40, alignItems: 'start' }}>
        <div className="info-panel" style={{ position: 'static' }}>
          <h3>Recent Content</h3>
          <div style={{ display: 'grid', gap: 14 }}>
            {data.recentContent.map((c) => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, borderBottom: '1px solid var(--line)', paddingBottom: 14 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{c.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--silver)' }}>v{c.version} · {c.accessType}</div>
                </div>
                <span className={`badge ${c.isPublished ? 'badge--green' : 'badge--red'}`}>{c.isPublished ? 'published' : 'draft'}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="info-panel" style={{ position: 'static' }}>
          <h3>Most Downloaded</h3>
          <div style={{ display: 'grid', gap: 14 }}>
            {data.popularContent.map((c) => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, borderBottom: '1px solid var(--line)', paddingBottom: 14 }}>
                <Link to={`/content/${c.slug}`}>{c.title}</Link>
                <span style={{ color: 'var(--muted-gold)' }}>{c.downloads}</span>
              </div>
            ))}
          </div>
          <h3 style={{ marginTop: 30 }}>Recent Failed Events</h3>
          {data.failedEvents.length === 0 ? (
            <p style={{ marginTop: 12, fontSize: 13, color: 'var(--silver-2)' }}>No failed download events recorded.</p>
          ) : (
            <div style={{ display: 'grid', gap: 14, marginTop: 12 }}>
              {data.failedEvents.map((f) => (
                <div key={f.id} style={{ borderBottom: '1px solid var(--line)', paddingBottom: 14 }}>
                  <div style={{ fontWeight: 600 }}>{f.content}</div>
                  <div style={{ fontSize: 13, color: 'var(--signal-red)', marginTop: 4 }}>{f.reason ?? 'Unknown failure'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="info-panel" style={{ position: 'static', marginTop: 30 }}>
        <h3>Recent Administrative Activity</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>Actor</th><th>Action</th><th>Target</th><th>When</th></tr></thead>
            <tbody>
              {data.recentActivity.map((a) => (
                <tr key={a.id}>
                  <td>{a.actor ?? 'system'}</td>
                  <td>{a.action}</td>
                  <td>{a.targetType}</td>
                  <td>{new Date(a.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
