import { useEffect, useMemo, useState } from 'react';
import { api, displayError } from '../../services/api';
import { StateBlock } from '../../components/ui';
import {
  Activity, AlertTriangle, Ban, Eye, Globe, MapPin, ShieldAlert, ShieldCheck,
  UserX, X, RefreshCw,
} from 'lucide-react';

interface SecurityDashboard {
  activeSessions: number;
  visitorsToday: number;
  visitors7d: number;
  visitors30d: number;
  failedLogins: number;
  blockedIps: number;
  openAlerts: number;
  countryRows: { country: string; n: number }[];
  cityRows: { city: string; country: string; n: number }[];
  recentAlerts: { id: string; severity: string; title: string; description: string; status: string; createdAt: string }[];
  recentEvents: { id: string; username: string | null; eventType: string; severity: string; createdAt: string }[];
}

interface Visitor {
  id: string; sessionId: string; ip: string; country: string; region: string; city: string;
  isp: string; asn: string; browser: string; os: string; deviceType: string; referrer: string;
  landingPage: string; userId: string | null; firstSeenAt: string; lastSeenAt: string;
  pageViews: number; isBlocked: boolean;
}

interface VisitorEvent { id: string; eventType: string; pagePath: string; metadata: Record<string, unknown>; ip: string; createdAt: string; }

interface Alert { id: string; severity: string; title: string; description: string; metadata: Record<string, unknown>; status: string; createdAt: string; acknowledgedBy: string | null; acknowledgedAt: string | null; }

interface IpRule { id: string; ip: string; ruleType: string; scope: string; reason: string; expiresAt: string | null; createdBy: string | null; createdAt: string; }

type Tab = 'overview' | 'visitors' | 'alerts' | 'ip' | 'settings';

const SEV_COLOR: Record<string, string> = {
  critical: '#c03b3b', high: '#c25a00', medium: '#6f7a0a', low: '#77811f', info: '#777970',
};

function Kpi({ label, value, icon: Icon, accent }: { label: string; value: number | string; icon: any; accent?: string }) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="eyebrow" style={{ fontSize: 10 }}>{label}</span>
        <Icon size={16} style={{ color: accent || 'var(--lime)' }} />
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 800, marginTop: 8, letterSpacing: '-0.02em' }}>
        {value}
      </div>
    </div>
  );
}

function BarChart({ rows, labelKey, valueKey }: { rows: any[]; labelKey: string; valueKey: string }) {
  const max = Math.max(1, ...rows.map((r) => r[valueKey]));
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 40px', gap: 10, alignItems: 'center', fontSize: 12 }}>
          <span style={{ color: 'var(--ink-on-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r[labelKey] || 'Unknown'}</span>
          <div style={{ height: 10, background: 'var(--charcoal-2)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(r[valueKey] / max) * 100}%`, background: 'linear-gradient(90deg, var(--lime), var(--lime-off))', borderRadius: 999, transition: 'width 0.6s var(--ease-out)' }} />
          </div>
          <span style={{ textAlign: 'right', fontWeight: 700 }}>{r[valueKey]}</span>
        </div>
      ))}
      {rows.length === 0 ? <p style={{ color: 'var(--silver)', fontSize: 13 }}>No data yet.</p> : null}
    </div>
  );
}

