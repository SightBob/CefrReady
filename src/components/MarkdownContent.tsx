import React from 'react';

export function MarkdownContent({ content }: { content: string }) {
  const html = content
    .replace(/^### (.+)$/gm, '<h3 class="text-xl font-serif font-bold text-slate-800 mt-6 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-serif font-bold text-slate-900 mt-8 mb-3">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-3xl font-serif font-bold text-slate-900 mt-8 mb-4">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
    .replace(/^- (.+)$/gm, '<div class="flex gap-2 my-1"><span class="text-primary-400 mt-0.5">•</span><span>$1</span></div>')
    .replace(/^(\d+)\. (.+)$/gm, '<div class="flex gap-2 my-1"><span class="text-primary-500 font-medium">$1.</span><span>$2</span></div>')
    .replace(/\n\n/g, '</p><p class="mb-4">')
    .replace(/^(?!<[hdp])([^\n]+)$/gm, '<p class="mb-4">$1</p>');
    
  return (
    <div
      className="text-base text-slate-700 leading-relaxed font-sans max-w-none prose-p:mb-4"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
