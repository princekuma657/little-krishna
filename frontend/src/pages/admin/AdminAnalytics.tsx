import { useApi } from '../../hooks/useApi';
import { StateBlock } from '../../components/ui';

interface AnalyticsResponse {
  totals: { pageViews: number; contentViews: number; downloads: number; failedAuthorizations: number };
  topPages: Array<{ path: string; views: number }>;
  referrers: Array<{ referrer: string; views: number }>;
  timeline: Array<{ date: string; views: number }>;
  downloadStatuses: Array<{ status: string; count: number }>;
}

export function AdminAnalytics() {
  const { data, loading, error, reload } = useApi<AnalyticsResponse>('/admin/analytics');

  if (loading) return <div className="loading-block">Loading analytics…</div>;
  if (error) return <StateBlock title="Analytics unavailable" body={error} action={<button className="btn btn--outline" onClick={reload}>Retry</button>} />;
  if (!data) return null;

  const max = Math.max(1, ...data.topPages.map((p) => p.views));

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: 'clamp(30px, 3.4vw, 44px)' }}>Analytics</h1>
          <p style={{ marginTop: 10, color: 'var(--ink-on-dark)', fontSize: 14 }}>Last 30 days of page views, downloads and failed authorization events.</p>
        </div>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          { label: 'Page Views', value: data.totals.pageViews },
          { label: 'Content Views', value: data.totals.contentViews },
          { label: 'Completed Downloads', value: data.totals.downloads },
          { label: 'Failed Authorizations', value: data.totals.failedAuthorizations },
        ].map((s) => (
          <div className="stat-card" key={s.label}><div className="stat-card__value">{s.value}</div><div className="stat-card__label">{s.label}</div></div>
        ))}
      </div>

      <div className="grid grid--2" style={{ marginTop: 40, alignItems: 'start' }}>
        <div className="info-panel" style={{ position: 'static' }}>
          <h3>Top Pages</h3>
          {data.topPages.length === 0 ? <p style={{ color: 'var(--silver-2)', fontSize: 13, marginTop: 12 }}>No page views recorded yet.</p> : (
            <div style={{ display: 'grid', gap: 14, marginTop: 18 }}>
              {data.topPages.map((b) => (
                <div key={b.path}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ wordBreak: 'break-all' }}>{b.path}</span>
                    <span style={{ color: 'var(--muted-gold)' }}>{b.views}</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--charcoal-3)', borderRadius: 2 }}>
                    <div style={{ width: `${Math.round((b.views / max) * 100)}%`, height: '100%', background: 'var(--signal-red)', borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="info-panel" style={{ position: 'static' }}>
          <h3>Referrers</h3>
          {data.referrers.length === 0 ? <p style={{ color: 'var(--silver-2)', fontSize: 13, marginTop: 12 }}>No referrer data recorded.</p> : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead><tr><th>Referrer</th><th>Views</th></tr></thead>
                <tbody>{data.referrers.map((r) => <tr key={r.referrer}><td style={{ wordBreak: 'break-all' }}>{r.referrer}</td><td>{r.views}</td></tr>)}</tbody>
              </table>
            </div>
          )}
          <h3 style={{ marginTop: 30 }}>Download Events</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
            {data.downloadStatuses.map((s) => (
              <div key={s.status}><span className="badge">{s.status}</span> <strong>{s.count}</strong></div>
            ))}
          </div>
        </div>
      </div>

      <div className="info-panel" style={{ position: 'static', marginTop: 30 }}>
        <h3>Daily Page Views</h3>
        {data.timeline.length === 0 ? <p style={{ color: 'var(--silver-2)', fontSize: 13, marginTop: 12 }}>No daily traffic recorded yet.</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead><tr><th>Date</th><th>Views</th></tr></thead>
              <tbody>{data.timeline.map((t) => <tr key={t.date}><td>{t.date}</td><td>{t.views}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