export function AdminSecurity() {
  const [tab, setTab] = useState<Tab>('overview');
  const [dashboard, setDashboard] = useState<SecurityDashboard | null>(null);
  const [visitors, setVisitors] = useState<{ items: Visitor[]; total: number } | null>(null);
  const [visitorFilter, setVisitorFilter] = useState({ country: '', ip: '' });
  const [selectedVisitor, setSelectedVisitor] = useState<{ session: Visitor; events: VisitorEvent[] } | null>(null);
  const [alerts, setAlerts] = useState<{ items: Alert[]; total: number } | null>(null);
  const [alertFilter, setAlertFilter] = useState({ status: '', severity: '' });
  const [ipRules, setIpRules] = useState<IpRule[]>([]);
  const [ipForm, setIpForm] = useState({ ip: '', ruleType: 'block', scope: 'temporary', reason: '', permanent: false, expiresAt: '' });
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadDashboard = async () => {
    try { const r = await api.get<{ data: SecurityDashboard }>('/admin/security/dashboard'); setDashboard(r.data); setError(null); }
    catch (e) { setError(displayError(e)); }
  };
  const loadVisitors = async () => {
    try {
      const q = new URLSearchParams();
      if (visitorFilter.country) q.set('country', visitorFilter.country);
      if (visitorFilter.ip) q.set('ip', visitorFilter.ip);
      setVisitors(await api.get<{ items: Visitor[]; total: number }>(`/admin/security/visitors?${q.toString()}`));
    } catch (e) { setError(displayError(e)); }
  };
  const loadAlerts = async () => {
    try {
      const q = new URLSearchParams();
      if (alertFilter.status) q.set('status', alertFilter.status);
      if (alertFilter.severity) q.set('severity', alertFilter.severity);
      setAlerts(await api.get<{ items: Alert[]; total: number }>(`/admin/security/alerts?${q.toString()}`));
    } catch (e) { setError(displayError(e)); }
  };
  const loadIpRules = async () => {
    try { const r = await api.get<{ items: IpRule[] }>('/admin/security/ip-rules'); setIpRules(r.items); }
    catch (e) { setError(displayError(e)); }
  };
  const loadSettings = async () => {
    try { const r = await api.get<{ settings: Record<string, unknown> }>('/admin/security/settings'); setSettings(r.settings); }
    catch (e) { setError(displayError(e)); }
  };

  useEffect(() => { void loadDashboard(); }, []);
  useEffect(() => { if (tab === 'visitors') void loadVisitors(); }, [tab, visitorFilter]);
  useEffect(() => { if (tab === 'alerts') void loadAlerts(); }, [tab, alertFilter]);
  useEffect(() => { if (tab === 'ip') void loadIpRules(); }, [tab]);
  useEffect(() => { if (tab === 'settings') void loadSettings(); }, [tab]);

  const openVisitor = async (v: Visitor) => {
    try {
      const r = await api.get<{ session: Visitor; events: VisitorEvent[] }>(`/admin/security/visitors/${encodeURIComponent(v.sessionId)}`);
      setSelectedVisitor({ session: r.session, events: r.events });
    } catch (e) { setError(displayError(e)); }
  };

  const acknowledge = async (id: string) => {
    setBusy(true);
    try { await api.post(`/admin/security/alerts/${id}/acknowledge`, {}); await loadAlerts(); }
    catch (e) { setError(displayError(e)); }
    finally { setBusy(false); }
  };

  const createIpRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/admin/security/ip-rules', {
        ip: ipForm.ip, ruleType: ipForm.ruleType, scope: ipForm.scope, reason: ipForm.reason,
        permanent: ipForm.permanent, expiresAt: ipForm.permanent ? undefined : (ipForm.expiresAt || undefined),
      });
      setIpForm({ ip: '', ruleType: 'block', scope: 'temporary', reason: '', permanent: false, expiresAt: '' });
      await loadIpRules();
    } catch (e) { setError(displayError(e)); }
    finally { setBusy(false); }
  };

  const deleteIpRule = async (id: string) => {
    if (!confirm('Remove this IP rule?')) return;
    setBusy(true);
    try { await api.delete(`/admin/security/ip-rules/${id}`); await loadIpRules(); }
    catch (e) { setError(displayError(e)); }
    finally { setBusy(false); }
  };

  const suspendAccount = async (userId: string) => {
    if (!confirm('Suspend this account?')) return;
    const reason = prompt('Reason (optional):') || '';
    setBusy(true);
    try { await api.post(`/admin/security/accounts/${userId}/suspend`, { reason }); await loadVisitors(); }
    catch (e) { setError(displayError(e)); }
    finally { setBusy(false); }
  };

  const revokeSessions = async (userId: string) => {
    if (!confirm('Revoke all sessions for this account?')) return;
    setBusy(true);
    try { await api.post(`/admin/security/accounts/${userId}/revoke-sessions`, {}); }
    catch (e) { setError(displayError(e)); }
    finally { setBusy(false); }
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setBusy(true);
    try { await api.patch('/admin/security/settings', settings); }
    catch (e) { setError(displayError(e)); }
    finally { setBusy(false); }
  };

  const refresh = () => {
    if (tab === 'overview') void loadDashboard();
    if (tab === 'visitors') void loadVisitors();
    if (tab === 'alerts') void loadAlerts();
    if (tab === 'ip') void loadIpRules();
    if (tab === 'settings') void loadSettings();
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'visitors', label: 'Visitors' },
    { id: 'alerts', label: 'Alerts' },
    { id: 'ip', label: 'IP Rules' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div>
      <div className="section-head" style={{ marginBottom: 18 }}>
        <span className="eyebrow">Security Center</span>
        <h2 className="section-title" style={{ fontSize: 'clamp(26px, 3vw, 40px)' }}>Visitor Intelligence & Threat Response</h2>
        <p className="section-sub">Live visitor sessions, IP management, automated alerts and account security actions. All data collected server-side; raw IPs restricted to administrators.</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap', alignItems: 'center' }}>
        {tabs.map((t) => (
          <button key={t.id} className={`btn ${tab === t.id ? 'btn--primary' : 'btn--outline'} btn--sm`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
        <button className="btn btn--ghost btn--sm" onClick={refresh} style={{ marginLeft: 'auto' }}><RefreshCw size={13} /> Refresh</button>
      </div>

      {error ? <div className="form-error" style={{ marginBottom: 18 }}>{error}</div> : null}

      {tab === 'overview' && (
        dashboard ? (
          <div style={{ display: 'grid', gap: 22 }}>
            <div className="grid grid--4">
              <Kpi label="Active Sessions (24h)" value={dashboard.activeSessions} icon={Activity} />
              <Kpi label="Visitors Today" value={dashboard.visitorsToday} icon={Eye} />
              <Kpi label="Visitors 7d" value={dashboard.visitors7d} icon={Globe} />
              <Kpi label="Visitors 30d" value={dashboard.visitors30d} icon={Globe} />
              <Kpi label="Failed Logins (24h)" value={dashboard.failedLogins} icon={ShieldAlert} accent="#ff6b00" />
              <Kpi label="Blocked IPs" value={dashboard.blockedIps} icon={Ban} accent="#ff4d4d" />
              <Kpi label="Open Alerts" value={dashboard.openAlerts} icon={AlertTriangle} accent="#d7ff00" />
            </div>

            <div className="grid grid--2">
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 16, marginBottom: 14 }}>Top Countries</h3>
                <BarChart rows={dashboard.countryRows.map((r) => ({ label: r.country, value: r.n }))} labelKey="label" valueKey="value" />
              </div>
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 16, marginBottom: 14 }}>Top Cities</h3>
                <BarChart rows={dashboard.cityRows.map((r) => ({ label: `${r.city}, ${r.country}`, value: r.n }))} labelKey="label" valueKey="value" />
              </div>
            </div>

            <div className="grid grid--2">
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 16, marginBottom: 14 }}>Recent Alerts</h3>
                {dashboard.recentAlerts.length === 0 ? <p style={{ color: 'var(--silver)', fontSize: 13 }}>No alerts.</p> : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {dashboard.recentAlerts.map((a) => (
                      <div key={a.id} style={{ borderLeft: `3px solid ${SEV_COLOR[a.severity] || '#888'}`, padding: '8px 12px', background: 'var(--charcoal-2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <strong style={{ color: SEV_COLOR[a.severity] }}>{a.severity.toUpperCase()}</strong>
                          <span style={{ color: 'var(--silver)' }}>{new Date(a.createdAt).toLocaleString()}</span>
                        </div>
                        <div style={{ fontWeight: 700, marginTop: 4 }}>{a.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-on-dark)', marginTop: 2 }}>{a.description}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 16, marginBottom: 14 }}>Recent Security Events</h3>
                {dashboard.recentEvents.length === 0 ? <p style={{ color: 'var(--silver)', fontSize: 13 }}>No events.</p> : (
                  <div style={{ display: 'grid', gap: 6, fontSize: 12 }}>
                    {dashboard.recentEvents.map((e) => (
                      <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                        <span style={{ color: SEV_COLOR[e.severity] || 'var(--warm-white)' }}>{e.eventType}</span>
                        <span style={{ color: 'var(--silver)' }}>{e.username || 'anon'}</span>
                        <span style={{ color: 'var(--silver)' }}>{new Date(e.createdAt).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : <StateBlock title="Loading security dashboard…" />
      )}

      {tab === 'visitors' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input className="input" placeholder="Country" value={visitorFilter.country} onChange={(e) => setVisitorFilter({ ...visitorFilter, country: e.target.value })} style={{ maxWidth: 200 }} />
            <input className="input" placeholder="IP contains" value={visitorFilter.ip} onChange={(e) => setVisitorFilter({ ...visitorFilter, ip: e.target.value })} style={{ maxWidth: 200 }} />
            <button className="btn btn--outline btn--sm" onClick={() => void loadVisitors()}>Filter</button>
          </div>
          {visitors ? (
            <div className="card" style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--line-strong)' }}>
                    <th style={{ padding: 10 }}>IP</th><th style={{ padding: 10 }}>Location</th><th style={{ padding: 10 }}>Browser / OS</th><th style={{ padding: 10 }}>Device</th><th style={{ padding: 10 }}>Views</th><th style={{ padding: 10 }}>Last Active</th><th style={{ padding: 10 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visitors.items.map((v) => (
                    <tr key={v.id} style={{ borderBottom: '1px solid var(--line)', cursor: 'pointer' }} onClick={() => void openVisitor(v)}>
                      <td style={{ padding: 10, fontFamily: 'var(--font-mono)', fontSize: 11 }}>{v.ip}</td>
                      <td style={{ padding: 10 }}>{v.city}, {v.country}</td>
                      <td style={{ padding: 10 }}>{v.browser} / {v.os}</td>
                      <td style={{ padding: 10 }}>{v.deviceType}</td>
                      <td style={{ padding: 10 }}>{v.pageViews}</td>
                      <td style={{ padding: 10 }}>{new Date(v.lastSeenAt).toLocaleString()}</td>
                      <td style={{ padding: 10 }} onClick={(e) => e.stopPropagation()}>
                        {v.userId ? (
                          <>
                            <button className="btn btn--ghost btn--sm" style={{ padding: '4px 8px', fontSize: 10 }} onClick={() => void suspendAccount(v.userId!)}>Suspend</button>{' '}
                            <button className="btn btn--ghost btn--sm" style={{ padding: '4px 8px', fontSize: 10 }} onClick={() => void revokeSessions(v.userId!)}>Revoke</button>
                          </>
                        ) : <span style={{ color: 'var(--silver)' }}>anon</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: 12, fontSize: 12, color: 'var(--silver)' }}>Total: {visitors.total}</div>
            </div>
          ) : <StateBlock title="Loading visitors…" />}
        </div>
      )}

      {tab === 'alerts' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <select className="input" value={alertFilter.status} onChange={(e) => setAlertFilter({ ...alertFilter, status: e.target.value })} style={{ maxWidth: 160 }}>
              <option value="">All statuses</option><option value="open">Open</option><option value="acknowledged">Acknowledged</option>
            </select>
            <select className="input" value={alertFilter.severity} onChange={(e) => setAlertFilter({ ...alertFilter, severity: e.target.value })} style={{ maxWidth: 160 }}>
              <option value="">All severities</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
            </select>
            <button className="btn btn--outline btn--sm" onClick={() => void loadAlerts()}>Filter</button>
          </div>
          {alerts ? (
            <div className="card" style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--line-strong)' }}>
                    <th style={{ padding: 10 }}>Severity</th><th style={{ padding: 10 }}>Title</th><th style={{ padding: 10 }}>Description</th><th style={{ padding: 10 }}>Status</th><th style={{ padding: 10 }}>Created</th><th style={{ padding: 10 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.items.map((a) => (
                    <tr key={a.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: 10 }}><span style={{ color: SEV_COLOR[a.severity], fontWeight: 700 }}>{a.severity.toUpperCase()}</span></td>
                      <td style={{ padding: 10, fontWeight: 700 }}>{a.title}</td>
                      <td style={{ padding: 10, color: 'var(--ink-on-dark)' }}>{a.description}</td>
                      <td style={{ padding: 10 }}>{a.status}</td>
                      <td style={{ padding: 10 }}>{new Date(a.createdAt).toLocaleString()}</td>
                      <td style={{ padding: 10 }}>
                        {a.status === 'open' ? <button className="btn btn--primary btn--sm" onClick={() => void acknowledge(a.id)} disabled={busy}>Acknowledge</button> : <span style={{ color: 'var(--silver)' }}>done</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: 12, fontSize: 12, color: 'var(--silver)' }}>Total: {alerts.total}</div>
            </div>
          ) : <StateBlock title="Loading alerts…" />}
        </div>
      )}

      {tab === 'ip' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <form onSubmit={createIpRule} className="card" style={{ padding: 20, display: 'grid', gap: 12 }}>
            <h3 style={{ fontSize: 16 }}>Add IP Rule</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <input className="input" placeholder="IP address" value={ipForm.ip} onChange={(e) => setIpForm({ ...ipForm, ip: e.target.value })} required />
              <select className="input" value={ipForm.ruleType} onChange={(e) => setIpForm({ ...ipForm, ruleType: e.target.value })}>
                <option value="block">Block</option><option value="allow">Allow (allowlist)</option>
              </select>
              <select className="input" value={ipForm.scope} onChange={(e) => setIpForm({ ...ipForm, scope: e.target.value })}>
                <option value="temporary">Temporary</option><option value="permanent">Permanent</option>
              </select>
              <input className="input" placeholder="Reason" value={ipForm.reason} onChange={(e) => setIpForm({ ...ipForm, reason: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                <input type="checkbox" checked={ipForm.permanent} onChange={(e) => setIpForm({ ...ipForm, permanent: e.target.checked })} /> Permanent (no expiry)
              </label>
              {!ipForm.permanent ? (
                <input className="input" type="datetime-local" value={ipForm.expiresAt} onChange={(e) => setIpForm({ ...ipForm, expiresAt: e.target.value })} style={{ maxWidth: 260 }} />
              ) : null}
              <button className="btn btn--primary btn--sm" type="submit" disabled={busy}>Add Rule</button>
            </div>
          </form>

          <div className="card" style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--line-strong)' }}>
                  <th style={{ padding: 10 }}>IP</th><th style={{ padding: 10 }}>Type</th><th style={{ padding: 10 }}>Scope</th><th style={{ padding: 10 }}>Reason</th><th style={{ padding: 10 }}>Expires</th><th style={{ padding: 10 }}>Created</th><th style={{ padding: 10 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {ipRules.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: 10, fontFamily: 'var(--font-mono)', fontSize: 11 }}>{r.ip}</td>
                    <td style={{ padding: 10, color: r.ruleType === 'block' ? '#c03b3b' : '#2e6446', fontWeight: 700 }}>{r.ruleType.toUpperCase()}</td>
                    <td style={{ padding: 10 }}>{r.scope}</td>
                    <td style={{ padding: 10, color: 'var(--ink-on-dark)' }}>{r.reason || '—'}</td>
                    <td style={{ padding: 10 }}>{r.expiresAt ? new Date(r.expiresAt).toLocaleString() : 'Never'}</td>
                    <td style={{ padding: 10 }}>{new Date(r.createdAt).toLocaleString()}</td>
                    <td style={{ padding: 10 }}>
                      <button className="btn btn--ghost btn--sm" style={{ padding: '4px 8px', fontSize: 10 }} onClick={() => void deleteIpRule(r.id)}><X size={12} /> Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ipRules.length === 0 ? <p style={{ padding: 12, color: 'var(--silver)', fontSize: 13 }}>No IP rules.</p> : null}
          </div>
        </div>
      )}

      {tab === 'settings' && (
        settings ? (
          <form onSubmit={saveSettings} className="card" style={{ padding: 24, display: 'grid', gap: 16, maxWidth: 640 }}>
            <h3 style={{ fontSize: 18 }}>Security Settings</h3>
            <div className="field">
              <label className="label">Retention Days</label>
              <input className="input" type="number" value={Number(settings.retentionDays ?? 90)} onChange={(e) => setSettings({ ...settings, retentionDays: Number(e.target.value) })} />
            </div>
            <div className="field">
              <label className="label">Country Policy</label>
              <select className="input" value={String(settings.countryPolicy ?? 'allow_all')} onChange={(e) => setSettings({ ...settings, countryPolicy: e.target.value })}>
                <option value="allow_all">Allow all countries</option>
                <option value="india_only">India only</option>
                <option value="challenge_foreign">Challenge foreign visitors</option>
              </select>
            </div>
            <div className="field">
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                <input type="checkbox" checked={Boolean(settings.blockVpn)} onChange={(e) => setSettings({ ...settings, blockVpn: e.target.checked })} /> Treat VPN/proxy as high risk
              </label>
            </div>
            <div className="field">
              <label className="label">Rate Limit Threshold (req/min per IP)</label>
              <input className="input" type="number" value={Number(settings.rateLimitThreshold ?? 100)} onChange={(e) => setSettings({ ...settings, rateLimitThreshold: Number(e.target.value) })} />
            </div>
            <div className="field">
              <label className="label">Alert Threshold (failed logins)</label>
              <input className="input" type="number" value={Number(settings.alertThreshold ?? 5)} onChange={(e) => setSettings({ ...settings, alertThreshold: Number(e.target.value) })} />
            </div>
            <button className="btn btn--primary" type="submit" disabled={busy}>Save Settings</button>
          </form>
        ) : <StateBlock title="Loading settings…" />
      )}

      {selectedVisitor ? (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50, display: 'grid', placeItems: 'center', padding: 20 }} onClick={() => setSelectedVisitor(null)}>
          <div className="card" style={{ maxWidth: 720, width: '100%', maxHeight: '80vh', overflow: 'auto', padding: 24 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18 }}>Visitor Timeline</h3>
              <button className="btn btn--ghost btn--sm" onClick={() => setSelectedVisitor(null)}><X size={14} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, marginBottom: 16 }}>
              <div><strong>IP:</strong> {selectedVisitor.session.ip}</div>
              <div><strong>Location:</strong> {selectedVisitor.session.city}, {selectedVisitor.session.region}, {selectedVisitor.session.country}</div>
              <div><strong>ISP/ASN:</strong> {selectedVisitor.session.isp} / {selectedVisitor.session.asn}</div>
              <div><strong>Browser/OS:</strong> {selectedVisitor.session.browser} / {selectedVisitor.session.os}</div>
              <div><strong>Device:</strong> {selectedVisitor.session.deviceType}</div>
              <div><strong>Views:</strong> {selectedVisitor.session.pageViews}</div>
              <div><strong>First seen:</strong> {new Date(selectedVisitor.session.firstSeenAt).toLocaleString()}</div>
              <div><strong>Last active:</strong> {new Date(selectedVisitor.session.lastSeenAt).toLocaleString()}</div>
            </div>
            <h4 style={{ fontSize: 14, marginBottom: 8 }}>Event Timeline</h4>
            <div style={{ display: 'grid', gap: 6 }}>
              {selectedVisitor.events.map((e) => (
                <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 10, fontSize: 12, padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                  <span style={{ color: 'var(--silver)' }}>{new Date(e.createdAt).toLocaleString()}</span>
                  <span><strong style={{ color: 'var(--lime)' }}>{e.eventType}</strong> {e.pagePath ? `— ${e.pagePath}` : ''}</span>
                </div>
              ))}
              {selectedVisitor.events.length === 0 ? <p style={{ color: 'var(--silver)', fontSize: 13 }}>No events.</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

