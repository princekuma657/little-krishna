import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ForgotPassword() {
  const { requestPasswordReset } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await requestPasswordReset(email);
      setDevResetUrl(res.devResetUrl ?? null);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset request failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 'calc(var(--nav-h) + 40px) 24px 40px', background: 'var(--midnight-2)' }}>
      <div className="auth-card" style={{ maxWidth: 460, width: '100%' }}>
        <span className="eyebrow">Account</span>
        <h1>Reset Password</h1>
        <p style={{ color: 'var(--ink-on-dark)', fontSize: 14, marginBottom: 28 }}>
          {sent ? 'If the account exists, a reset link has been issued.' : 'Enter your account email and we will issue a reset link.'}
        </p>
        {sent ? (
          <>
            {devResetUrl ? (
              <div className="form-notice" style={{ marginBottom: 20 }}>
                Local development has no email provider configured, so the reset link is shown here:
                <Link to={devResetUrl} style={{ display: 'block', marginTop: 8, color: 'var(--muted-gold)', wordBreak: 'break-all' }}>{devResetUrl}</Link>
              </div>
            ) : null}
            <button className="btn btn--primary btn--block" onClick={() => navigate('/login')}>
              Back To Sign In
            </button>
          </>
        ) : (
          <form onSubmit={submit}>
            {error ? <div className="form-error" style={{ marginBottom: 20 }}>{error}</div> : null}
            <div className="field">
              <label className="label" htmlFor="email">Email</label>
              <input id="email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <button className="btn btn--primary btn--block" type="submit" disabled={busy}>
              {busy ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>
        )}
        <p className="auth-alt">
          Remembered it? <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </section>
  );
}
