'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';

// Exam pages render their own chrome — no site header/footer
// Covers section sets (/tests/[sectionId]/[setId]) and full mock exam + results
const EXAM_PATH = /^\/tests\/(?:[a-z-]+\/\d+|full\/(?:exam|results))/;

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

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {!isExamPage && (
        <Suspense fallback={headerFallback}>
          <Header />
        </Suspense>
      )}
      <main className={isExamPage ? 'flex-1' : 'flex-1 pt-16 bg-white'}>
        <Suspense fallback={mainFallback}>{children}</Suspense>
      </main>
      {!isExamPage && <Footer />}
    </div>
  );
}
