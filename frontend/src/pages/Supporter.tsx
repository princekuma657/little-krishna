import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CONTENT } from '../data/content';
import { useAuth } from '../context/AuthContext';
import { api, displayError } from '../services/api';
import { StateBlock } from '../components/ui';
import { NEUTRAL_ART } from '../components/Media';
import { BadgeCheck, KeyRound, ShieldCheck } from 'lucide-react';

interface RedeemResponse {
  entitlement: { id: string; startsAt: string; expiresAt: string; status: string };
  message: string;
}

export function Supporter() {
  const { user, status, entitlements, refresh } = useAuth();
  const exclusive = CONTENT.filter((c) => c.accessType === 'supporter' && c.status === 'published');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const activeEntitlement = user?.supporter;

  const redeem = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await api.post<RedeemResponse>('/supporter/redeem', { token: token.trim() });
      setNotice(`${res.message} Access is active until ${new Date(res.entitlement.expiresAt).toLocaleString()}.`);
      setToken('');
      await refresh();
    } catch (err) {
      setError(displayError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section className="page-head page-head--paper">
        <div className="container">
          <div className="crumbs">
            <Link to="/">Home</Link>
            <span>/</span>
            <span>Supporter</span>
          </div>
          <span className="eyebrow">Exclusive</span>
          <h1>Supporter Zone</h1>
          <p className="section-sub" style={{ marginTop: 22 }}>
            Exclusive content, early releases and workshop tools for LittleKrishna supporters. Tokens are validated on the server and bound to your account.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }} id="token">
        <div className="container">
          <div className="grid grid--2" style={{ alignItems: 'start' }}>
            <div className="info-panel" style={{ position: 'static' }}>
              <h3><KeyRound size={19} style={{ verticalAlign: -3 }} /> Redeem A Supporter Token</h3>
              {status === 'loading' ? (
                <p style={{ color: 'var(--ink-on-dark)', fontSize: 14 }}>Checking your session…</p>
              ) : !user ? (
                <>
                  <p style={{ color: 'var(--ink-on-dark)', fontSize: 14 }}>
                    Sign in to redeem your token. Tokens cannot be used anonymously and cannot be transferred after redemption.
                  </p>
                  <Link className="btn btn--primary" style={{ marginTop: 18 }} to="/login?next=/supporter">Sign In</Link>
                </>
              ) : (
                <form onSubmit={redeem}>
                  {notice ? <div className="form-notice" style={{ marginBottom: 18 }}>{notice}</div> : null}
                  {error ? <div className="form-error" style={{ marginBottom: 18 }} role="alert">{error}</div> : null}
                  <div className="field">
                    <label className="label" htmlFor="supporter-token">Supporter token</label>
                    <input id="supporter-token" className="input" value={token} onChange={(e) => setToken(e.target.value)} placeholder="lk_supporter_…" autoComplete="off" required />
                  </div>
                  <button className="btn btn--gold" type="submit" disabled={busy || !token.trim()}>
                    {busy ? 'Validating…' : 'Redeem Token'}
                  </button>
                </form>
              )}
            </div>

            <div className="info-panel" style={{ position: 'static' }}>
              <h3><ShieldCheck size={19} style={{ verticalAlign: -3 }} /> Entitlement Status</h3>
              {user ? (
                <dl>
                  <div className="info-row"><dt>Account</dt><dd>@{user.username}</dd></div>
                  <div className="info-row"><dt>Status</dt><dd>{activeEntitlement ? 'Active supporter' : 'No active entitlement'}</dd></div>
                  {activeEntitlement ? (
                    <>
                      <div className="info-row"><dt>Started</dt><dd>{new Date(activeEntitlement.startsAt).toLocaleDateString()}</dd></div>
                      <div className="info-row"><dt>Expires</dt><dd>{activeEntitlement.expiresAt ? new Date(activeEntitlement.expiresAt).toLocaleString() : 'No expiry'}</dd></div>
                      <div className="info-row"><dt>Unlocked items</dt><dd>{entitlements.length}</dd></div>
                    </>
                  ) : null}
                </dl>
              ) : (
                <p style={{ color: 'var(--ink-on-dark)', fontSize: 14 }}>Sign in to view your entitlement status and expiry date.</p>
              )}
              <p style={{ marginTop: 18, fontSize: 12, color: 'var(--silver-2)' }}>
                Access can be revoked by administrators at any time. Existing downloads are not retroactively removed.
              </p>
            </div>
          </div>

          <div style={{ marginTop: 60 }}>
            <h2 style={{ fontSize: 'clamp(26px, 3vw, 38px)', marginBottom: 24 }}>Supporter Releases</h2>
            {exclusive.length === 0 ? (
              <StateBlock title="Nothing exclusive right now" body="Exclusive content unlocks as supporter releases ship." />
            ) : (
              <div className="grid grid--3">
                {exclusive.map((c) => {
                  const unlocked = entitlements.includes(c.slug);
                  return (
                    <Link className="card" to={`/content/${c.slug}`} key={c.id}>
                      <div className="card__media">
                        <div className="media" style={{ aspectRatio: '16 / 10', background: NEUTRAL_ART }}>
                          <div className="media__label">{c.title}</div>
                        </div>
                      </div>
                      <div className="card__body">
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                          <span className="badge badge--gold">{unlocked ? 'unlocked' : 'supporter'}</span>
                          <span className="badge">{c.simulator}</span>
                        </div>
                        <h3 className="card__title">{c.title}</h3>
                        <p style={{ marginTop: 12, color: 'var(--ink-on-dark)', fontSize: 14 }}>{c.shortDescription}</p>
                        <Link className="card__link" to={`/content/${c.slug}`}>
                          <BadgeCheck size={14} /> {unlocked ? 'Open Content' : 'View Access Requirements'}
                        </Link>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
