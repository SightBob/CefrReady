'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, Download, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface ImportError {
  message: string;
}

interface ImportResult {
  success: boolean;
  message?: string;
  importedCount?: number;
  errors?: string[];
  warnings?: string[];
  totalRows?: number;
  validRows?: number;
  invalidRows?: number;
}

export default function ImportQuestionsPage() {
  const [csvData, setCsvData] = useState('');
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvData(content);
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/admin/questions/import');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'questions-template.csv';
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading template:', error);
    }
  };

  const handleValidate = async () => {
    if (!csvData.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/questions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvData, dryRun: true }),
      });

      const data = await response.json();

      // Normalize: API may return { error: "string" } or { errors: [...] }
      if (data.error && !data.errors) {
        data.errors = [data.error];
        data.success = false;
      }

      setResult(data);
      setShowPreview(true);
    } catch {
      setResult({
        success: false,
        errors: ['ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้'],
        totalRows: 0,
        validRows: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!csvData.trim() || !result?.success) return;

    setLoading(true);

    try {
      const response = await fetch('/api/admin/questions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvData, dryRun: false }),
      });

      const data = await response.json();
      setResult(data);
      if (data.success) {
        setShowSuccessModal(true);
      }
    } catch (error) {
      setResult({
        success: false,
        errors: ['ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้'],
      });
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setCsvData('');
    setFileName('');
    setResult(null);
    setShowPreview(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin/questions" className="text-slate-600 hover:text-primary-600">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">นำเข้าข้อสอบจำนวนมาก</h1>
            <p className="text-slate-600 mt-1">อัปโหลดไฟล์ CSV เพื่อนำเข้าข้อสอบทีละหลายๆ ข้อ</p>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">ขั้นตอนที่ 1: อัปโหลดไฟล์ CSV</h2>
            <button
              onClick={handleDownloadTemplate}
              className="text-sm text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              ดาวน์โหลดเทมเพลต
            </button>
          </div>

          <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
            <Upload className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 mb-2">ลากไฟล์ CSV มาวางที่นี่ หรือ</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="btn-primary inline-block cursor-pointer"
            >
              เลือกไฟล์
            </label>
            {fileName && (
              <p className="text-sm text-slate-500 mt-2">ไฟล์: {fileName}</p>
            )}
          </div>

          {csvData && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">แสดงตัวอย่างข้อมูล CSV</label>
                <button
                  onClick={clearAll}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  ล้างทั้งหมด
                </button>
              </div>
              <textarea
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                rows={8}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}

          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              onClick={handleValidate}
              disabled={!csvData.trim() || loading}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              ตรวจสอบข้อมูล
            </button>
          </div>
        </div>

        {/* Validation Results */}
        {result && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">ผลการตรวจสอบ</h2>

            {result.success ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-800">ตรวจสอบผ่าน</p>
                    <p className="text-sm text-green-700 mt-1">
                      {result.message || `พบ ${result.totalRows} แถว พร้อมนำเข้า`}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <XCircle className="w-6 h-6 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">พบข้อผิดพลาด</p>
                    <p className="text-sm text-red-700 mt-1">
                      {result.validRows != null && result.totalRows != null
                        ? `แถวที่ถูกต้อง: ${result.validRows} / ${result.totalRows}`
                        : result.message || 'ข้อมูลไม่ถูกต้อง'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {result.errors && result.errors.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-red-700 mb-2 flex items-center gap-1">
                  <XCircle className="w-4 h-4" />
                  ข้อผิดพลาด ({result.errors.length})
                </h3>
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 max-h-64 overflow-y-auto">
                  <ul className="space-y-1">
                    {result.errors.map((error, idx) => (
                      <li key={idx} className="text-sm text-red-700">
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {result.warnings && result.warnings.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-amber-700 mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  คำเตือน ({result.warnings.length})
                </h3>
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 max-h-48 overflow-y-auto">
                  <ul className="space-y-1">
                    {result.warnings.map((warning, idx) => (
                      <li key={idx} className="text-sm text-amber-700">
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {result.success && (
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={clearAll}
                  className="btn-secondary"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleImport}
                  disabled={loading}
                  className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {loading ? 'กำลังนำเข้า...' : `นำเข้า ${result.importedCount} ข้อ`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* CSV Format Guide */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">รูปแบบไฟล์ CSV</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-700">Column</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-700">Required</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-700">Description</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-700">Example</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-3 py-2 font-mono text-primary-600">testTypeId</td>
                  <td className="px-3 py-2 text-green-600">✓</td>
                  <td className="px-3 py-2 text-slate-600">ประเภทข้อสอบ</td>
                  <td className="px-3 py-2 font-mono text-xs">focus-form, focus-meaning, form-meaning, listening</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono text-primary-600">questionText</td>
                  <td className="px-3 py-2 text-green-600">✓</td>
                  <td className="px-3 py-2 text-slate-600">โจทย์ข้อสอบ</td>
                  <td className="px-3 py-2 text-xs">Choose the correct form...</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono text-primary-600">optionA-D</td>
                  <td className="px-3 py-2 text-green-600">✓*</td>
                  <td className="px-3 py-2 text-slate-600">ตัวเลือก (*ไม่บังคับสำหรับ form-meaning และ focus-meaning C/D)</td>
                  <td className="px-3 py-2 font-mono text-xs">go</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono text-primary-600">correctAnswer</td>
                  <td className="px-3 py-2 text-green-600">✓*</td>
                  <td className="px-3 py-2 text-slate-600">คำตอบที่ถูก (A-D, *ไม่บังคับ form-meaning)</td>
                  <td className="px-3 py-2 font-mono text-xs">B</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono text-primary-600">explanation</td>
                  <td className="px-3 py-2 text-slate-400">-</td>
                  <td className="px-3 py-2 text-slate-600">คำอธิบาย</td>
                  <td className="px-3 py-2 text-xs">Present simple...</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono text-primary-600">cefrLevel</td>
                  <td className="px-3 py-2 text-green-600">✓</td>
                  <td className="px-3 py-2 text-slate-600">ระดับ CEFR</td>
                  <td className="px-3 py-2 font-mono text-xs">A1, B1, C1</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono text-primary-600">difficulty</td>
                  <td className="px-3 py-2 text-amber-500">~</td>
                  <td className="px-3 py-2 text-slate-600">ความยาก</td>
                  <td className="px-3 py-2 font-mono text-xs">easy, medium, hard</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono text-primary-600">testSetId</td>
                  <td className="px-3 py-2 text-slate-400">-</td>
                  <td className="px-3 py-2 text-slate-600">ระบุ ID ชุดข้อสอบที่จะเพิ่มข้อนี้ลงไป</td>
                  <td className="px-3 py-2 font-mono text-xs">1, 2, 3...</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono text-purple-600">conversation</td>
                  <td className="px-3 py-2 text-purple-600">✓†</td>
                  <td className="px-3 py-2 text-slate-600">JSON array — สำหรับ focus-meaning (†จำเป็นสำหรับ focus-meaning)</td>
                  <td className="px-3 py-2 text-xs font-mono">{'[{"speaker":"A","name":"Tom","text":"Hi"}]'}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono text-purple-600">article</td>
                  <td className="px-3 py-2 text-purple-600">✓†</td>
                  <td className="px-3 py-2 text-slate-600">JSON object — สำหรับ form-meaning (†จำเป็นสำหรับ form-meaning)</td>
                  <td className="px-3 py-2 text-xs font-mono">{'{"title":"...","text":"...","blanks":[...]}'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700">รูปแบบ JSON สำหรับแต่ละประเภท</h3>

            <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
              <p className="text-sm font-medium text-purple-700 mb-2">form-meaning — column &quot;article&quot;</p>
              <pre className="text-xs font-mono text-slate-700 bg-white rounded p-3 overflow-x-auto">{`{"title":"ชื่อบทความ","text":"The cat sat on the {{1}} and the {{2}}.","blanks":[{"id":1,"correctAnswer":"mat","hint":"เฟอร์นิเจอร์"},{"id":2,"correctAnswer":"dog"}]}`}</pre>
              <p className="text-xs text-purple-600 mt-2">{'ใช้ {{1}}, {{2}} ใน text เพื่อระบุตำแหน่งช่องว่าง — id ต้องตรงกับ blanks array'}</p>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-700 mb-2">focus-meaning — column &quot;conversation&quot;</p>
              <pre className="text-xs font-mono text-slate-700 bg-white rounded p-3 overflow-x-auto">{`[{"speaker":"A","name":"Tom","text":"What time is it?"},{"speaker":"B","name":"Jane","text":"It's 3 o'clock."}]`}</pre>
              <p className="text-xs text-blue-600 mt-2">speaker: A/B/C/D, name: ชื่อผู้พูด (ไม่จำเป็น), text: ข้อความ</p>
            </div>

            <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-slate-700 mb-2">ตัวอย่าง CSV สำเร็จรูป — copy แล้ววางในกล่องด้านบน</p>
              <pre className="text-xs font-mono text-slate-700 bg-white rounded p-3 overflow-x-auto select-all">{`testTypeId,questionText,optionA,optionB,optionC,optionD,correctAnswer,explanation,cefrLevel,difficulty,testSetId,conversation,article form-meaning,Read the article and fill in the blanks.,,,,,,Fill in the blanks,B1,medium,,,"{""title"":""Daily Routine"",""text"":""She {{1}} her teeth every morning and then {{2}} breakfast."",""blanks"":[{""id"":1,""correctAnswer"":""brushes"",""hint"":""present simple""},{""id"":2,""correctAnswer"":""eats""}]}" focus-meaning,What time is it?,It is morning.,It is 3 o'clock.,,,B,Asking about time,A1,easy,,"[{""speaker"":""A"",""name"":""Tom"",""text"":""What time is it?""},{""speaker"":""B"",""name"":""Jane"",""text"":""It is 3 o'clock.""}]", focus-form,Choose the correct form: She ___ to school every day.,go,goes,going,gone,B,Present simple with third person singular,B1,medium,,,`}</pre>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center animate-fade-in">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">นำเข้าสำเร็จ</h2>
            <p className="text-slate-600 mb-6">
              นำเข้าข้อสอบเรียบร้อยแล้ว {result?.importedCount ?? result?.validRows ?? ''} ข้อ
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  clearAll();
                }}
                className="btn-primary"
              >
                นำเข้าไฟล์อื่นต่อ
              </button>
              <Link href="/admin/questions" className="btn-secondary">
                กลับหน้าข้อสอบ
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}