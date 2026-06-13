'use client';

import DOMPurify from 'dompurify';
import React from 'react';

export function MarkdownContent({ content }: { content: string }) {
  const html = content
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold tracking-tight text-stone-800 mt-8 mb-3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold tracking-tight text-stone-800 mt-9 mb-3.5">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold tracking-tight text-stone-800 mt-8 mb-4">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-stone-800">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    .replace(/`(.+?)`/g, '<code class="font-mono text-[13px] bg-stone-100 px-1.5 py-0.5 rounded">$1</code>')
    .replace(/^- (.+)$/gm, '<div class="flex gap-2 my-1"><span class="text-stone-300 mt-0.5">•</span><span>$1</span></div>')
    .replace(/^(\d+)\. (.+)$/gm, '<div class="flex gap-2 my-1"><span class="text-stone-400 font-medium">$1.</span><span>$2</span></div>')
    .replace(/\n\n/g, '</p><p class="mb-[1.125rem]">')
    .replace(/^(?!<[hdp])([^\n]+)$/gm, '<p class="mb-[1.125rem]">$1</p>');

  const cleanHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'div', 'span', 'strong', 'em', 'code', 'ul', 'ol', 'li', 'br'],
    ALLOWED_ATTR: ['class'],
  });

  return (
    <div
      className="text-[16px] leading-[1.8] text-stone-800 max-w-none"
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
}
