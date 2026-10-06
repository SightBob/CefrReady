'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';

// Exam pages render their own chrome — no site header/footer
// Covers section sets (/tests/[sectionId]/[setId]), full mock exam + results
const EXAM_PATH = /^\/(?:tests\/(?:[a-z-]+\/\d+|full\/(?:exam|results)))/;

// Section landing pages (/tests/focus-form, /tests/listening, …) render without
// the site header — Figma 60:174 has no navbar. `/tests/full` keeps its header,
// it is not a `[sectionId]` page.
const SECTION_PATH = /^\/tests\/(?!full(?:\/|$))[a-z-]+\/?$/;

export default function ChromeShell({
  children,
  headerFallback,
  mainFallback,
  header,
  footer,
}: {
  children: React.ReactNode;
  header: React.ReactNode;
  footer: React.ReactNode;
  headerFallback: React.ReactNode;
  mainFallback: React.ReactNode;
}) {
  const pathname = usePathname();
  const isExamPage = EXAM_PATH.test(pathname);
  const isAdminPage = pathname.startsWith('/admin');
  const isFullScreenPage = isExamPage || isAdminPage;
  const hideHeader = isFullScreenPage || SECTION_PATH.test(pathname);

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {!hideHeader && (
        <Suspense fallback={headerFallback}>
          {header}
        </Suspense>
      )}
      {/* pt matches the header: 64px on mobile (Figma 172:7380), 88px from lg up. */}
      <main className={hideHeader ? 'flex-1' : 'flex-1 pt-[64px] min-[992px]:pt-[88px] bg-white'}>
        <Suspense fallback={mainFallback}>{children}</Suspense>
      </main>
      {!isFullScreenPage && footer}
    </div>
  );
}
