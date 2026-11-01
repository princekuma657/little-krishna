import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, displayError } from '../services/api';
import { StateBlock } from '../components/ui';
import { Download, Bell, Settings, User as UserIcon } from 'lucide-react';

const TABS = [
  { path: '/profile', label: 'Profile', icon: UserIcon },
  { path: '/downloads', label: 'Downloads', icon: Download },
  { path: '/notifications', label: 'Notifications', icon: Bell },
  { path: '/settings', label: 'Settings', icon: Settings },
];

interface DownloadRecord {
  id: string;
  contentSlug: string;
  contentTitle: string;
  version: string;
  status: string;
  authorizedAt: string;
  completedAt: string | null;
  failureReason: string | null;
  fileSizeMb: number | null;
}

interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export function Profile() {
  const { user, status, entitlements, signOut, refresh, updateUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = TABS.find((t) => location.pathname.startsWith(t.path))?.path ?? '/profile';

  const [downloads, setDownloads] = useState<DownloadRecord[] | null>(null);
  const [notifications, setNotifications] = useState<NotificationRecord[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor ?? '#b2c73a');
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(user?.displayName ?? '');
    setUsername(user?.username ?? '');
    setAvatarColor(user?.avatarColor ?? '#b2c73a');
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    const path = activeTab === '/downloads' ? '/downloads/history' : activeTab === '/notifications' ? '/profile/notifications' : null;
    if (!path) {
      setLoading(false);
      return;
    }
    api.get<{ items: DownloadRecord[] | NotificationRecord[] }>(path)
      .then((res) => {
        if (cancelled) return;
        if (activeTab === '/downloads') setDownloads(res.items as DownloadRecord[]);
        else setNotifications(res.items as NotificationRecord[]);
      })
      .catch((err) => { if (!cancelled) setLoadError(displayError(err)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab, user]);

  if (status === 'loading') {
    return <section className="section"><div className="container"><div className="loading-block">Checking your account…</div></div></section>;
  }

  if (status !== 'authenticated' || !user) {
    return (
      <section className="section">
        <div className="container">
          <StateBlock
            title="Sign in required"
            body="Your profile, downloads and notifications live behind an authenticated account."
            action={<Link className="btn btn--primary" to={`/login?next=${encodeURIComponent(location.pathname)}`}>Sign In</Link>}
          />
        </div>
      </section>
    );
  }

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsNotice(null);
    setSettingsError(null);
    try {
      const res = await api.patch<{ user: typeof user }>('/profile', { displayName, username, avatarColor });
      updateUser(res.user);
      setSettingsNotice('Profile updated.');
    } catch (err) {
      setSettingsError(displayError(err));
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordNotice(null);
    setSettingsError(null);
    try {
      await api.post('/profile/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setPasswordNotice('Password changed. Other sessions will need to sign in again.');
    } catch (err) {
      setSettingsError(displayError(err));
    }
  };

  const markAllRead = async () => {
    try {
      await api.post('/profile/notifications/read', {});
      setNotifications((items) => items?.map((n) => ({ ...n, isRead: true })) ?? null);
    } catch (err) {
      setLoadError(displayError(err));
    }
  };

  return (
    <section className="section">
      <div className="container">
        <div className="crumbs" style={{ marginBottom: 22 }}>
          <span>Account</span>
        </div>
        <div className="tabs" style={{ marginBottom: 40 }}>
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.path} className={`tab ${activeTab === t.path ? 'tab--active' : ''}`} onClick={() => navigate(t.path)}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icon size={14} /> {t.label}</span>
              </button>
            );
          })}
        </div>

        {activeTab === '/profile' ? (
          <div className="grid grid--2" style={{ alignItems: 'start' }}>
            <div className="info-panel" style={{ position: 'static' }}>
              <h3>Profile</h3>
              <dl>
                <div className="info-row"><dt>Username</dt><dd>@{user.username}</dd></div>
                <div className="info-row"><dt>Display Name</dt><dd>{user.displayName}</dd></div>
                <div className="info-row"><dt>Email</dt><dd>{user.email}</dd></div>
                <div className="info-row"><dt>Status</dt><dd>{user.accountStatus}</dd></div>
                <div className="info-row"><dt>Member Since</dt><dd>{new Date(user.createdAt).toLocaleDateString()}</dd></div>
                <div className="info-row"><dt>Roles</dt><dd>{user.roles.length ? user.roles.join(', ') : 'Member'}</dd></div>
                <div className="info-row"><dt>Supporter</dt><dd>{user.supporter ? `Active until ${user.supporter.expiresAt ? new Date(user.supporter.expiresAt).toLocaleDateString() : 'no expiry'}` : 'None'}</dd></div>
                <div className="info-row"><dt>Unlocked Content</dt><dd>{entitlements.length}</dd></div>
              </dl>
            </div>
            <div className="info-panel" style={{ position: 'static' }}>
              <h3>Account Security</h3>
              <p style={{ color: 'var(--ink-on-dark)', fontSize: 14 }}>
                Privileged role changes and supporter entitlement grants are managed exclusively by administrators. This panel is informational only.
              </p>
              <p style={{ color: 'var(--ink-on-dark)', fontSize: 14, marginTop: 12 }}>
                Downloads are authorized server-side for every request. Signing out clears your session cookie.
              </p>
              <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button className="btn btn--outline" onClick={() => void signOut()}>Sign Out</button>
                <button className="btn btn--ghost" onClick={() => void refresh()}>Refresh Account</button>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === '/downloads' ? (
          loading ? <div className="loading-block">Loading download history…</div> : loadError ? (
            <StateBlock title="Download history unavailable" body={loadError} action={<button className="btn btn--outline" onClick={() => navigate(0)}>Retry</button>} />
          ) : !downloads || downloads.length === 0 ? (
            <StateBlock title="No downloads yet" body="Downloaded content will appear here with authorization and completion times." action={<Link className="btn btn--primary" to="/releases">Browse Releases</Link>} />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Content</th><th>Version</th><th>Status</th><th>Authorized</th><th>Completed</th><th>Size</th></tr></thead>
                <tbody>
                  {downloads.map((d) => (
                    <tr key={d.id}>
                      <td><Link to={`/content/${d.contentSlug}`}>{d.contentTitle}</Link></td>
                      <td>v{d.version}</td>
                      <td><span className={`badge ${d.status === 'completed' ? 'badge--green' : d.status === 'failed' ? 'badge--red' : ''}`}>{d.status}</span></td>
                      <td>{new Date(d.authorizedAt).toLocaleString()}</td>
                      <td>{d.completedAt ? new Date(d.completedAt).toLocaleString() : '—'}</td>
                      <td>{d.fileSizeMb ? `${d.fileSizeMb} MB` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}

        {activeTab === '/notifications' ? (
          loading ? <div className="loading-block">Loading notifications…</div> : loadError ? (
            <StateBlock title="Notifications unavailable" body={loadError} />
          ) : !notifications || notifications.length === 0 ? (
            <StateBlock title="No notifications yet" body="Release announcements and supporter updates will appear here." />
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button className="btn btn--outline btn--sm" onClick={() => void markAllRead()}>Mark All Read</button>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                {notifications.map((n) => (
                  <article key={n.id} className="info-panel" style={{ position: 'static', borderColor: n.isRead ? 'var(--line)' : 'rgba(198,165,106,0.45)' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: 18 }}>{n.title}</h3>
                      <span className="badge">{n.isRead ? 'read' : 'new'}</span>
                    </div>
                    <p style={{ color: 'var(--ink-on-dark)', fontSize: 14, marginTop: 10 }}>{n.message}</p>
                    <p style={{ color: 'var(--silver-2)', fontSize: 12, marginTop: 10 }}>{new Date(n.createdAt).toLocaleString()}</p>
                  </article>
                ))}
              </div>
            </>
          )
        ) : null}

        {activeTab === '/settings' ? (
          <div className="grid grid--2" style={{ alignItems: 'start' }}>
            <form className="info-panel" style={{ position: 'static' }} onSubmit={saveProfile}>
              <h3>Profile Settings</h3>
              {settingsNotice ? <div className="form-notice" style={{ marginBottom: 16 }}>{settingsNotice}</div> : null}
              {settingsError ? <div className="form-error" style={{ marginBottom: 16 }}>{settingsError}</div> : null}
              <div className="field"><label className="label">Display name</label><input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required maxLength={60} /></div>
              <div className="field"><label className="label">Username</label><input className="input" value={username} onChange={(e) => setUsername(e.target.value)} required /></div>
              <div className="field"><label className="label">Avatar colour</label><input className="input" type="color" value={avatarColor} onChange={(e) => setAvatarColor(e.target.value)} /></div>
              <button className="btn btn--primary" type="submit">Save Profile</button>
            </form>
            <form className="info-panel" style={{ position: 'static' }} onSubmit={changePassword}>
              <h3>Change Password</h3>
              {passwordNotice ? <div className="form-notice" style={{ marginBottom: 16 }}>{passwordNotice}</div> : null}
              <div className="field"><label className="label">Current password</label><input className="input" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required /></div>
              <div className="field"><label className="label">New password</label><input className="input" type="password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /></div>
              <button className="btn btn--outline" type="submit">Update Password</button>
            </form>
          </div>
        ) : null}
      </div>
    </section>
  );
}
