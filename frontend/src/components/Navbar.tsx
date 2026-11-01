import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/the-railways', label: 'The Railways' },
  { to: '/routes', label: 'Routes' },
  { to: '/trains', label: 'Trains' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/community', label: 'Community' },
  { to: '/releases', label: 'Releases' },
  { to: '/supporter', label: 'Supporter' },
];

const ADMIN_ROLES = ['super_admin', 'content_manager', 'support_manager', 'analytics_viewer'];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { user, status, signOut } = useAuth();
  const navigate = useNavigate();
  const isAdmin = Boolean(user?.roles.some((role) => ADMIN_ROLES.includes(role)));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const doSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate('/');
  };

  return (
    <>
      <header className={`nav ${scrolled ? 'nav--scrolled' : ''}`}>
        <div className="container nav__inner">
          <Link to="/" className="nav__logo" onClick={() => setOpen(false)}>
            <span className="nav__logo-mark">L</span>
            LittleKrishna
          </Link>
          <nav aria-label="Primary">
            <ul className="nav__links">
              {LINKS.map((l) => (
                <li key={l.to}>
                  <Link className="nav__link" to={l.to}>
                    <span className="roll"><span>{l.label}</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="nav__actions">
            {status === 'loading' ? null : user ? (
              <>
                {isAdmin ? <Link className="btn btn--outline btn--sm" to="/admin">Admin</Link> : null}
                <Link className="btn btn--outline btn--sm" to="/profile">@{user.username}</Link>
                <button className="btn btn--primary btn--sm" onClick={() => void doSignOut()}>Sign Out</button>
              </>
            ) : (
              <>
                <Link className="btn btn--outline btn--sm" to="/login">Sign In</Link>
                <Link className="btn btn--primary btn--sm" to="/register">Join</Link>
              </>
            )}
            <button className="nav__burger" aria-label="Toggle navigation" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ width: 18, height: 2, background: 'currentColor' }} />
                <span style={{ width: 18, height: 2, background: 'currentColor' }} />
                <span style={{ width: 18, height: 2, background: 'currentColor' }} />
              </span>
            </button>
          </div>
        </div>
      </header>
      {open ? (
        <div className="nav__mobile">
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link to="/profile" onClick={() => setOpen(false)}>Profile</Link>
              <Link to="/downloads" onClick={() => setOpen(false)}>Downloads</Link>
              {isAdmin ? <Link to="/admin" onClick={() => setOpen(false)}>Admin Console</Link> : null}
              <button className="btn btn--primary" onClick={() => void doSignOut()}>Sign Out</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setOpen(false)}>Sign In</Link>
              <Link className="btn btn--primary" to="/register" onClick={() => setOpen(false)}>Join The Community</Link>
            </>
          )}
        </div>
      ) : null}
    </>
  );
}
