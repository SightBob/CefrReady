'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import ProgressStats from './ProgressStats';

interface ProgressResponse {
  success: boolean;
  data?: {
    overall: {
      testsTaken: number;
      averageScore: number;
    };
  };
}

export default function HomeProgressClient() {
  const { status } = useSession();
  const [progress, setProgress] = useState<{ testsTaken: number; averageScore: number } | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') {
      setProgress(null);
      return;
    }

    let cancelled = false;

    fetch('/api/progress')
      .then((res) => (res.ok ? res.json() : null))
      .then((json: ProgressResponse | null) => {
        if (cancelled || !json?.success || !json.data) return;
        setProgress({
          testsTaken: json.data.overall.testsTaken,
          averageScore: json.data.overall.averageScore,
        });
      })
      .catch(() => {
        if (!cancelled) setProgress(null);
      });

    return () => {
      cancelled = true;
    };
  }, [status]);

  if (status !== 'authenticated' || !progress) return null;

  return (
    <section className="mb-16">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">ความก้าวหน้าของคุณ</h2>
        <Link
          href="/progress"
          className="text-sm text-primary-600 hover:text-primary-700 font-medium hover:underline"
        >
          ดูทั้งหมด →
        </Link>
      </div>
      <ProgressStats testsTaken={progress.testsTaken} averageScore={progress.averageScore} />
    </section>
  );
}
