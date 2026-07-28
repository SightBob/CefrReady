'use client';

import dynamic from 'next/dynamic';

const HomeTour = dynamic(() => import('./HomeTour'), { ssr: false });

// FeedbackDiscoveryModal intentionally not rendered — feature disabled until
// the feedback survey launches. Re-add here and in TestsPageClient to enable.
export default function HomeClientOverlays() {
  return (
    <>
      <HomeTour />
    </>
  );
}
