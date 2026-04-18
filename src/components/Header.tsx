'use client';

import Link from 'next/link';
import { GraduationCap, Menu, X, LogOut, Shield, Layers } from 'lucide-react';
import { useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { TourReplayButton } from './HomeTour';

export default function Header() {
  const { data: session, status } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  const handleLogout = () => {
    signOut({ callbackUrl: '/' });
  };

  const handleLogin = () => {
    signIn('google', { callbackUrl: '/tests' });
  };

  const userName = session?.user?.name ?? session?.user?.email?.split('@')[0] ?? 'User';

  // Helper: active nav link class
  const navLink = (href: string) =>
    `text-sm font-medium transition-colors ${pathname === href
      ? 'text-[#111] font-semibold border-b-2 border-[#111] pb-0.5'
      : 'text-slate-500 hover:text-[#111]'
    }`;

  return (
    <>
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="bg-gradient-to-br from-primary-500 to-accent-500 p-2 rounded-xl group-hover:scale-105 transition-transform">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                CEFR Ready
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-4 xl:gap-6">
              <Link href="/" className={navLink('/')}>หน้าหลัก</Link>
              <Link href="/tests" className={navLink('/tests')} data-tour="nav-tests">ข้อสอบ</Link>
              <Link href="/progress" className={navLink('/progress')}>พัฒนาการ</Link>
              <Link href="/must-know" className={navLink('/must-know')} data-tour="nav-mustknow">Must Know</Link>
              {session?.user && (
                <Link href="/flashcards" className={`inline-flex items-center gap-1.5 ${navLink('/flashcards')}`} data-tour="nav-flashcards">
                  <Layers className="w-3.5 h-3.5" />
                  Flashcards
                </Link>
              )}
              {session?.user?.isAdmin && (
                <Link href="/admin" className={`inline-flex items-center gap-1.5 ${navLink('/admin')}`}>
                  <Shield className="w-3.5 h-3.5" />
                  Admin
                </Link>
              )}
            </nav>

            <div className="hidden lg:flex items-center gap-2">
              {pathname === '/' && <TourReplayButton tourType="home" />}
              {pathname.startsWith('/tests') && <TourReplayButton tourType="test" />}
              {pathname.startsWith('/flashcards') && <TourReplayButton tourType="flashcards" />}
              {status === 'loading' ? (
                <div className="w-8 h-8 bg-slate-200 rounded-full animate-pulse" />
              ) : session?.user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-slate-100 rounded-full pl-1 pr-3 py-1">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-slate-700">{userName}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    title="ออกจากระบบ"
                  >
                    <LogOut className="w-5 h-5 text-slate-500" />
                  </button>
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
            <div className="flex lg:hidden items-center gap-1">
              {pathname === '/' && <TourReplayButton tourType="home" />}
              {pathname.startsWith('/tests') && <TourReplayButton tourType="test" />}
              {pathname.startsWith('/flashcards') && <TourReplayButton tourType="flashcards" />}
              <button
                className="p-2 rounded-lg hover:bg-slate-100"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <nav className="lg:hidden py-4 border-t border-slate-100 animate-slide-up">
              <div className="flex flex-col gap-1">
                {[
                  { href: '/', label: 'หน้าหลัก' },
                  { href: '/tests', label: 'ข้อสอบ' },
                  { href: '/progress', label: 'พัฒนาการ' },
                  { href: '/must-know', label: 'Must Know' },
                  ...(session?.user ? [{ href: '/flashcards', label: 'Flashcards' }] : []),
                ].map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`px-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${pathname === href
                      ? 'bg-slate-100 text-[#111] font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-[#111]'
                      }`}
                  >
                    {label}
                  </Link>
                ))}
                {session?.user?.isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setIsMenuOpen(false)}
                    className="px-2 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1.5"
                  >
                    <Shield className="w-4 h-4" />
                    Admin
                  </Link>
                )}

                <div className="border-t border-slate-100 mt-2 pt-3">
                  {status === 'loading' ? (
                    <div className="w-24 h-8 bg-slate-200 rounded animate-pulse" />
                  ) : session?.user ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {userName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-slate-700">{userName}</span>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#111] transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        ออกจากระบบ
                      </button>
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
