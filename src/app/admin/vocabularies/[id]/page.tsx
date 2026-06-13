'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import VocabularyEditor from '@/components/VocabularyEditor';

export default function EditVocabularyPage() {
  const params = useParams();
  const id = params.id as string;
  const [initial, setInitial] = useState<Record<string, unknown> | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/vocabularies/${id}`)
      .then(res => res.json())
      .then(json => {
        if (json.success) setInitial(json.data);
        else setNotFound(true);
      });
  }, [id]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">ไม่พบคำศัพท์นี้</p>
      </div>
    );
  }

  if (!initial) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return <VocabularyEditor mode="edit" vocabularyId={parseInt(id)} initial={initial} />;
}
