'use client';

import { useEffect, useState } from 'react';
import { Wrench } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ConfirmModal';

/**
 * Admin dashboard switch for site-wide maintenance mode.
 * Reads/writes the Redis-backed flag via /api/admin/maintenance.
 */
export default function MaintenanceToggle() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetch('/api/admin/maintenance')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { enabled?: boolean } | null) => setEnabled(data?.enabled ?? null))
      .catch(() => setEnabled(null));
  }, []);

  const confirmToggle = async () => {
    if (enabled === null) return;
    setIsToggling(true);
    try {
      const res = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      });
      const data = (await res.json().catch(() => null)) as
        | { success?: boolean; enabled?: boolean; error?: string }
        | null;
      if (!res.ok || !data?.success) throw new Error(data?.error ?? 'toggle failed');
      setEnabled(data.enabled ?? !enabled);
      toast.success(
        data.enabled
          ? 'ปิดปรับปรุงเว็บแล้ว — visitor จะเจอหน้า maintenance'
          : 'เปิดเว็บกลับมาปกติแล้ว'
      );
    } catch (error) {
      console.error('[MaintenanceToggle] toggle failed:', error);
      toast.error('สลับสถานะไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsToggling(false);
      setModalOpen(false);
    }
  };

  const isOn = enabled === true;
  const isUnknown = enabled === null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`${isOn ? 'bg-red-50' : 'bg-emerald-50'} p-3 rounded-lg`}>
            <Wrench className={`w-6 h-6 ${isOn ? 'text-red-500' : 'text-emerald-600'}`} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Maintenance Mode</h2>
            <p className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
              {isUnknown ? (
                <>
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300 inline-block" />
                  ไม่ทราบสถานะ (โหลดล้มเหลว)
                </>
              ) : (
                <>
                  <span
                    className={`h-2.5 w-2.5 rounded-full inline-block ${
                      isOn ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'
                    }`}
                  />
                  {isOn ? 'ปิดปรับปรุงอยู่ — visitor เข้าเว็บไม่ได้' : 'เว็บเปิดให้ใช้งานปกติ'}
                </>
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={isUnknown || isToggling}
          onClick={() => setModalOpen(true)}
          className={`px-4 py-2 rounded-lg font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isOn ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {isToggling ? 'กำลังสลับ...' : isOn ? 'เปิดเว็บคืน' : 'ปิดปรับปรุง (ปิดเว็บ)'}
        </button>
      </div>

      <ConfirmModal
        isOpen={modalOpen}
        title={isOn ? 'เปิดเว็บกลับมาปกติ?' : 'ปิดเว็บชั่วคราว?'}
        description={
          isOn
            ? 'Visitor ทุกคนจะกลับมาใช้งานเว็บได้ตามปกติทันที'
            : 'Visitor ทุกคนจะเห็นหน้า "ปิดปรับปรุง" และ API จะตอบ 503 (admin ยังเข้าได้ตามปกติ)'
        }
        confirmLabel={isOn ? 'เปิดเว็บคืน' : 'ยืนยันปิดเว็บ'}
        type={isOn ? 'info' : 'danger'}
        onConfirm={confirmToggle}
        onCancel={() => setModalOpen(false)}
        isLoading={isToggling}
      />
    </div>
  );
}
