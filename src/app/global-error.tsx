'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0 }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8fafc',
            padding: '1rem',
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div
              style={{
                display: 'inline-flex',
                backgroundColor: '#fef2f2',
                padding: '1rem',
                borderRadius: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <AlertTriangle style={{ width: '2.5rem', height: '2.5rem', color: '#ef4444' }} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
              เกิดข้อผิดพลาดร้ายแรง
            </h2>
            <p style={{ color: '#64748b', marginBottom: '2rem' }}>
              แอปพลิเคชันเกิดข้อผิดพลาดที่ไม่สามารถแก้ไขได้โดยอัตโนมัติ
            </p>
            <button
              onClick={reset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#6366f1',
                color: 'white',
                padding: '0.625rem 1.25rem',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '0.875rem',
              }}
            >
              <RefreshCw style={{ width: '1rem', height: '1rem' }} />
              ลองใหม่
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
