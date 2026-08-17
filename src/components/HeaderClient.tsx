'use client';

import Link from 'next/link';
import { Menu, X, LogOut, ChevronDown, UserRound } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/tests', label: 'ข้อสอบ CEFR' },
  { href: '/#reviews', label: 'รีวิว' },
  { href: '/#levels', label: 'ระดับ A1-C2' },
  { href: '/#packages', label: 'แพ็กเกจ' },
];

export default function HeaderClient() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
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

  // Blue header only on index; white header elsewhere
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

  // Close dropdown + mobile menu on route change
  useEffect(() => {
    setIsProfileOpen(false);
    setIsMenuOpen(false);
  }, [pathname]);

  // Smooth-scroll for in-page hash links when already on home
  const handleHashNav = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!isHome) return;
    const id = href.split('#')[1];
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    history.pushState(null, '', `#${id}`);
    target.scrollIntoView({ behavior: 'smooth' });
    setIsMenuOpen(false);
  };

  // Helper: active nav link class
  const navLink = (href: string) =>
    `text-sm font-medium transition-colors ${pathname === href
      ? 'text-[#7372DF] font-semibold border-b-2 border-[#7372DF] pb-0.5'
      : (isHome ? 'text-white' : 'text-slate-600')
    }`;

  // Derived classes: blue header on index, white elsewhere
  const logoText = isHome ? 'text-white' : 'text-slate-900';
  const subtitleText = isHome ? 'text-white/70' : 'text-slate-400';
  const pillBg = isHome ? 'bg-[#F4F4F4]/[29%] hover:bg-[#F4F4F4]/[45%]' : 'bg-slate-100 hover:bg-slate-200';
  const pillText = isHome ? 'text-white' : 'text-slate-700';
  const chevronText = isHome ? 'text-white' : 'text-slate-500';
  const hamburgerCls = isHome ? 'text-white hover:bg-white/15' : 'text-slate-700 hover:bg-slate-100';
  const mobileActive = 'text-[#7372DF] font-semibold';
  const mobileInactive = isHome ? 'text-white/80 hover:bg-white/10 hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-[#111]';
  const mobileName = isHome ? 'text-white' : 'text-slate-700';
  const mobileEmail = isHome ? 'text-white/70' : 'text-slate-400';
  const mobileLogout = isHome ? 'text-white/80 hover:text-white' : 'text-slate-500 hover:text-[#111]';

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${isHome ? 'bg-[#6D88EE]' : 'bg-white border-b border-slate-100 shadow-sm'}`}
        style={{ minHeight: '4rem' }}
      >
        <div className="max-w-[1360px] mx-auto flex flex-col px-4">
          <div className="w-full flex justify-between items-center h-[85px]">

            <Link href="/" className="flex items-center gap-2.5 group" aria-label="CEFR Ready หน้าหลัก">
              {/* Logo badge */}
              <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-200 shrink-0">
                <span className="text-white font-black text-sm tracking-tighter select-none">CR</span>
              </div>
              {/* Site name */}
              <div className="flex flex-col leading-none">
                <span className={`text-base font-extrabold tracking-tight transition-colors ${logoText}`}>
                  CEFR Ready
                </span>
                <span className={`text-[10px] font-medium tracking-wide hidden sm:block transition-colors ${subtitleText}`}>ฝึกข้อสอบมาตรฐาน CEFR</span>
              </div>
            </Link>

            {/* Right side: nav + profile */}
            <div className="flex items-center gap-4 xl:gap-6">
              {/* Desktop Navigation */}
              <nav className="hidden min-[992px]:flex items-center gap-12 xl:gap-6">
                {navItems.map(({ href, label }) => (
                  <Link
                    key={label}
                    href={href}
                    className={navLink(href)}
                  >
                    {label}
                  </Link>
                ))}
              </nav>

              {/* Desktop Profile / Login */}
              <div className="hidden min-[992px]:flex items-center gap-2 min-w-[140px] justify-end">
                {isLoadingSession ? (
                  <div className="h-10 w-28 rounded-xl bg-[#F4F4F4]/75 animate-pulse" aria-hidden="true" />
                ) : session?.user ? (
                  <div className="relative" ref={profileRef}>
                    <button
                      onClick={() => setIsProfileOpen(!isProfileOpen)}
                      className={`flex items-center gap-2 rounded-full pl-1 pr-3 py-1 transition-colors ${pillBg}`}
                      aria-expanded={isProfileOpen}
                      aria-haspopup="menu"
                      aria-label="เมนูบัญชี"
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {userName.charAt(0).toUpperCase()}
                      </div>
                      <span className={`text-sm font-medium max-w-[100px] truncate transition-colors ${pillText}`}>{userName}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${chevronText} ${isProfileOpen ? 'rotate-180' : ''}`} />
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
                    className="inline-flex items-center gap-2 bg-[#111] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#333] transition-colors"
                  >
                    เข้าสู่ระบบ
                  </button>
                )}
              </div>

              {/* Mobile Buttons */}
              <div className="flex min-[992px]:hidden items-center gap-1">
                <button
                  className={`p-3 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 ${hamburgerCls}`}
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  aria-label={isMenuOpen ? 'ปิดเมนู' : 'เปิดเมนู'}
                  aria-expanded={isMenuOpen}
                  aria-controls="mobile-nav"
                >
                  {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <nav className={`min-[992px]:hidden py-4 border-t animate-slide-up ${isHome ? 'border-white/20' : 'border-slate-100'}`} id="mobile-nav">
              <div className="flex flex-col gap-1">
                {navItems.map(({ href, label }) => (
                  <Link
                    key={label}
                    href={href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`px-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${pathname === href ? mobileActive : mobileInactive}`}
                  >
                    {label}
                  </Link>
                ))}

                <div className={`border-t mt-2 pt-3 ${isHome ? 'border-white/20' : 'border-slate-100'}`}>
                  {isLoadingSession ? (
                    <div className="h-10 rounded-xl bg-slate-100 animate-pulse" aria-hidden="true" />
                  ) : session?.user ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col leading-tight">
                          <span className={`text-sm font-medium transition-colors ${mobileName}`}>{userName}</span>
                          {session?.user?.email && (
                            <span className={`text-xs truncate max-w-[180px] transition-colors ${mobileEmail}`}>{session.user.email}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Link
                          href="/progress"
                          onClick={() => setIsMenuOpen(false)}
                          className={`flex items-center gap-1.5 text-sm transition-colors ${isHome ? 'text-white/80 hover:text-white' : 'text-slate-500 hover:text-[#111]'}`}
                        >
                          <UserRound className="w-4 h-4" />
                          โปรไฟล์
                        </Link>
                        <button
                          onClick={handleLogout}
                          className={`flex items-center gap-1.5 text-sm transition-colors ${mobileLogout}`}
                        >
                          <LogOut className="w-4 h-4" />
                          ออกจากระบบ
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { handleLogin(); setIsMenuOpen(false); }}
                      className="w-full bg-[#111] text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-[#333] transition-colors"
                    >
                      เข้าสู่ระบบ
                    </button>
                  )}
                </div>
              </div>
            </nav>
          )}
        </div>
      </header>
    </>
  );
}
