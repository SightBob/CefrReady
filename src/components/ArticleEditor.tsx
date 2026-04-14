'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Plus, Trash2, Eye, EyeOff, Type } from 'lucide-react';

interface Blank {
  id: number;
  correctAnswer: string;
  hint?: string;
}

interface Article {
  title: string;
  text: string;
  blanks: Blank[];
}

interface ArticleEditorProps {
  article: Article;
  onChange: (article: Article) => void;
}

export default function ArticleEditor({ article, onChange }: ArticleEditorProps) {
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Parse {{N}} markers from article text to auto-populate blanks
  const parseBlanks = useCallback((text: string, existingBlanks: Blank[]): Blank[] => {
    const regex = /\{\{(\d+)\}\}/g;
    const foundIds = new Set<number>();
    let match;

    while ((match = regex.exec(text)) !== null) {
      foundIds.add(parseInt(match[1]));
    }

    // Keep existing blanks for found IDs, add new ones for new IDs
    const existingMap = new Map(existingBlanks.map(b => [b.id, b]));
    const blanks: Blank[] = [];

    foundIds.forEach(id => {
      if (existingMap.has(id)) {
        blanks.push(existingMap.get(id)!);
      } else {
        blanks.push({ id, correctAnswer: '', hint: '' });
      }
    });

    return blanks;
  }, []);

  // Auto-parse blanks when article text changes
  useEffect(() => {
    const newBlanks = parseBlanks(article.text, article.blanks);
    // Only update if blanks actually changed (avoid infinite loop)
    if (JSON.stringify(newBlanks.map(b => b.id)) !== JSON.stringify(article.blanks.map(b => b.id))) {
      onChange({ ...article, blanks: newBlanks });
    }
  }, [article.text]);

  const insertBlank = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const nextId = article.blanks.length > 0
      ? Math.max(...article.blanks.map(b => b.id)) + 1
      : 1;

    const text = article.text;
    const marker = `{{${nextId}}}`;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const newText = text.substring(0, start) + marker + text.substring(end);
    const newBlanks = parseBlanks(newText, article.blanks);

    onChange({ ...article, text: newText, blanks: newBlanks });

    // Restore cursor position after React re-render
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = start + marker.length;
        textareaRef.current.selectionEnd = start + marker.length;
        textareaRef.current.focus();
      }
    });
  };

  const updateTitle = (title: string) => {
    onChange({ ...article, title });
  };

  const updateText = (text: string) => {
    onChange({ ...article, text });
  };

  const updateBlank = (blankId: number, field: 'correctAnswer' | 'hint', value: string) => {
    const newBlanks = article.blanks.map(b =>
      b.id === blankId ? { ...b, [field]: value } : b
    );
    onChange({ ...article, blanks: newBlanks });
  };

  const removeBlank = (blankId: number) => {
    const marker = `{{${blankId}}}`;
    const newText = article.text.replace(marker, '');
    const newBlanks = article.blanks.filter(b => b.id !== blankId);
    onChange({ ...article, text: newText, blanks: newBlanks });
  };

  const renderPreview = () => {
    let text = article.text;
    const parts: React.ReactNode[] = [];
    let keyIndex = 0;

    article.blanks.forEach((blank) => {
      const placeholder = `{{${blank.id}}}`;
      const splitIndex = text.indexOf(placeholder);

      if (splitIndex !== -1) {
        parts.push(<span key={keyIndex++}>{text.substring(0, splitIndex)}</span>);
        parts.push(
          <span key={keyIndex++} className="inline-flex items-center mx-1 px-3 py-1 rounded-md bg-purple-100 text-purple-700 font-medium border border-purple-300">
            [{blank.id}] {blank.correctAnswer || '???'}
          </span>
        );
        text = text.substring(splitIndex + placeholder.length);
      }
    });

    parts.push(<span key={keyIndex}>{text}</span>);
    return parts;
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          เธเธทเนเธญเธเธ—เธเธงเธฒเธก <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={article.title}
          onChange={(e) => updateTitle(e.target.value)}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="เธเธทเนเธญเธเธ—เธเธงเธฒเธก..."
        />
      </div>

      {/* Article text with blank insertion */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-slate-700">
            เน€เธเธทเนเธญเธซเธฒเธเธ—เธเธงเธฒเธก <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={insertBlank}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            เนเธ—เธฃเธเธเนเธญเธเธงเนเธฒเธ
          </button>
        </div>
        <textarea
          ref={textareaRef}
          value={article.text}
          onChange={(e) => updateText(e.target.value)}
          className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
          rows={8}
          placeholder="เน€เธเธตเธขเธเน€เธเธทเนเธญเธซเธฒเธเธ—เธเธงเธฒเธกเธ—เธตเนเธเธตเน... เนเธเนเธเธธเนเธก 'เนเธ—เธฃเธเธเนเธญเธเธงเนเธฒเธ' เน€เธเธทเนเธญเน€เธเธดเนเธกเธเนเธญเธเธงเนเธฒเธเธฅเธเนเธเธเนเธญเธเธงเธฒเธก&#10;&#10;เธ•เธฑเธงเธญเธขเนเธฒเธ: The cat sat on the {{1}} and looked at the {{2}}."
        />
        <p className="text-xs text-slate-400 mt-1">
          เธงเธฒเธ cursor เนเธเธ•เธณเนเธซเธเนเธเธ—เธตเนเธ•เนเธญเธเธเธฒเธฃ เนเธฅเนเธงเธเธ”เธเธธเนเธก &quot;เนเธ—เธฃเธเธเนเธญเธเธงเนเธฒเธ&quot; โ€” เธเนเธญเธเธงเนเธฒเธเธเธฐเนเธชเธ”เธเน€เธเนเธ {'{{1}}'}, {'{{2}}'}, เธฏเธฅเธฏ
        </p>
      </div>

      {/* Blanks list */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Type className="w-4 h-4 text-purple-600" />
          <h3 className="text-sm font-semibold text-slate-700">
            เธเนเธญเธเธงเนเธฒเธ ({article.blanks.length})
          </h3>
        </div>

        {article.blanks.length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg">
            <p className="text-slate-500 text-sm">เธขเธฑเธเนเธกเนเธกเธตเธเนเธญเธเธงเนเธฒเธ</p>
            <p className="text-slate-400 text-xs mt-1">เน€เธเธตเธขเธเธเนเธญเธเธงเธฒเธกเนเธฅเนเธงเธเธ” &quot;เนเธ—เธฃเธเธเนเธญเธเธงเนเธฒเธ&quot; เน€เธเธทเนเธญเน€เธเธดเนเธก</p>
          </div>
        ) : (
          <div className="space-y-3">
            {article.blanks.map((blank) => (
              <div key={blank.id} className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-200 text-purple-700 text-sm font-bold shrink-0">
                  {blank.id}
                </span>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      เธเธณเธ•เธญเธเธ—เธตเนเธ–เธนเธเธ•เนเธญเธ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={blank.correctAnswer}
                      onChange={(e) => updateBlank(blank.id, 'correctAnswer', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      placeholder="เธเธณเธ•เธญเธ..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      เธเธณเนเธเน (เนเธกเนเธเธณเน€เธเนเธ)
                    </label>
                    <input
                      type="text"
                      value={blank.hint || ''}
                      onChange={(e) => updateBlank(blank.id, 'hint', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      placeholder="เธเธณเนเธเน..."
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeBlank(blank.id)}
                  className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors shrink-0"
                  title="เธฅเธเธเนเธญเธเธงเนเธฒเธ"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live preview */}
      {article.title && article.text && (
        <div>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 mb-3"
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPreview ? 'เธเนเธญเธเธ•เธฑเธงเธญเธขเนเธฒเธ' : 'เนเธชเธ”เธเธ•เธฑเธงเธญเธขเนเธฒเธ'}
          </button>
          {showPreview && (
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <h4 className="text-lg font-bold text-slate-800 mb-4">{article.title}</h4>
              <div className="text-base text-slate-700 leading-relaxed">
                {renderPreview()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
