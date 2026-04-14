import React from 'react';

export function MarkdownContent({ content }: { content: string }) {
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
