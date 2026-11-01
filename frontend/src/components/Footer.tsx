import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div>
            <Link to="/" className="nav__logo" style={{ marginBottom: 18 }}>
              <span className="nav__logo-mark">L</span>
              LittleKrishna
            </Link>
            <p style={{ color: 'var(--ink-on-dark)', maxWidth: 340, fontSize: 14 }}>
              Indian railway simulation content, stories and community for MSTS, RailWorks and Train Simulator Classic.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
              <Link to="/contact" className="btn btn--ghost btn--sm" aria-label="Contact the LittleKrishna team"><Mail size={16} /></Link>
            </div>
          </div>
          <div>
            <h4 className="footer__title">Platform</h4>
            <Link className="footer__link" to="/the-railways">The Railways</Link>
            <Link className="footer__link" to="/routes">Routes</Link>
            <Link className="footer__link" to="/trains">Trains</Link>
            <Link className="footer__link" to="/gallery">Gallery</Link>
            <Link className="footer__link" to="/community">Community</Link>
          </div>
          <div>
            <h4 className="footer__title">Account</h4>
            <Link className="footer__link" to="/supporter">Supporter Zone</Link>
            <Link className="footer__link" to="/releases">Releases</Link>
            <Link className="footer__link" to="/profile">Profile</Link>
            <Link className="footer__link" to="/downloads">Downloads</Link>
            <Link className="footer__link" to="/settings">Settings</Link>
          </div>
          <div>
            <h4 className="footer__title">Legal</h4>
            <Link className="footer__link" to="/privacy">Privacy Policy</Link>
            <Link className="footer__link" to="/terms">Terms Of Service</Link>
            <Link className="footer__link" to="/contact">Contact</Link>
            <Link className="footer__link" to="/admin">Admin</Link>
          </div>
        </div>
        <div className="footer__bottom">
          <span>© {new Date().getFullYear()} LittleKrishna.com. All rights reserved.</span>
          <span>Indian Railway Simulation Content &amp; Community</span>
        </div>
      </div>
    </footer>
  );
}
