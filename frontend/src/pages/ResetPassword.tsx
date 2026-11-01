import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, displayError } from '../services/api';

export function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const token = params.get('token') ?? '';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      navigate('/login');
    } catch (err) {
      setError(displayError(err));
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <section className="auth-wrap">
        <div className="auth-card">
          <h1>Invalid Reset Link</h1>
          <p style={{ color: 'var(--ink-on-dark)', fontSize: 14, marginBottom: 24 }}>This password reset link is missing its token.</p>
          <Link className="btn btn--primary btn--block" to="/forgot-password">Request A New Link</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="auth-wrap">
      <div className="auth-card">
        <span className="eyebrow">Account</span>
        <h1>Choose A New Password</h1>
        <form onSubmit={submit}>
          {error ? <div className="form-error" style={{ marginBottom: 20 }}>{error}</div> : null}
          <div className="field">
            <label className="label" htmlFor="new-password">New password</label>
            <input id="new-password" className="input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="confirm-password">Confirm password</label>
            <input id="confirm-password" className="input" type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <button className="btn btn--primary btn--block" type="submit" disabled={busy}>
            {busy ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </section>
  );
}
