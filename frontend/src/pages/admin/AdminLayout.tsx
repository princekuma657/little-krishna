import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  BarChart3, Crown, Download, FileText, FolderTree, Image, KeyRound, Layers,
  LayoutDashboard, Megaphone, Mail, ScrollText, Settings, ShieldCheck, ShieldAlert, Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { StateBlock } from '../../components/ui';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/content', label: 'Content', icon: FileText },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree },
  { to: '/admin/collections', label: 'Collections', icon: Layers },
  { to: '/admin/gallery', label: 'Gallery', icon: Image },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/downloads', label: 'Downloads', icon: Download },
  { to: '/admin/tokens', label: 'Tokens', icon: KeyRound },
  { to: '/admin/supporters', label: 'Supporters', icon: Crown },
  { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/admin/messages', label: 'Messages', icon: Mail },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
  { to: '/admin/security', label: 'Security Center', icon: ShieldAlert },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminLayout() {
  const { user, status, signOut } = useAuth();
  const { pathname } = useLocation();
  const isAdmin = Boolean(user?.roles.some((r) => ['super_admin', 'content_manager', 'support_manager', 'analytics_viewer', 'security_admin'].includes(r)));

  if (status === 'loading') {
    return <section className="section"><div className="container"><div className="loading-block">Verifying administrator session…</div></div></section>;
  }

  if (status !== 'authenticated' || !user) {
    return (
      <section className="section">
        <div className="container">
          <StateBlock
            title="Administrator sign-in required"
            body="The LittleKrishna admin console is protected by server-side role checks. Sign in with an administrator account."
            action={<Link className="btn btn--primary" to="/login?next=/admin">Administrator Sign In</Link>}
          />
        </div>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className="section">
        <div className="container">
          <StateBlock
            title="Access denied"
            body="Your account does not hold an administrator role. This decision is enforced by the API, not only by this page."
            action={<Link className="btn btn--outline" to="/">Return To Site</Link>}
          />
        </div>
      </section>
    );
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div style={{ padding: '0 14px 22px', borderBottom: '1px solid var(--line)', marginBottom: 18 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', fontSize: 15 }}>
            Little<span style={{ color: 'var(--signal-red)' }}>Krishna</span>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, letterSpacing: '0.28em', color: 'var(--silver)', marginTop: 6, textTransform: 'uppercase' }}>
              Admin Console
            </div>
          </div>
        </div>
        <nav style={{ display: 'grid', gap: 4 }}>
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to} className={active ? 'admin-sidebar__link admin-sidebar__link--active' : 'admin-sidebar__link'}>
                <Icon size={16} />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div style={{ marginTop: 34, padding: '18px 14px', border: '1px solid var(--line)', background: 'var(--charcoal)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 12, color: 'var(--muted-gold)', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>
            <ShieldCheck size={16} /> {user.roles.includes('super_admin') ? 'Super admin' : user.roles[0]}
          </div>
          <p style={{ marginTop: 10, fontSize: 12, color: 'var(--ink-on-dark)' }}>@{user.username}</p>
          <p style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-on-dark)' }}>
            All admin actions are validated server-side and written to the audit log.
          </p>
          <button className="btn btn--ghost btn--sm" style={{ marginTop: 12 }} onClick={() => void signOut()}>Sign Out</button>
        </div>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
