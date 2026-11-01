import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, Send } from 'lucide-react';
import { StateBlock } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { api, displayError } from '../services/api';

interface ContactResponse {
  reference: string;
  message: string;
}

export function Contact() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState<ContactResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api.post<ContactResponse>('/contact', { name, email, subject, message });
      setSent(res);
    } catch (err) {
      setError(displayError(err));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <section className="section">
        <div className="container">
          <StateBlock
            title="Message Recorded"
            body={`${sent.message} Reference: ${sent.reference}. This local build stores messages in the database and does not send email.`}
            action={<Link className="btn btn--primary" to="/">Back Home</Link>}
          />
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="page-head">
        <div className="container">
          <div className="crumbs">
            <Link to="/">Home</Link>
            <span>/</span>
            <span>Contact</span>
          </div>
          <span className="eyebrow">Say Hello</span>
          <h1>Contact</h1>
          <p className="section-sub" style={{ marginTop: 22 }}>
            Feedback, content partnerships and railway stories.
          </p>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <div className="info-panel" style={{ position: 'static' }}>
            <h3>Send A Message</h3>
            <p style={{ marginTop: 10, color: 'var(--ink-on-dark)', fontSize: 13 }}>
              Submissions are stored in the LittleKrishna contact inbox and reviewed by administrators. No email is sent automatically.
            </p>
            <form onSubmit={submit} style={{ marginTop: 20 }}>
              {error ? <div className="form-error" style={{ marginBottom: 20 }} role="alert">{error}</div> : null}
              <div className="grid grid--2">
                <div className="field">
                  <label className="label" htmlFor="contact-name">Name</label>
                  <input id="contact-name" className="input" required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                </div>
                <div className="field">
                  <label className="label" htmlFor="contact-email">Email</label>
                  <input id="contact-email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
              </div>
              <div className="field">
                <label className="label" htmlFor="contact-subject">Subject</label>
                <input id="contact-subject" className="input" maxLength={160} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Optional subject" />
              </div>
              <div className="field">
                <label className="label" htmlFor="contact-message">Message</label>
                <textarea id="contact-message" className="textarea" required minLength={10} maxLength={5000} rows={7} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us about your railway simulation story." />
              </div>
              <button className="btn btn--primary" type="submit" disabled={busy}>
                <Send size={14} /> {busy ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
          <div className="grid grid--2" style={{ marginTop: 40 }}>
            <div className="info-panel" style={{ position: 'static' }}>
              <h3>Reach</h3>
              <p style={{ color: 'var(--ink-on-dark)', fontSize: 14, display: 'grid', gap: 12 }}>
                <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Mail size={16} /> Contact form only in this build</span>
                <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}><MapPin size={16} /> India</span>
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
