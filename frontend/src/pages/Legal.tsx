import { Link } from 'react-router-dom';

interface Section {
  heading: string;
  body: string;
}

const PRIVACY: Section[] = [
  {
    heading: 'Information We Collect',
    body: 'Creating an account stores your username, email address, display name, optional avatar colour and a salted password hash. Signing in creates an HTTP-only session cookie. Download requests store the content, timestamp, status and, on failure, a reason. Page-view analytics store the path, referrer, an anonymous session identifier and, when signed in, your account ID. Contact submissions store the name, email, subject, message and account ID if you are signed in.',
  },
  {
    heading: 'How We Use Information',
    body: 'Account data authenticates you and enforces content access. Download records provide your history, integrity verification and abuse prevention. Analytics help the team understand which public pages are used. Contact messages are read by administrators. This local build does not send marketing email and does not sell personal data.',
  },
  {
    heading: 'Cookies And Local Storage',
    body: 'The API sets the lk_session cookie, which is HTTP-only, SameSite=Lax and Secure in production. The browser may store the one-time cinematic intro dismissal in sessionStorage. No advertising or cross-site tracking cookies are implemented.',
  },
  {
    heading: 'Data Retention',
    body: 'Account, download, contact and audit records remain in the database until an administrator removes them or the deployment operator applies a retention policy. Failed download reasons and audit logs are retained for security review. The local development build writes generated passwords and password-reset tokens to files under backend/data; those files must never be used or retained in production.',
  },
  {
    heading: 'Your Rights And Contact',
    body: 'You may request access, correction or deletion of your account data by using the contact form. This local build has no automated self-service deletion endpoint; an administrator must process the request. If a legal jurisdiction grants additional rights, the deployment operator must publish a jurisdiction-specific notice before launch.',
  },
  {
    heading: 'Third Parties And Transfers',
    body: 'This local build runs entirely against a local Node API and SQLite database. It does not call Cloudinary, Google Drive, Supabase, an email provider or a payment provider. A production deployment that adds those services must update this notice, configure lawful transfer safeguards and publish the provider names before collecting data.',
  },
];

const TERMS: Section[] = [
  {
    heading: 'Acceptance',
    body: 'By using LittleKrishna.com you agree to these terms. If you do not agree, do not create an account or download content. The site is a demonstration platform for Indian railway simulation content; it is not affiliated with Indian Railways or any simulator publisher.',
  },
  {
    heading: 'Accounts',
    body: 'You must provide a valid email address and keep your credentials confidential. You are responsible for activity under your account. Administrators may suspend accounts that abuse the service, attempt to bypass access controls or upload unlawful material. One person may not use multiple accounts to evade supporter-token limits.',
  },
  {
    heading: 'Content And Licences',
    body: 'Content records describe fictional or community-submitted railway simulation material. Downloading does not transfer ownership. Unless a content record states otherwise, you receive a personal, non-exclusive, non-transferable licence to use the downloaded package with the stated simulator. You may not resell, redistribute, mirror or claim authorship of packages you did not create.',
  },
  {
    heading: 'Supporter Tokens',
    body: 'Supporter access is granted by redeeming a single-use or limited-use token or by an administrator grant. Tokens are stored only as hashes. They have no cash value, are not transferable and may be revoked for abuse. This build does not process payments and does not promise a paid subscription product.',
  },
  {
    heading: 'Downloads And Availability',
    body: 'Download links are short-lived and may be denied when your entitlement, the content status or the server state changes. Generated demo packages are not full production archives; their real size and SHA-256 are shown before download. The operator may remove content, rotate archives or take the service offline without notice.',
  },
  {
    heading: 'Prohibited Conduct',
    body: 'Do not attack the API, scrape other users data, bypass origin, role or entitlement checks, upload malware, impersonate another creator, or submit material you do not have the right to share. Community submissions may be moderated, rejected or removed.',
  },
  {
    heading: 'Liability And Changes',
    body: 'The service is provided as-is for demonstration and community use, without warranties of uninterrupted availability or fitness for a particular purpose. To the extent permitted by law, the operator is not liable for indirect or consequential loss. Material changes to these terms will be published on this page. Governing law and a formal dispute process must be supplied by the deployment operator before commercial launch.',
  },
];

export function Legal({ kind }: { kind: 'privacy' | 'terms' }) {
  const isPrivacy = kind === 'privacy';
  const sections = isPrivacy ? PRIVACY : TERMS;
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 860 }}>
        <div className="crumbs">
          <Link to="/">Home</Link>
          <span>/</span>
          <span>{isPrivacy ? 'Privacy Policy' : 'Terms Of Service'}</span>
        </div>
        <span className="eyebrow">Legal</span>
        <h1 style={{ fontSize: 'clamp(40px, 5.6vw, 72px)' }}>{isPrivacy ? 'Privacy Policy' : 'Terms Of Service'}</h1>
        <p style={{ marginTop: 24, color: 'var(--ink-on-dark)', fontSize: 16 }}>
          {isPrivacy
            ? 'How this LittleKrishna build handles account, download, supporter, analytics and contact data.'
            : 'The rules for accounts, content licences, supporter tokens and acceptable use of this LittleKrishna build.'}
        </p>
        <p style={{ marginTop: 12, fontSize: 13, color: 'var(--silver)' }}>Last updated: 31 October 2026</p>
        <div style={{ marginTop: 40, display: 'grid', gap: 28 }}>
          {sections.map((section, index) => (
            <div key={section.heading}>
              <h3 style={{ fontSize: 22 }}>{index + 1}. {section.heading}</h3>
              <p style={{ marginTop: 12, color: 'var(--ink-on-dark)', fontSize: 15 }}>{section.body}</p>
            </div>
          ))}
        </div>
        <div className="info-panel" style={{ position: 'static', marginTop: 44 }}>
          <h3 style={{ fontSize: 18 }}>Questions</h3>
          <p style={{ marginTop: 10, color: 'var(--ink-on-dark)', fontSize: 14 }}>
            Use the <Link to="/contact">contact form</Link>. A deployment operator must have these documents reviewed by qualified counsel and add legal entity, jurisdiction and contact details before a commercial launch.
          </p>
        </div>
      </div>
    </section>
  );
}
