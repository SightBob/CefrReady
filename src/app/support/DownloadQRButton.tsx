'use client';

import { Download } from 'lucide-react';
import { useState } from 'react';

export default function DownloadQRButton() {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const res = await fetch('/coffee-qr.jpg');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cefr-ready-qr.jpg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#111] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#333] transition-colors disabled:opacity-60"
    >
      <Download className="w-4 h-4" />
      {loading ? 'กำลังดาวน์โหลด...' : 'ดาวน์โหลด QR'}
    </button>
  );
}
