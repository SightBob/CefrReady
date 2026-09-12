'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import LessonPageEditor from '@/components/admin/LessonPageEditor';

export default function NewLessonPage() {
  const params = useParams();
  const nodeId = parseInt(params.id as string);
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
        pageType: 'explain',
        sections: [],
        quiz: null,
        vocabBank: null,
        tip: null,
        intro: null,
        orderIndex: 0,
      }}
    />
  );
}
