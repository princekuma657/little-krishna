import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { gsap } from 'gsap';
import { KeyRound, Download, HeartHandshake, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MARQUEE = 'SUPPORTER ACCESS · DONATION TOKENS · EARLY RELEASES · INDIAN RAILWAY SIMULATION';

export function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next');
  const destination = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl.fromTo('.auth-panel__eyebrow', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8 }, 0)
        .fromTo('.auth-panel__title', { opacity: 0, yPercent: 40 }, { opacity: 1, yPercent: 0, duration: 1.1 }, 0.1)
        .fromTo('.auth-panel__sub', { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.9 }, 0.35)
        .fromTo('.auth-panel__perks li', { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.7, stagger: 0.09 }, 0.5)
        .fromTo('.auth-panel__wordmark', { opacity: 0 }, { opacity: 1, duration: 0.7 }, 0.6)
        .fromTo('.auth-card', { opacity: 0, y: 60, rotate: 0.5 }, { opacity: 1, y: 0, rotate: 0, duration: 1 }, 0.3)
        .add(() => ref.current?.querySelector('.auth-card')?.classList.add('is-in'), 1.0)
        .fromTo('.auth-card .field', { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.12 }, 0.75);
    }, ref);
    return () => ctx.revert();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signUp(email, password, username, invitationCode);
      navigate(destination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="auth-wrap" ref={ref}>
      <div className="auth-panel">
        <div>
          <span className="auth-panel__eyebrow">Join The Workshop</span>
        </div>
        <div>
          <h1 className="auth-panel__title">
            Become A<br />
            <em>Supporter.</em>
          </h1>
          <p className="auth-panel__sub">
            Accounts on LittleKrishna exist to deliver supporter content and donation
            tokens. Match a donation through the team to unlock exclusive routes,
            workshop tools and early development releases.
          </p>
          <ul className="auth-panel__perks">
            <li><KeyRound /> Supporter tokens issued by the team</li>
            <li><Download /> Exclusive downloads and your history</li>
            <li><HeartHandshake /> Donations fund routes, tools and hosting</li>
            <li><ShieldCheck /> No ads, no selling tokens — ever</li>
          </ul>
        </div>
        <div className="auth-panel__wordmark">Little<span>Krishna</span></div>
        <div className="auth-panel__marquee" aria-hidden>
          <div className="auth-panel__marquee-track">
            <span>{MARQUEE}</span>
            <span>{MARQUEE}</span>
          </div>
        </div>
      </div>
      <div className="auth-pane">
        <div className="auth-card">
          <span className="eyebrow">Supporter Account</span>
          <h1>Create Account</h1>
          <p style={{ color: 'var(--ink-on-dark)', fontSize: 14, marginBottom: 28 }}>
            Create your account, then arrange a donation to receive supporter tokens.
          </p>
          <form onSubmit={submit}>
            {error ? <div className="form-error" style={{ marginBottom: 20 }}>{error}</div> : null}
            <div className="field">
              <label className="label" htmlFor="username">Username</label>
              <input id="username" className="input" required minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]+" title="Letters, numbers and underscores only" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="rail_fan_01" />
            </div>
            <div className="field">
              <label className="label" htmlFor="email">Email</label>
              <input id="email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="field">
              <label className="label" htmlFor="password">Password</label>
              <input id="password" className="input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 characters" />
            </div>
            <div className="field">
              <label className="label" htmlFor="invitationCode">Invitation Code</label>
              <input id="invitationCode" className="input" required value={invitationCode} onChange={(e) => setInvitationCode(e.target.value)} placeholder="LK-..." />
            </div>
            <button className="btn btn--primary btn--block" type="submit" disabled={busy}>
              {busy ? 'Creating Account…' : 'Create Account'}
            </button>
          </form>
          <p className="auth-alt">
            Already a supporter? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
