import { useCallback, useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './layouts/Layout';
import { Home } from './pages/Home';
import { TheRailways } from './pages/TheRailways';
import { Catalog } from './pages/Catalog';
import { Gallery } from './pages/Gallery';
import { Community } from './pages/Community';
import { Releases } from './pages/Releases';
import { Supporter } from './pages/Supporter';
import { ContentDetail } from './pages/ContentDetail';
import { CollectionDetail } from './pages/CollectionDetail';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Profile } from './pages/Profile';
import { Legal } from './pages/Legal';
import { Contact } from './pages/Contact';
import { NotFound } from './pages/NotFound';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminContent } from './pages/admin/AdminContent';
import { AdminContentCreate } from './pages/admin/AdminContentCreate';
import { AdminContentEdit } from './pages/admin/AdminContentEdit';
import { AdminCategories } from './pages/admin/AdminCategories';
import { AdminCollections } from './pages/admin/AdminCollections';
import { AdminGallery } from './pages/admin/AdminGallery';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminDownloads } from './pages/admin/AdminDownloads';
import { AdminTokens } from './pages/admin/AdminTokens';
import { AdminSupporters } from './pages/admin/AdminSupporters';
import { AdminAnnouncements } from './pages/admin/AdminAnnouncements';
import { AdminMessages } from './pages/admin/AdminMessages';
import { AdminAnalytics } from './pages/admin/AdminAnalytics';
import { AdminAuditLogs } from './pages/admin/AdminAuditLogs';
import { AdminSecurity } from './pages/admin/AdminSecurity';
import { AdminSettings } from './pages/admin/AdminSettings';
import { loadPublicData, loadPreviewData, STATE_MESSAGES } from './data/content';
import { displayError } from './services/api';

type BootPhase = 'loading' | 'ready' | 'error';

export default function App() {
  const [phase, setPhase] = useState<BootPhase>('loading');
  const [error, setError] = useState('');

  const boot = useCallback(async () => {
    setPhase('loading');
    setError('');
    try {
      await loadPublicData();
      setPhase('ready');
    } catch (err) {
      if (import.meta.env.DEV) {
        // Dev preview only: render the UI with bundled design data when the
        // backend is not running. Production always requires the live API.
        loadPreviewData();
        setPhase('ready');
        return;
      }
      setError(displayError(err));
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    void boot();
  }, [boot]);

  if (phase === 'loading') {
    return (
      <div className="boot-screen" role="status" aria-live="polite">
        <div className="boot-screen__mark">Little<span>Krishna</span></div>
        <div className="boot-screen__line" />
        <p>{STATE_MESSAGES.loading}</p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="boot-screen boot-screen--error" role="alert">
        <div className="boot-screen__mark">Little<span>Krishna</span></div>
        <h1>Archive offline</h1>
        <p>{STATE_MESSAGES.error}</p>
        <p className="boot-screen__detail">{error}</p>
        <button className="btn btn--primary" onClick={() => void boot()}>Retry Connection</button>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="/the-railways" element={<TheRailways />} />
        <Route path="/routes" element={<Catalog kind="route" />} />
        <Route path="/trains" element={<Catalog kind="train" />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/community" element={<Community />} />
        <Route path="/releases" element={<Releases />} />
        <Route path="/supporter" element={<Supporter />} />
        <Route path="/content/:slug" element={<ContentDetail />} />
        <Route path="/collection/:slug" element={<CollectionDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/downloads" element={<Profile />} />
        <Route path="/notifications" element={<Profile />} />
        <Route path="/settings" element={<Profile />} />
        <Route path="/privacy" element={<Legal kind="privacy" />} />
        <Route path="/terms" element={<Legal kind="terms" />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="content" element={<AdminContent />} />
          <Route path="content/create" element={<AdminContentCreate />} />
          <Route path="content/:id/edit" element={<AdminContentEdit />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="collections" element={<AdminCollections />} />
          <Route path="gallery" element={<AdminGallery />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="downloads" element={<AdminDownloads />} />
          <Route path="tokens" element={<AdminTokens />} />
          <Route path="supporters" element={<AdminSupporters />} />
          <Route path="announcements" element={<AdminAnnouncements />} />
          <Route path="messages" element={<AdminMessages />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="audit-logs" element={<AdminAuditLogs />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="security" element={<AdminSecurity />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
