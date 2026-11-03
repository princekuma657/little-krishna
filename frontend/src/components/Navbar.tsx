import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
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
  const { pathname } = useLocation();

  // Routine use: pages whose top of page is a dark surface (home hero,
  // content detail covers, or the open mobile menu) need light nav text.
  const darkTop = pathname === '/' || pathname.startsWith('/content/');
  const overDark = open || (!scrolled && darkTop);
  const isAdmin = Boolean(user?.roles.some((role) => ADMIN_ROLES.includes(role)));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const linkDelay = (i: number) => (open ? `${90 + i * 42}ms` : '0ms');

  const doSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate('/');
  };

  return (
    <>
      <header className={`nav ${scrolled ? 'nav--scrolled' : ''} ${overDark ? 'nav--over-dark' : ''} ${open ? 'nav--open' : ''}`}>
        <div className="container nav__inner">
          <Link to="/" className="nav__logo" onClick={() => setOpen(false)}>
            <span className="nav__logo-mark">L</span>
            LittleKrishna
          </Link>
          <nav aria-label="Primary">
            <ul className="nav__links">
              {LINKS.map((l) => (
                <li key={l.to}>
                  <NavLink className={({ isActive }) => `nav__link ${isActive ? 'nav__link--active' : ''}`} to={l.to}>
                    <span className="roll"><span>{l.label}</span></span>
                  </NavLink>
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
              <span className="nav__burger-bar" />
              <span className="nav__burger-bar" />
              <span className="nav__burger-bar" />
            </button>
          </div>
        </div>
      </header>
      <div className={`nav__mobile ${open ? 'is-open' : ''}`} inert={!open} aria-hidden={!open}>
        {LINKS.map((l, i) => (
          <Link key={l.to} to={l.to} onClick={() => setOpen(false)} style={{ transitionDelay: linkDelay(i) }}>
            {l.label}
          </Link>
        ))}
        {user ? (
          <>
            <Link to="/profile" onClick={() => setOpen(false)} style={{ transitionDelay: linkDelay(LINKS.length) }}>Profile</Link>
            <Link to="/downloads" onClick={() => setOpen(false)} style={{ transitionDelay: linkDelay(LINKS.length + 1) }}>Downloads</Link>
            {isAdmin ? <Link to="/admin" onClick={() => setOpen(false)} style={{ transitionDelay: linkDelay(LINKS.length + 2) }}>Admin Console</Link> : null}
            <button className="btn btn--primary" onClick={() => void doSignOut()}>Sign Out</button>
          </>
        ) : (
          <>
            <Link to="/login" onClick={() => setOpen(false)} style={{ transitionDelay: linkDelay(LINKS.length) }}>Sign In</Link>
            <Link className="btn btn--primary" to="/register" onClick={() => setOpen(false)} style={{ transitionDelay: linkDelay(LINKS.length + 1) }}>Join The Community</Link>
          </>
        )}
      </div>
    </>
  );
}
