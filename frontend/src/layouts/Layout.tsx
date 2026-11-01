import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Lenis from 'lenis';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { api } from '../services/api';

function analyticsSessionId() {
  const key = 'littlekrishna.analytics';
  let value = window.localStorage.getItem(key);
  if (!value) {
    value = crypto.randomUUID();
    window.localStorage.setItem(key, value);
  }
  return value;
}

export function Layout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  useEffect(() => {
    if (pathname.startsWith('/admin')) return;
    void api.post('/analytics/pageview', {
      path: pathname,
      referrer: document.referrer,
      anonymousSessionId: analyticsSessionId(),
    }).catch(() => undefined);
  }, [pathname]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { e.preventDefault(); };
    document.addEventListener('contextmenu', handler);
    return () => document.removeEventListener('contextmenu', handler);
  }, []);

  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  return (
    <>
      <a href="#main" className="visually-hidden">
        Skip to content
      </a>
      <Navbar />
      <main id="main">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}