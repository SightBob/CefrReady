'use client';

import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

interface ArticleSummary {
  id: number;
  title: string;
  slug: string | null;
  category: string | null;
  cefrLevel: string | null;
  tags: string[] | null;
}

interface RelatedArticlesPanelProps {
  articles: ArticleSummary[];
  isCorrect: boolean;
}

/** Simple Markdown renderer (inline) */
function renderMarkdownPreview(md: string, maxLen = 200): string {
  const stripped = md
    .replace(/^#{1,3} .+$/gm, '')        // remove headings from preview
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^- /gm, '• ')
    .replace(/^\d+\. /gm, '')
    .replace(/\n+/g, ' ')
    .trim();
  return stripped.length > maxLen ? stripped.slice(0, maxLen) + '…' : stripped;
}

function MarkdownContent({ content }: { content: string }) {
  const html = content
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold text-slate-800 mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-bold text-slate-900 mt-4 mb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold text-slate-900 mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-indigo-50 text-indigo-700 px-1 py-0.5 rounded text-xs font-mono">$1</code>')
    .replace(/^- (.+)$/gm, '<div class="flex gap-2 my-0.5"><span class="text-indigo-400 mt-0.5">•</span><span>$1</span></div>')
    .replace(/^(\d+)\. (.+)$/gm, '<div class="flex gap-2 my-0.5"><span class="text-indigo-400 font-medium">$1.</span><span>$2</span></div>')
    .replace(/\n\n/g, '</p><p class="mb-2">')
    .replace(/^(?!<[hdp])([^\n]+)$/gm, '<p class="mb-2">$1</p>');
  return (
    <div
      className="text-sm text-slate-700 leading-relaxed prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function ArticleAccordion({ article }: { article: ArticleSummary & { content?: string } }) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState<string | null>(article.content ?? null);
  const [loading, setLoading] = useState(false);

  const handleOpen = async () => {
    if (!open && content === null && article.slug) {
      setLoading(true);
      try {
        const res = await fetch(`/api/articles/${article.slug}`);
        const json = await res.json();
        if (json.success) setContent(json.data.content);
      } finally {
        setLoading(false);
      }
    }
    setOpen(o => !o);
  };

  return (
    <div className="border border-indigo-100 rounded-xl overflow-hidden">
      <button
        onClick={handleOpen}
        className="w-full flex items-center justify-between px-4 py-3 bg-indigo-50 hover:bg-indigo-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
          <span className="font-medium text-indigo-800 text-sm truncate">{article.title}</span>
          {article.cefrLevel && (
            <span className="text-xs px-1.5 py-0.5 bg-indigo-200 text-indigo-700 rounded-full shrink-0">
              {article.cefrLevel}
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-indigo-400 shrink-0 ml-2" />
        ) : (
          <ChevronDown className="w-4 h-4 text-indigo-400 shrink-0 ml-2" />
        )}
      </button>

      {open && (
        <div className="px-4 py-4 bg-white border-t border-indigo-100">
          {loading ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-3 w-3/4 bg-slate-100 rounded" />
              <div className="h-3 w-full bg-slate-100 rounded" />
              <div className="h-3 w-5/6 bg-slate-100 rounded" />
            </div>
          ) : content ? (
            <MarkdownContent content={content} />
          ) : (
            <p className="text-slate-400 text-sm italic">ไม่สามารถโหลดเนื้อหาได้</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function RelatedArticlesPanel({ articles, isCorrect }: RelatedArticlesPanelProps) {
  if (articles.length === 0 || isCorrect) return null;

  return (
    <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-4 h-4 text-indigo-500" />
        <span className="text-sm font-semibold text-indigo-700">📖 บทความที่เกี่ยวข้อง</span>
        <span className="text-xs text-indigo-400">คลิกเพื่ออ่านเพิ่มเติม</span>
      </div>
      <div className="space-y-2">
        {articles.map(a => (
          <ArticleAccordion key={a.id} article={a} />
        ))}
      </div>
    </div>
  );
}
