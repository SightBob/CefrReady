'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';

// Exam/lesson pages render their own chrome — no site header/footer
// Covers section sets (/tests/[sectionId]/[setId]), full mock exam + results,
// and lesson pages (/units/[nodeId])
const EXAM_PATH = /^\/(?:tests\/(?:[a-z-]+\/\d+|full\/(?:exam|results))|units\/\d+)/;

export default function ChromeShell({
  children,
  headerFallback,
  mainFallback,
}: {
  children: React.ReactNode;
  headerFallback: React.ReactNode;
  mainFallback: React.ReactNode;
}) {
  const pathname = usePathname();
  const isExamPage = EXAM_PATH.test(pathname);
  const isAdminPage = pathname.startsWith('/admin');
  const isFullScreenPage = isExamPage || isAdminPage;

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {!isFullScreenPage && (
        <Suspense fallback={headerFallback}>
          <Header />
        </Suspense>
      )}
      <main className={isFullScreenPage ? 'flex-1' : 'flex-1 pt-16 bg-white'}>
        <Suspense fallback={mainFallback}>{children}</Suspense>
      </main>
      {!isFullScreenPage && <Footer />}
    </div>
  );
}
