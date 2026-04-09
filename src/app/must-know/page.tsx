'use client';

import { useState } from 'react';
import { BookOpen, Type, MessageSquare, CheckCircle } from 'lucide-react';
import { grammarContent, grammarCategories } from '@/content/must-know/grammar';
import { vocabularyContent, vocabularyTopics } from '@/content/must-know/vocabulary';

type Tab = 'overview' | 'grammar' | 'vocabulary';
type CefrFilter = 'all' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export default function MustKnowPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedLevel, setSelectedLevel] = useState<CefrFilter>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredGrammar = grammarContent.filter((item) => {
    const matchesLevel = selectedLevel === 'all' || item.cefrLevel === selectedLevel;
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      searchTerm === '' ||
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesLevel && matchesCategory && matchesSearch;
  });

  const filteredVocab = vocabularyContent.filter((item) => {
    const matchesLevel = selectedLevel === 'all' || item.cefrLevel === selectedLevel;
    const matchesSearch =
      searchTerm === '' ||
      item.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.thaiMeaning.includes(searchTerm);
    return matchesLevel && matchesSearch;
  });

  const cefrLevels: CefrFilter[] = ['all', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-8 h-8 text-[#4F46E5]" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">MUST KNOW</h1>
              <p className="text-sm text-gray-500">ข้อมูลสำคัญที่ต้องรู้ก่อนสอบ</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-[#4F46E5] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              ภาพรวม
            </button>
            <button
              onClick={() => setActiveTab('grammar')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'grammar'
                  ? 'bg-[#4F46E5] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Type className="w-4 h-4 inline mr-1" />
              ไวยากรณ์ ({grammarContent.length})
            </button>
            <button
              onClick={() => setActiveTab('vocabulary')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'vocabulary'
                  ? 'bg-[#4F46E5] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <MessageSquare className="w-4 h-4 inline mr-1" />
              คำศัพท์ ({vocabularyContent.length})
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {activeTab === 'overview' && (
          <>
            {/* Language Levels */}
            <section className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                📌 ระดับภาษา CEFR
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-[#DBEAFE] p-4 rounded-xl text-center">
                  <span className="text-lg font-bold text-[#1E40AF]">A1 – A2</span>
                  <p className="text-sm text-[#1E40AF]">Beginner (พื้นฐาน)</p>
                </div>
                <div className="bg-[#E0E7FF] p-4 rounded-xl text-center">
                  <span className="text-lg font-bold text-[#3730A3]">B1 – B2</span>
                  <p className="text-sm text-[#3730A3]">Intermediate (กลาง)</p>
                </div>
                <div className="bg-[#FEF3C7] p-4 rounded-xl text-center">
                  <span className="text-lg font-bold text-[#92400E]">C1 – C2</span>
                  <p className="text-sm text-[#92400E]">Advanced (สูง)</p>
                </div>
              </div>
            </section>

            {/* Important Condition */}
            <section className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-4">⚠️ เงื่อนไขสำคัญ</h2>
              <div className="bg-[#FEF2F2] border-l-4 border-[#EF4444] p-4 rounded-lg">
                <p className="text-[#991B1B] font-semibold">
                  👉 นักศึกษาทุกคนต้องมีระดับภาษาอย่างน้อย A2 เพื่อให้ผ่านเงื่อนไขการจบการศึกษา
                </p>
              </div>
              <div className="flex gap-4 mt-4">
                <div className="flex-1 bg-[#FEE2E2] p-4 rounded-xl text-center">
                  <span className="text-2xl">❌</span>
                  <p className="text-[#991B1B] font-medium">ต่ำกว่า A2</p>
                  <p className="text-xs text-[#991B1B]">ไม่ผ่านเงื่อนไข</p>
                </div>
                <div className="flex-1 bg-[#D1FAE5] p-4 rounded-xl text-center">
                  <span className="text-2xl">✅</span>
                  <p className="text-[#065F46] font-medium">A2 ขึ้นไป</p>
                  <p className="text-xs text-[#065F46]">ผ่านเกณฑ์</p>
                </div>
              </div>
            </section>

            {/* Exam Structure */}
            <section className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-4">📝 โครงสร้างข้อสอบ (4 ส่วน)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-4 bg-[#F9FAFB] rounded-lg">
                  <span className="text-2xl">📖</span>
                  <div>
                    <h3 className="font-medium text-gray-800">Focus on Form</h3>
                    <p className="text-sm text-gray-500">Grammar (ไวยากรณ์)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-[#F9FAFB] rounded-lg">
                  <span className="text-2xl">🧐</span>
                  <div>
                    <h3 className="font-medium text-gray-800">Focus on Meaning</h3>
                    <p className="text-sm text-gray-500">ความเข้าใจเนื้อหา</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-[#F9FAFB] rounded-lg">
                  <span className="text-2xl">🔗</span>
                  <div>
                    <h3 className="font-medium text-gray-800">Focus on Form & Meaning</h3>
                    <p className="text-sm text-gray-500">ผสมทั้งสองอย่าง</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-[#F9FAFB] rounded-lg">
                  <span className="text-2xl">🎧</span>
                  <div>
                    <h3 className="font-medium text-gray-800">Listening</h3>
                    <p className="text-sm text-gray-500">ฟังแล้วตอบ</p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === 'grammar' && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-xl p-4 mb-6 shadow-sm border border-gray-100">
              <div className="flex flex-wrap gap-3">
                <input
                  type="text"
                  placeholder="ค้นหาไวยากรณ์..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 min-w-[200px] px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                />
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value as CefrFilter)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                >
                  {cefrLevels.map((level) => (
                    <option key={level} value={level}>
                      {level === 'all' ? 'ทุกระดับ' : level}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                >
                  <option value="all">ทุกหมวดหมู่</option>
                  {grammarCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Grammar List */}
            <div className="space-y-4">
              {filteredGrammar.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl">
                  <p className="text-gray-500">ไม่พบไวยากรณ์ที่ตรงตามเงื่อนไข</p>
                </div>
              ) : (
                filteredGrammar.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
                        <p className="text-sm text-gray-500">{item.category}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          item.cefrLevel === 'A1' || item.cefrLevel === 'A2'
                            ? 'bg-green-100 text-green-700'
                            : item.cefrLevel === 'B1' || item.cefrLevel === 'B2'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {item.cefrLevel}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-3">{item.description}</p>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                      {item.examples.map((ex, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-600">{ex}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {activeTab === 'vocabulary' && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-xl p-4 mb-6 shadow-sm border border-gray-100">
              <div className="flex flex-wrap gap-3">
                <input
                  type="text"
                  placeholder="ค้นหาคำศัพท์ (อังกฤษ/ไทย)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 min-w-[200px] px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                />
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value as CefrFilter)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                >
                  {cefrLevels.map((level) => (
                    <option key={level} value={level}>
                      {level === 'all' ? 'ทุกระดับ' : level}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Vocabulary List */}
            <div className="space-y-4">
              {filteredVocab.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl">
                  <p className="text-gray-500">ไม่พบคำศัพท์ที่ตรงตามเงื่อนไข</p>
                </div>
              ) : (
                filteredVocab.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{item.word}</h3>
                        {item.phonetic && (
                          <p className="text-sm text-gray-400 font-mono">{item.phonetic}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-gray-500">{item.partOfSpeech}</span>
                        <span
                          className={`ml-2 px-3 py-1 rounded-full text-xs font-medium ${
                            item.cefrLevel === 'A1' || item.cefrLevel === 'A2'
                              ? 'bg-green-100 text-green-700'
                              : item.cefrLevel === 'B1' || item.cefrLevel === 'B2'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}
                        >
                          {item.cefrLevel}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-700 mb-1">{item.definition}</p>
                    <p className="text-gray-500 text-sm mb-2">"{item.example}"</p>
                    <p className="text-[#4F46E5] font-medium">{item.thaiMeaning}</p>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </main>

      <footer className="text-center py-6 text-gray-500 text-sm border-t border-gray-200">
        © 2024 CEFR Ready. Must Know Content.
      </footer>
    </div>
  );
}