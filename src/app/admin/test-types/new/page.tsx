'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, LayoutDashboard } from 'lucide-react';

interface FormData {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  duration: string;
  questionCount: string;
}

export default function NewTestTypePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormData>({
    id: '',
    name: '',
    description: '',
    icon: '',
    color: '',
    duration: '',
    questionCount: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.id.trim() || !form.name.trim()) {
      setError('ID และชื่อจำเป็นต้องกรอก');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/admin/test-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (response.ok) {
        router.push('/admin/test-types');
      } else {
        const data = await response.json();
        setError(data.error || 'เกิดข้อผิดพลาดในการสร้างประเภทข้อสอบ');
      }
    } catch (err) {
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin/test-types" className="text-slate-600 hover:text-primary-600">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-500 p-2 rounded-lg">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">เพิ่มประเภทข้อสอบใหม่</h1>
              <p className="text-slate-600 text-sm">สร้างประเภทข้อสอบสำหรับระบบ</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.id}
                onChange={(e) => updateField('id', e.target.value.replace(/\s/g, '-').toLowerCase())}
                placeholder="เช่น focus-form"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-slate-400 mt-1">ใช้เป็น identifier เช่น focus-form, listening</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                ชื่อ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="เช่น Focus on Form"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">คำอธิบาย</label>
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="รายละเอียดเกี่ยวกับประเภทข้อสอบ"
              rows={3}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ไอคอน (Emoji)</label>
              <input
                type="text"
                value={form.icon}
                onChange={(e) => updateField('icon', e.target.value)}
                placeholder="เช่น 📖"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">สี (CSS class)</label>
              <input
                type="text"
                value={form.color}
                onChange={(e) => updateField('color', e.target.value)}
                placeholder="เช่น blue-500"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ระยะเวลา (นาที)</label>
              <input
                type="number"
                value={form.duration}
                onChange={(e) => updateField('duration', e.target.value)}
                placeholder="เช่น 30"
                min="1"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">จำนวนข้อสอบ</label>
              <input
                type="number"
                value={form.questionCount}
                onChange={(e) => updateField('questionCount', e.target.value)}
                placeholder="เช่น 20"
                min="1"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Link href="/admin/test-types" className="btn-secondary">
              ยกเลิก
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}