import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, LayoutGrid } from 'lucide-react';
import { auth } from '@/lib/auth';
import TestSetCard, { type TestSetData } from '@/components/TestSetCard';
import type { SectionData } from '@/components/SectionCard';

type SectionWithSets = Omit<SectionData, 'testSets'> & { testSets: TestSetData[] };

interface PageProps {
  params: { sectionId: string };
}

const SECTION_ICON_CLASS: Record<string, string> = {
  'focus-form': 'text-blue-600',
  'focus-meaning': 'text-emerald-600',
  'form-meaning': 'text-purple-600',
  'listening': 'text-orange-600',
};

const SECTION_BG: Record<string, string> = {
  'focus-form': 'bg-blue-50',
  'focus-meaning': 'bg-emerald-50',
  'form-meaning': 'bg-purple-50',
  'listening': 'bg-orange-50',
};

import { fetchSectionsFromDb } from '@/lib/sections';

async function getSectionWithSets(sectionId: string): Promise<SectionWithSets | null> {
  try {
    const rawSections = await fetchSectionsFromDb();
    const sections: SectionWithSets[] = rawSections as any;
    return sections.find((s) => s.id === sectionId) ?? null;
  } catch (err) {
    console.error('[tests/sectionId] Failed to fetch section:', err);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { sectionId } = params;
  const section = await getSectionWithSets(sectionId);
  if (!section) return { title: 'Not Found | CEFR Ready' };
  return {
    title: `${section.name} | CEFR Ready`,
    description: section.description ?? `Choose a test set in ${section.name}`,
  };
}

import TestsLoginPrompt from '../TestsLoginPrompt';

export default async function SectionPage({ params }: PageProps) {
  const session = await auth();
  const section = await getSectionWithSets(params.sectionId as string);
  if (!section) notFound();

  const activeSets = section.testSets.filter((s) => s.isActive);

  const bgClass = SECTION_BG[section.id] ?? 'bg-slate-50';
  const textClass = SECTION_ICON_CLASS[section.id] ?? 'text-slate-600';

  if (!session?.user) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/tests" className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors mb-6">
          <ArrowLeft className="w-5 h-5" />
          Back to Tests
        </Link>
        <div className="flex items-center gap-4 mb-8">
          <div className={`${bgClass} p-3 rounded-2xl`}>
            <LayoutGrid className={`w-8 h-8 ${textClass}`} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{section.name}</h1>
            {section.description && <p className="text-slate-500 text-sm mt-0.5">{section.description}</p>}
          </div>
        </div>

        <TestsLoginPrompt />

        <div className="relative mt-8">
          <div className="space-y-3 opacity-60 pointer-events-none">
            {activeSets.map((ts, index) => (
              <TestSetCard key={ts.id} testSet={ts} sectionId={section.id} index={index} />
            ))}
          </div>
          <div className="absolute inset-0 bg-slate-100/30 rounded-2xl flex items-center justify-center">
             <div className="bg-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-slate-600">
                <span className="font-medium">Login Required</span>
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back */}
      <Link
        href="/tests"
        className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Tests
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className={`${bgClass} p-3 rounded-2xl`}>
          <LayoutGrid className={`w-8 h-8 ${textClass}`} />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{section.name}</h1>
          {section.description && (
            <p className="text-slate-500 text-sm mt-0.5">{section.description}</p>
          )}
        </div>
      </div>

      {/* Subtitle */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-slate-600 font-medium">
          {activeSets.length} {activeSets.length === 1 ? 'Test Set' : 'Test Sets'} available
        </p>
      </div>

      {/* Test Sets */}
      {activeSets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-500">
          <LayoutGrid className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="font-medium">No test sets available yet.</p>
          <p className="text-sm mt-1">Please check back later.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeSets.map((ts, index) => (
            <TestSetCard
              key={ts.id}
              testSet={ts}
              sectionId={section.id}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  );
}
