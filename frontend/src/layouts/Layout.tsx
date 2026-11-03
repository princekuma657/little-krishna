import { Outlet, useLocation } from 'react-router-dom';
import { useLayoutEffect, useEffect } from 'react';
import Lenis from 'lenis';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { api } from '../services/api';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/**
 * Cinematic scroll reveal: existing cards, panels and section heads enter the
 * viewport with a soft fade. Grid children alternate left/right entry and are
 * staggered. Purely visual — classes are applied at runtime and removed once
 * the entrance transition finishes, so hover interactions stay untouched.
 * Elements already animated by GSAP (inline styles present) are skipped.
 */
const REVEAL_SELECTOR =
  '.card, .shot, .stat-card, .state-block, .info-panel, .download-box, .token-box, .section-head';

function useScrollReveal(pathname: string) {
  useLayoutEffect(() => {
    const root = document.getElementById('main');
    if (!root) return;
    if (window.matchMedia(REDUCED_MOTION).matches) return;

    const targets = Array.from(root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR)).filter(
      (el) => !el.style.opacity && !el.style.transform,
    );

    const timers: number[] = [];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          observer.unobserve(el);
          const delay = Number(el.dataset.revealDelay || 0);
          const timer = window.setTimeout(() => {
            el.classList.add('is-inview');
            const drop = window.setTimeout(() => {
              el.classList.remove('reveal', 'reveal--left', 'reveal--right', 'is-inview');
              delete el.dataset.revealDelay;
            }, delay + 1000);
            timers.push(drop);
          }, delay);
          timers.push(timer);
        }
      },
      { rootMargin: '0px 0px -9% 0px', threshold: 0.06 },
    );

    targets.forEach((el, index) => {
      const grid = el.closest('.grid');
      let gridIndex = 0;
      if (grid) gridIndex = Array.prototype.indexOf.call(grid.children, el);
      const columns = grid && grid.classList.contains('grid--3') ? 3 : 2;
      el.classList.add('reveal');
      if (grid) {
        // Alternating side entry across grid columns: left / center / right.
        const slot = gridIndex % columns;
        if (slot === 0) el.classList.add('reveal--left');
        else if (slot === columns - 1) el.classList.add('reveal--right');
      }
      if (grid) el.dataset.revealDelay = String(Math.min(gridIndex * 65, 390));
      observer.observe(el);
    });

    return () => {
      observer.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [pathname]);
}

/**
 * Subtle 3D pointer tilt on cards: driven by CSS vars so the existing CSS
 * hover transforms keep working. Only on precise-pointer devices.
 */
function useCardTilt() {
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia(REDUCED_MOTION).matches) return;

    const onMove = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.('.card');
      if (!(el instanceof HTMLElement)) return;
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.setProperty('--tilt-x', (px * 4.2).toFixed(2) + 'deg');
      el.style.setProperty('--tilt-y', (-py * 4.2).toFixed(2) + 'deg');
    };
    const onOut = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.('.card');
      if (!(el instanceof HTMLElement)) return;
      if (e.relatedTarget && el.contains(e.relatedTarget as Node)) return;
      el.style.removeProperty('--tilt-x');
      el.style.removeProperty('--tilt-y');
    };

    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerout', onOut, true);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerout', onOut, true);
    };
  }, []);
}

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
  useScrollReveal(pathname);
  useCardTilt();

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
    // Respect reduced-motion: fall back to native scrolling.
    if (window.matchMedia(REDUCED_MOTION).matches) return;
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
