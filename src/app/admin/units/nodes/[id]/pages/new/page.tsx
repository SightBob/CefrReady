'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import LessonPageEditor from '@/components/admin/LessonPageEditor';

function NewLessonPageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const nodeId = parseInt(params.id as string);
  const initialType = searchParams.get('type') === 'tap' ? 'tap' : 'explain';
  const [ready, setReady] = useState(Number.isFinite(nodeId));

  useEffect(() => {
    setReady(Number.isFinite(nodeId));
  }, [nodeId]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <LessonPageEditor
      pageId={null}
      initial={{
        id: 0,
        nodeId,
        pageType: initialType,
        sections: [],
        quiz: null,
        vocabBank: null,
        tip: null,
        intro: null,
        isPublished: true,
        orderIndex: 0,
      }}
    />
  );
}

export default function NewLessonPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      }
    >
      <NewLessonPageInner />
    </Suspense>
  );
}
