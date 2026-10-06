'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import ProgressStats from '@/components/ProgressStats';
import { apiFetch } from '@/lib/api-fetch';

interface HomeProgressSummary {
  testsTaken: number;
  averageScore: number;
}

interface HomeProgressResponse {
  success: boolean;
  data?: HomeProgressSummary;
}

export default function HomeProgressClient() {
  const { status } = useSession();
  const [summary, setSummary] = useState<HomeProgressSummary | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') {
      setSummary(null);
      return;
    }

    let cancelled = false;

    async function loadSummary() {
      try {
        const response = await apiFetch('/api/progress/summary');
        const body = (await response.json()) as HomeProgressResponse;
        if (!cancelled && body.success && body.data) {
          setSummary(body.data);
        }
      } catch {
        if (!cancelled) setSummary(null);
      }
    }

    void loadSummary();

    return () => {
      cancelled = true;
    };
  }, [status]);

  if (status !== 'authenticated' || !summary) return null;

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
      <ProgressStats
        testsTaken={summary.testsTaken}
        averageScore={summary.averageScore}
      />
    </section>
  );
}
