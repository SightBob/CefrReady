'use client';

import Link from 'next/link';
import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { absoluteCallbackUrl } from '@/lib/redirect-safety';

// Figma 249:3559-249:3566 — 4 ช่อง 114×46; ช่องที่ 3-4 ในดีไซน์เป็น "ข้อสอบ" ซ้ำกัน
// จึงแก้ช่องที่ 4 เป็น "ติวต่อเรา" เพื่อไม่ให้เมนูซ้ำ
const NAV_ITEMS = [
  { href: '/tests', label: 'ข้อสอบ CEFR' },
  { href: '/#levels', label: 'ระดับ A1-C2' },
  { href: '/packages', label: 'ราคา' },
  { href: '/contact', label: 'ติดต่อเรา' },
];

export default function HeaderClient() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const profileRef = useRef<HTMLDivElement>(null);
  // hash ของ section ที่กำลังอ่านอยู่ ใช้ไฮไลต์เมนูแบบ /#xxx
  const [activeHash, setActiveHash] = useState('');
  // hash ที่ถูกกดจากหน้าอื่น — รอนำทางเสร็จแล้วค่อยเลื่อนนุ่มเอง
  const pendingHashRef = useRef<string | null>(null);
  // hash ที่เลื่อนให้แล้ว — กัน effect รันซ้ำแล้วเด้งกลับบน
  const router = useRouter();

  // เมนูแบบ hash ไม่มี pathname ตรงเป๊ะ จึงต้องเลี้ยงค่าไว้จาก hash ปัจจุบัน
  // และจากการ scroll เข้า/ออก viewport ของแต่ละ section
  useEffect(() => {
    const hashItems = NAV_ITEMS.map((i) => i.href.split('#')[1]).filter(Boolean) as string[];
    if (hashItems.length === 0) return;

    const sync = () => {
      const current = window.location.hash.replace('#', '');
      if (current && hashItems.includes(current)) {
        setActiveHash(current);
        return;
      }
      // ไม่มี hash — เลือก section ที่กำลังอยู่กลางจอ
      const mid = window.innerHeight / 2;
      const visible = hashItems.find((id) => {
        const el = document.getElementById(id);
        if (!el) return false;
        const b = el.getBoundingClientRect();
        return b.top <= mid && b.bottom >= mid;
      });
      setActiveHash(visible ?? '');
    };

    sync();
    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('scroll', sync);
      window.removeEventListener('hashchange', sync);
    };
  }, []);

  const handleLogout = () => {
    setIsProfileOpen(false);
    signOut({ callbackUrl: '/' });
  };

  const handleLogin = () => {
    Promise.resolve(
      signIn('google', { callbackUrl: absoluteCallbackUrl('/tests', window.location.origin) }),
    ).catch(() => {});
  };

  const userName = session?.user?.name ?? session?.user?.email?.split('@')[0] ?? 'User';
  const isLoadingSession = status === 'loading';
  const isAdmin = session?.user?.isAdmin === true;

  const navItems = isAdmin
    ? [...NAV_ITEMS, { href: '/admin', label: 'แอดมิน' }]
    : NAV_ITEMS;

  // ยังไม่ได้ login → ส่งไป flow ทดลองเล่นแทน เพราะการทำข้อสอบจริงต้องมีสมาชิก
  // ระหว่างที่ session ยังโหลดไม่เสร็จ ใช้ลิงก์เดิมไว้ก่อน (พฤติกรรมเดิม ไม่ถอยหลัง)
  const menuItems = navItems.map((item) =>
    item.href === '/tests' && !isLoadingSession && !session?.user
      ? { ...item, href: '/demo/intro' }
      : item
  );

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

  // เลื่อนไปยัง section แบบนุ่ม
  //
  // ใช้ smooth ของเบราว์เซอร์เองแทนการวน rAF เอง เพราะ:
  //   - เบราว์เซอร์จัดการ easing ได้นุ่มกว่า และยกเลิก animation ตอนผู้ใช้แตะ/เลื่อนเอง
  //   - เคารพ prefers-reduced-motion ให้เอง (ลด motion → กระโดดทันที)
  //   - ระยะเวลาปรับตามระยะทางจริง ไม่ต้องเดา duration เอง
  const scrollToTarget = (target: HTMLElement, id: string) => {
    // header สูง 64px บนมือถือ / 88px ตั้งแต่ 992px (รวม border-b 1px แล้ว)
    // อ่านค่าจริงจาก DOM เพื่อไม่ต้องเดา และให้มี gap 4px ไม่ชนขอบ header
    const headerOffset = (document.querySelector('header')?.getBoundingClientRect().height ?? 88) + 4;
    const endY = target.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({ top: Math.max(0, endY), behavior: 'smooth' });
    history.replaceState(null, '', `#${id}`);
  };

  // รอให้ layout นิ่งก่อนเลื่อน — รูปด้านบนโหลดช้าแล้วดันตำแหน่ง section ทำให้เลื่อนผิดจุด
  // วนจนกว่าตำแหน่งคงที่ 2 เฟรมติด หรือครบเวลา (ป้องกันลูปไม่จบ)
  const waitForStableLayout = (el: HTMLElement, cb: () => void) => {
    let lastTop = Number.NaN;
    let stableFrames = 0;
    let elapsed = 0;
    const tick = () => {
      const top = el.getBoundingClientRect().top;
      if (Number.isFinite(lastTop) && Math.abs(top - lastTop) < 0.5) {
        stableFrames++;
      } else {
        stableFrames = 0;
        lastTop = top;
      }
      elapsed += 16;
      if (stableFrames >= 3 || elapsed > 1200) {
        cb();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  // App Router ไม่เลื่อนไป anchor เองเมื่อเปลี่ยน pathname ด้วย client-side nav —
  // ข้ามจากหน้าอื่นมาที่ /#levels จะได้แค่หน้าแรกที่ scroll 0 ต้องเลื่อนเองที่นี่
  // ผูกกับ pathname เท่านั้น ถ้าใส่ state ตัวอื่นใน deps จะรันซ้ำแล้วเด้งกลับบน
  useEffect(() => {
    if (!isHome) return;
    const id = pendingHashRef.current || window.location.hash.replace('#', '');
    if (!id) return;

    let raf = 0;
    let cancelled = false;
    let waited = 0;

    const start = () => {
      const target = document.getElementById(id);
      if (!target) {
        // หน้าแรกมีรูปหนัก ๆ render ช้า — รอได้ถึง 5 วินาทีไม่ใช่แค่ไม่กี่เฟรม
        waited += 16;
        if (waited < 5000) raf = requestAnimationFrame(start);
        return;
      }
      // กันเบราว์เซอร์กระโดดแบบ instant ไปยัง anchor ก่อน แล้วค่อยเลื่อนนุ่มทีเดียว
      // (StrictMode เรียก effect ซ้ำ — รอบสองค่อยเลื่อนต่อจากตำแหน่งปัจจุบัน
      //  ผลลัพธ์เดียวกัน คือไปยังเป้าหมาย ไม่ต้องพึ่ง guard ที่บล็อกรอบสอง)
      const root = document.documentElement;
      const prev = root.style.scrollBehavior;
      root.style.scrollBehavior = 'auto';
      window.scrollTo(0, 0);
      root.style.scrollBehavior = prev;

      waitForStableLayout(target, () => {
        if (cancelled) return;
        scrollToTarget(target, id);
        pendingHashRef.current = null;
      });
    };

    raf = requestAnimationFrame(start);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [pathname, isHome]);

  const handleHashNav = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    // ctrl/cmd/shift+click และ middle-click = เปิดแท็บใหม่ ต้องไม่ interfere
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    const id = href.split('#')[1];
    if (!id) return;

    // อยู่หน้าแรกแล้ว — เลื่อนในหน้าเดียว
    if (isHome) {
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      setIsMenuOpen(false);
      waitForStableLayout(target, () => scrollToTarget(target, id));
      return;
    }

    // ข้ามหน้า — ปิดกั้น native anchor jump ของเบราว์เซอร์ (มันจะกระโดดทันที
    // ทำให้เห็นเป็นการกระโดด ไม่ใช่เลื่อนนุ่ม) แล้วค่อยเลื่อนเองหลัง render เสร็จ
    e.preventDefault();
    setIsMenuOpen(false);
    pendingHashRef.current = id;
    router.push(`/#${id}`, { scroll: false });
  };

  // ลิงก์แบบ #xxx ไม่มี pathname ตรงเป๊ะ (pathname คือ '/') จึงต้องดู hash
// รวมถึงไฮไลต์ตอนเลื่อนมาถึง section นั้นด้วย ไม่ใช่เฉพาะหลังคลิก
  const isNavActive = (href: string) => {
    if (href.includes('#')) {
      const id = href.split('#')[1];
      if (!isHome) return false;
      return id === activeHash;
    }
    return pathname === href;
  };

  // Figma 249:3559-249:3566 — 16px semibold #343434 บนช่องกว้าง 114 สูง 46
  const navLinkCls = (href: string) =>
    `flex h-[46px] w-auto items-center justify-center px-[10px] text-center text-[16px] font-semibold tracking-[0.32px] transition-colors ${
      isNavActive(href) ? 'text-[#5A95C6]' : 'text-[#343434] hover:text-[#5A95C6]'
    }`;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#FFFEF9] border-b border-[#E6F0F8]">
      {/* Height/padding: Figma 172:7380 (mobile, 64px) — desktop keeps 88px. */}
      <div className="max-w-[1146px] mx-auto flex items-center justify-between min-[992px]:grid min-[992px]:grid-cols-[1fr_auto_1fr] h-[64px] min-[992px]:h-[88px] px-[24px] min-[992px]:px-6">
        {/* Logo: CEFR + READY! badge (Figma 1:1097 desktop, 172:7382 mobile) */}
        <Link href="/" className="flex flex-col items-start group justify-self-start" aria-label="CEFR Ready หน้าหลัก">
          <span className="font-['Momo_Trust_Display'] text-[20px] leading-[26px] min-[992px]:text-[26px] min-[992px]:leading-[34px] tracking-[0.52px] text-[#5A95C6] [text-shadow:1px_1px_0_#F8E9A9]">
            CEFR
          </span>
          <span className="font-caveat min-[992px]:-mt-[3px] flex h-[19px] w-[60px] min-[992px]:h-[23px] min-[992px]:w-[78px] items-center justify-center rounded-[4px] bg-[#FFF0AE] text-[10px] min-[992px]:text-[15px] font-bold tracking-[0.24px] text-[#524924] transition-transform duration-200 group-hover:-translate-y-0.5">
            READY!
          </span>
        </Link>

        {/* Center: nav links */}
        {/* Figma 249:3558 — 4 ช่อง 114 ชิดกัน รวม 456px */}
        <nav className="hidden min-[992px]:flex items-center gap-[40px]" aria-label="เมนูหลัก">
          {menuItems.map(({ href, label }) => (
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
        <div className="flex items-center gap-1 justify-self-end">
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
                  <div className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-[#81B1C7] text-[16px] font-semibold text-white">
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
  {menuItems.map(({ href, label }) => (
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

  {/* Profile — เป็นเมนูแยก */}
  {session?.user && (
    <Link
      href="/progress"
      onClick={() => setIsMenuOpen(false)}
      className={`px-3 py-2.5 rounded-xl text-[15px] font-medium transition-colors ${
        pathname === '/progress'
          ? 'bg-[#DDF4FF] text-[#5A95C6] font-semibold'
          : 'text-[#555] hover:bg-[#F4F4F4]'
      }`}
    >
      โปรไฟล์
    </Link>
  )}

  {/* เส้นคั่น + User / Logout */}
  <div className="border-t border-[#E6F0F8] mt-2 pt-3">
    {isLoadingSession ? (
      <div
        className="h-10 rounded-xl bg-[#F4F4F4] animate-pulse"
        aria-hidden="true"
      />
    ) : session?.user ? (
      <div className="flex items-center justify-between">
        {/* User */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-[#81B1C7] text-[14px] font-semibold text-white">
            {userName.charAt(0).toUpperCase()}
          </div>

          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-sm font-semibold text-[#555] truncate">
              {userName}
            </span>

            {session?.user?.email && (
              <span className="text-xs text-[#999] truncate max-w-[180px]">
                {session.user.email}
              </span>
            )}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-[#555] hover:text-[#5A95C6] transition-colors shrink-0"
        >
          <LogOut className="w-4 h-4" />
          ออกจากระบบ
        </button>
      </div>
    ) : (
      <button
        onClick={() => {
          handleLogin();
          setIsMenuOpen(false);
        }}
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
