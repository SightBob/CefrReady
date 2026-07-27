'use client';

import dynamic from 'next/dynamic';

const HomeTour = dynamic(() => import('./HomeTour'), { ssr: false });
const FeedbackDiscoveryModal = dynamic(
  () => import('./FeedbackDiscoveryModal'),
  { ssr: false },
);

export default function HomeClientOverlays() {
  return (
    <>
      <HomeTour />
      <FeedbackDiscoveryModal />
    </>
  );
}
