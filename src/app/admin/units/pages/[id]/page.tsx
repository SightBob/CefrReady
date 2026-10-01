'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import LessonPageEditor from '@/components/admin/LessonPageEditor';
import type { LessonSection } from '@/content/units-path-lessons';

interface PageData {
  id: number;
  nodeId: number;
  pageType: string;
  sections: LessonSection[] | null;
  quiz:
    | { sentence: string; options: string[]; answerIndex: number; explanation: string }
    | { questions: Array<{ sentence: string; options: string[]; answerIndex: number; explanation: string }> }
    | null;
  vocabBank: Array<{ subject: string; verbForm: string; example: string }> | { columns: string[]; rows: string[][] } | null;
  tip: string | null;
  intro: string | null;
  isPublished: boolean;
  orderIndex: number;
}

export default function EditLessonPage() {
  const params = useParams();
  const pageId = parseInt(params.id as string);

  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<PageData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const unitsRes = await fetch('/api/admin/units');
        const unitsJson = await unitsRes.json();
        if (!unitsJson.success) {
          setError(unitsJson.error ?? 'โหลดข้อมูลไม่สำเร็จ');
          return;
        }
        for (const unit of unitsJson.data) {
          for (const node of unit.nodes) {
            const pagesRes = await fetch(`/api/admin/nodes/${node.id}/pages`);
            const pagesJson = await pagesRes.json();
            if (pagesJson.success) {
              const found = (pagesJson.data as PageData[]).find((p) => p.id === pageId);
              if (found) {
                setPage(found);
                return;
              }
            }
          }
        }
        setError('ไม่พบหน้าที่ต้องการแก้ไข');
      } catch {
        setError('ไม่สามารถโหลดข้อมูลได้');
      } finally {
        setLoading(false);
      }
    })();
  }, [pageId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-red-600 text-sm">{error || 'ไม่พบหน้าที่ต้องการแก้ไข'}</p>
      </div>
    );
  }

  return (
    <LessonPageEditor
      pageId={page.id}
      initial={{
        id: page.id,
        nodeId: page.nodeId,
        pageType: page.pageType,
        sections: page.sections ?? [],
        quiz: page.quiz,
        vocabBank: page.vocabBank,
        tip: page.tip,
        intro: page.intro,
        isPublished: page.isPublished,
        orderIndex: page.orderIndex,
      }}
    />
  );
}
