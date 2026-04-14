'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import GrammarArticleEditor from '@/components/GrammarArticleEditor';

export default function EditArticlePage() {
  const params = useParams();
  const id = parseInt(params.id as string);

  const [loading, setLoading] = useState(true);
  const [initial, setInitial] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/admin/articles/${id}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          const d = json.data;
          setInitial({
            title: d.title ?? '',
            content: d.content ?? '',
            category: d.category ?? '',
            cefrLevel: d.cefrLevel ?? '',
            tags: Array.isArray(d.tags) ? d.tags.join(', ') : (d.tags ?? ''),
            isPublished: d.isPublished ?? false,
          });
        } else {
          setError(json.error || 'ไม่พบบทความ');
        }
      })
      .catch(() => setError('ไม่สามารถโหลดข้อมูลได้'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (error || !initial) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-red-600 text-sm">{error || 'ไม่พบบทความ'}</p>
      </div>
    );
  }

  return (
    <GrammarArticleEditor
      mode="edit"
      articleId={id}
      initial={initial as Parameters<typeof GrammarArticleEditor>[0]['initial']}
    />
  );
}
