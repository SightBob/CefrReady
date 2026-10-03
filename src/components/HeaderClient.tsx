'use client';

import Link from 'next/link';
import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/tests', label: 'ข้อสอบ CEFR' },
  { href: '/#levels', label: 'ระดับ A1-C2' },
  { href: '/#packages', label: 'แพ็กเกจ' },
];

export default function HeaderClient() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const profileRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    setIsProfileOpen(false);
    signOut({ callbackUrl: '/' });
  };

  const handleLogin = () => {
    Promise.resolve(signIn('google', { callbackUrl: '/tests' })).catch(() => {});
  };

  const userName = session?.user?.name ?? session?.user?.email?.split('@')[0] ?? 'User';
  const isLoadingSession = status === 'loading';
  const isAdmin = session?.user?.isAdmin === true;

  const navItems = isAdmin
    ? [...NAV_ITEMS, { href: '/admin', label: 'แอดมิน' }]
    : NAV_ITEMS;

  const isHome = pathname === '/';

  // Close profile dropdown on click outside
  useEffect(() => {
    if (!isProfileOpen) return;
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isProfileOpen]);

  // Close dropdown + menu on route change
  useEffect(() => {
    setIsProfileOpen(false);
    setIsMenuOpen(false);
  }, [pathname]);

  // Smooth-scroll for in-page hash links when already on home
  const scrollToTarget = (target: HTMLElement, id: string) => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const headerOffset = 92;
    const startY = window.scrollY;
    const endY = target.getBoundingClientRect().top + startY - headerOffset;
    const distance = endY - startY;

    const root = document.documentElement;
    const prevScrollBehavior = root.style.scrollBehavior;

    if (prefersReduced || Math.abs(distance) < 2) {
      window.scrollTo(0, endY);
      history.pushState(null, '', `#${id}`);
      return;
    }

    // CSS `scroll-behavior: smooth` on html fights per-frame scrollTo — disable it during the animation
    root.style.scrollBehavior = 'auto';

    const duration = Math.min(900, Math.max(400, Math.abs(distance) * 0.5));
    const start = performance.now();
    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      window.scrollTo(0, startY + distance * easeInOutCubic(progress));
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        root.style.scrollBehavior = prevScrollBehavior;
        history.pushState(null, '', `#${id}`);
      }
    };
    requestAnimationFrame(step);
  };

  const handleHashNav = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!isHome) return;
    const id = href.split('#')[1];
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    setIsMenuOpen(false);
    scrollToTarget(target, id);
  };

  const navLinkCls = (href: string) =>
    `text-[15px] font-medium transition-colors ${
      pathname === href
        ? 'text-[#5A95C6] font-semibold'
        : 'text-[#555] hover:text-[#5A95C6]'
    }`;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#E6F0F8]">
      <div className="max-w-[1146px] mx-auto flex items-center justify-between h-[88px] px-4 sm:px-6">
        {/* Logo: CEFR + READY! badge (Figma 1:1097) */}
        <Link href="/" className="flex flex-col items-start group" aria-label="CEFR Ready หน้าหลัก">
          <span className="font-['Momo_Trust_Display'] text-[26px] leading-[34px] tracking-[0.52px] text-[#5A95C6] [text-shadow:1px_1px_0_#F8E9A9]">
            CEFR
          </span>
          <span className="font-caveat -mt-[3px] flex h-[23px] w-[78px] items-center justify-center rounded-[4px] bg-[#FFF0AE] text-[15px] font-bold tracking-[0.24px] text-[#524924] transition-transform duration-200 group-hover:-translate-y-0.5">
            READY!
          </span>
        </Link>

        {/* Center: nav links */}
        <nav className="hidden min-[992px]:flex items-center gap-8" aria-label="เมนูหลัก">
          {navItems.map(({ href, label }) => (
            <Link
              key={label}
              href={href}
              className={navLinkCls(href)}
              onClick={(e) => handleHashNav(e, href)}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right: profile pill (Figma 1:1109) */}
        <div className="flex items-center gap-1">
          <div className="hidden min-[992px]:flex items-center">
            {isLoadingSession ? (
              <div className="h-[46px] w-[191px] rounded-full bg-[#F4F4F4] animate-pulse" aria-hidden="true" />
            ) : session?.user ? (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex h-[46px] items-center gap-[11px] rounded-full bg-[#F4F4F4] pl-[11px] pr-[14px] transition-colors hover:bg-[#EAEAEA]"
                  aria-expanded={isProfileOpen}
                  aria-haspopup="menu"
                  aria-label="เมนูบัญชี"
                >
                  <div className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-[#5A95C6] text-[16px] font-semibold text-white">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <span className="max-w-[97px] truncate text-[16px] font-semibold text-[#555] hidden sm:block">
                    {userName}
                  </span>
                  <ChevronDown
                    className={`size-[14px] text-[#555] transition-transform ${isProfileOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isProfileOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 py-2 animate-slide-up"
                    role="menu"
                  >
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-800 truncate">{userName}</p>
                      {session?.user?.email && (
                        <p className="text-xs text-slate-500 truncate">{session.user.email}</p>
                      )}
                    </div>
                    <Link
                      href="/progress"
                      onClick={() => setIsProfileOpen(false)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                      role="menuitem"
                    >
                      <UserRound className="w-4 h-4" />
                      โปรไฟล์
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                      role="menuitem"
                    >
                      <LogOut className="w-4 h-4" />
                      ออกจากระบบ
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="flex h-[46px] items-center rounded-full bg-[#F4F4F4] px-6 text-[16px] font-semibold text-[#555] transition-colors hover:bg-[#EAEAEA]"
              >
                เข้าสู่ระบบ
              </button>
            )}
          </div>

          {/* Mobile: hamburger */}
          <button
            className="min-[992px]:hidden p-2 rounded-lg text-[#555] hover:bg-[#F4F4F4] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5A95C6]"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? 'ปิดเมนู' : 'เปิดเมนู'}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <nav
          className="min-[992px]:hidden bg-white border-t border-[#E6F0F8] px-4 py-4 shadow-lg"
          id="mobile-nav"
          aria-label="เมนูหลัก (มือถือ)"
        >
          <div className="flex flex-col gap-1">
            {navItems.map(({ href, label }) => (
              <Link
                key={label}
                href={href}
                onClick={(e) => handleHashNav(e, href)}
                className={`px-3 py-2.5 rounded-xl text-[15px] font-medium transition-colors ${
                  pathname === href
                    ? 'bg-[#DDF4FF] text-[#5A95C6] font-semibold'
                    : 'text-[#555] hover:bg-[#F4F4F4]'
                }`}
              >
                {label}
              </Link>
            ))}

            <div className="border-t border-[#E6F0F8] mt-2 pt-3">
              {isLoadingSession ? (
                <div className="h-10 rounded-xl bg-[#F4F4F4] animate-pulse" aria-hidden="true" />
              ) : session?.user ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-[#5A95C6] text-[14px] font-semibold text-white">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col leading-tight min-w-0">
                      <span className="text-sm font-semibold text-[#555] truncate">{userName}</span>
                      {session?.user?.email && (
                        <span className="text-xs text-[#999] truncate max-w-[180px]">{session.user.email}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Link
                      href="/progress"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-1.5 text-sm text-[#555] hover:text-[#5A95C6] transition-colors"
                    >
                      <UserRound className="w-4 h-4" />
                      โปรไฟล์
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-1.5 text-sm text-[#555] hover:text-[#5A95C6] transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      ออกจากระบบ
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { handleLogin(); setIsMenuOpen(false); }}
                  className="w-full h-[46px] rounded-full bg-[#5A95C6] text-white text-[16px] font-semibold hover:bg-[#4A85B6] transition-colors"
                >
                  เข้าสู่ระบบ
                </button>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
