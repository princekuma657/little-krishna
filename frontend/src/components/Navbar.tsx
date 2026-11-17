import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'motion/react';
import { cn } from '../lib/utils';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/the-railways', label: 'The Railways' },
  { to: '/routes', label: 'Routes' },
  { to: '/trains', label: 'Trains' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/community', label: 'Community' },
  { to: '/releases', label: 'Releases' },
  { to: '/supporter', label: 'Supporter' },
];

const ADMIN_ROLES = ['super_admin', 'content_manager', 'support_manager', 'analytics_viewer'];

export function Navbar() {
  const [visible, setVisible] = useState(true);
  const [open, setOpen] = useState(false);
  const { user, status, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { scrollYProgress } = useScroll();
  const isAdmin = Boolean(user?.roles.some((role) => ADMIN_ROLES.includes(role)));

  useMotionValueEvent(scrollYProgress, 'change', (current) => {
    if (typeof current === 'number') {
      const direction = current - (scrollYProgress.getPrevious() ?? 0);
      if (scrollYProgress.get() < 0.05) {
        setVisible(true);
      } else {
        if (direction < 0) {
          setVisible(true);
        } else {
          setVisible(false);
        }
      }
    }
  });

  const doSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate('/');
  };

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 1, y: 0 }}
          animate={{ y: visible ? 0 : -100, opacity: visible ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex max-w-fit fixed top-4 inset-x-0 mx-auto z-[5000] items-center justify-center"
        >
          <div className="flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/80 px-2 py-1.5 shadow-lg shadow-black/10 backdrop-blur-md dark:border-white/10 dark:bg-black/50">
            <Link to="/" className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-neutral-900 dark:text-white">
              <span className="w-6 h-6 rounded-full bg-[#282c20] text-[#d2ff00] flex items-center justify-center text-xs font-bold">L</span>
              <span className="hidden sm:block">LittleKrishna</span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {LINKS.slice(1).map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) =>
                    cn(
                      'relative rounded-full px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-[#282c20] text-[#d2ff00]'
                        : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-white'
                    )
                  }
                >
                  {l.label}
                </NavLink>
              ))}
            </div>
            <div className="h-5 w-px bg-neutral-200 dark:bg-white/10" />
            <div className="flex items-center gap-1">
              {status === 'loading' ? null : user ? (
                <>
                  {isAdmin && (
                    <Link to="/admin" className="relative rounded-full px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-white">
                      Admin
                    </Link>
                  )}
                  <Link to="/profile" className="relative rounded-full px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-white">
                    @{user.username}
                  </Link>
                  <button
                    className="relative rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-neutral-800 hover:shadow-lg dark:bg-white dark:text-black dark:hover:bg-neutral-100"
                    onClick={() => void doSignOut()}
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="relative rounded-full px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-white">
                    Sign In
                  </Link>
                  <Link to="/register" className="relative rounded-full bg-[#282c20] px-4 py-2 text-sm font-medium text-[#d2ff00] transition-all hover:bg-[#1a1d15] hover:shadow-lg">
                    Join
                  </Link>
                </>
              )}
            </div>
            <button
              className="md:hidden relative rounded-full px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/10"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? '✕' : '☰'}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Mobile menu */}
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-20 inset-x-4 z-[4999] rounded-2xl border border-white/10 bg-white/90 backdrop-blur-md p-4 shadow-xl md:hidden"
        >
          <div className="flex flex-col gap-2">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn('rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                    isActive ? 'bg-[#282c20] text-[#d2ff00]' : 'text-neutral-700 hover:bg-neutral-100')
                }
              >
                {l.label}
              </NavLink>
            ))}
            {user ? (
              <>
                <NavLink to="/profile" onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100">Profile</NavLink>
                {isAdmin && <NavLink to="/admin" onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100">Admin</NavLink>}
                <button className="rounded-xl px-4 py-3 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800" onClick={() => void doSignOut()}>Sign Out</button>
              </>
            ) : (
              <>
                <NavLink to="/login" onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100">Sign In</NavLink>
                <NavLink to="/register" onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 text-sm font-medium text-white bg-[#282c20]">Join</NavLink>
              </>
            )}
          </div>
        </motion.div>
      )}
    </>
  );
}