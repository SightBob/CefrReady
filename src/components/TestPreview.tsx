'use client';

import { useState } from 'react';
import {
  PenTool,
  BookOpen,
  Layers,
  Headphones,
  ChevronRight,
  CheckCircle,
  XCircle
} from 'lucide-react';

export type TestType = 'focus-form' | 'focus-meaning' | 'form-meaning' | 'listening';

interface DemoQuestion {
  id: number;
  questionText: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

const demoQuestions: Record<TestType, DemoQuestion[]> = {
  'focus-form': [
    {
      id: 1,
      questionText: 'She ___ to the store yesterday.',
      options: ['go', 'goes', 'went', 'going'],
      correctAnswer: 2,
      explanation: '"Yesterday" indicates past tense, so "went" is correct.',
    },
    {
      id: 2,
      questionText: 'They have ___ working all day.',
      options: ['is', 'are', 'been', 'being'],
      correctAnswer: 2,
      explanation: 'Present perfect continuous uses "have been" + -ing form.',
    },
  ],
  'focus-meaning': [
    {
      id: 1,
      questionText: 'The word "abundant" is closest in meaning to ___.',
      options: ['scarce', 'plentiful', 'limited', 'rare'],
      correctAnswer: 1,
      explanation: '"Abundant" means existing in large quantities, synonymous with "plentiful".',
    },
    {
      id: 2,
      questionText: 'To "procrastinate" means to ___.',
      options: ['work quickly', 'delay doing something', 'finish early', 'plan ahead'],
      correctAnswer: 1,
      explanation: '"Procrastinate" means to delay or postpone action.',
    },
  ],
  'form-meaning': [
    {
      id: 1,
      questionText: 'If I ___ rich, I would travel the world.',
      options: ['am', 'was', 'were', 'be'],
      correctAnswer: 2,
      explanation: 'Second conditional uses "were" for all subjects in the if-clause.',
    },
    {
      id: 2,
      questionText: 'The opposite of "optimistic" is ___.',
      options: ['hopeful', 'positive', 'pessimistic', 'cheerful'],
      correctAnswer: 2,
      explanation: '"Pessimistic" is the antonym of "optimistic".',
    },
  ],
  'listening': [
    {
      id: 1,
      questionText: '[Audio] What time does the meeting start?',
      options: ['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM'],
      correctAnswer: 1,
      explanation: 'The speaker mentions "Let\'s meet at 10 AM tomorrow."',
    },
    {
      id: 2,
      questionText: '[Audio] Where will the event be held?',
      options: ['Conference Room A', 'Main Hall', 'Online', 'Outdoor Garden'],
      correctAnswer: 2,
      explanation: 'The announcement states "The event will be held via Zoom."',
    },
  ],
};

const iconMap = {
  'focus-form': PenTool,
  'focus-meaning': BookOpen,
  'form-meaning': Layers,
  'listening': Headphones,
};

const colorMap = {
  'focus-form': 'from-blue-500 to-cyan-500',
  'focus-meaning': 'from-emerald-500 to-teal-500',
  'form-meaning': 'from-purple-500 to-pink-500',
  'listening': 'from-orange-500 to-amber-500',
};

const bgColorMap = {
  'focus-form': 'bg-blue-50',
  'focus-meaning': 'bg-emerald-50',
  'form-meaning': 'bg-purple-50',
  'listening': 'bg-orange-50',
};

interface TestPreviewProps {
  type: TestType;
  title: string;
  description: string;
}

export default function TestPreview({ type, title, description }: TestPreviewProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const questions = demoQuestions[type];
  const question = questions[currentQuestion];
  const Icon = iconMap[type];
  const gradient = colorMap[type];
  const bgColor = bgColorMap[type];

  const handleAnswer = (index: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(index);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className={`${bgColor} px-6 py-4 border-b border-slate-100`}>
        <div className="flex items-center gap-3">
          <div className={`${bgColor} p-3 rounded-xl`}>
            <Icon className={`w-6 h-6 bg-gradient-to-br ${gradient} bg-clip-text text-transparent`} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">{title}</h3>
            <p className="text-xs text-slate-500">Demo Preview • {questions.length} sample questions</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <p className="text-sm text-slate-600 mb-4">{description}</p>

        {/* Question */}
        <div className="mb-4">
          <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded">
            Question {currentQuestion + 1}
          </span>
          <p className="text-lg text-slate-800 mt-3 mb-4">{question.questionText}</p>

          {/* Options */}
          <div className="grid grid-cols-1 gap-2">
            {question.options.map((option, index) => {
              let buttonClass = 'p-3 rounded-xl border-2 text-left transition-all duration-200 text-sm ';

              if (selectedAnswer === null) {
                buttonClass += 'border-slate-200 hover:border-primary-300 hover:bg-primary-50';
              } else if (index === question.correctAnswer) {
                buttonClass += 'border-emerald-500 bg-emerald-50';
              } else if (selectedAnswer === index) {
                buttonClass += 'border-red-500 bg-red-50';
              } else {
                buttonClass += 'border-slate-200 opacity-50';
              }

              return (
                <button
                  key={index}
                  onClick={() => handleAnswer(index)}
                  disabled={selectedAnswer !== null}
                  className={buttonClass}
                >
                  <span className="font-medium text-slate-700">
                    <span className="inline-block w-5 mr-2 text-slate-400">{String.fromCharCode(65 + index)}.</span>
                    {option}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Explanation */}
        {selectedAnswer !== null && (
          <div className={`p-4 rounded-xl mb-4 ${
            selectedAnswer === question.correctAnswer
              ? 'bg-emerald-50 border border-emerald-200'
              : 'bg-amber-50 border border-amber-200'
          }`}>
            <div className="flex items-start gap-2">
              {selectedAnswer === question.correctAnswer ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-medium text-slate-800 text-sm mb-1">
                  {selectedAnswer === question.correctAnswer ? 'Correct!' : 'Not quite right'}
                </p>
                <p className="text-slate-600 text-sm">{question.explanation}</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setCurrentQuestion(i);
                  setSelectedAnswer(null);
                }}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentQuestion ? 'bg-primary-500' : 'bg-slate-200 hover:bg-slate-300'
                }`}
              />
            ))}
          </div>

          {selectedAnswer !== null && (
            currentQuestion < questions.length - 1 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium text-sm"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleRestart}
                className="text-primary-600 hover:text-primary-700 font-medium text-sm"
              >
                Try Again
              </button>
            )
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
        <p className="text-xs text-slate-500 text-center">
          🔒 This is a demo preview. <span className="font-medium">Login</span> to access full tests with 20-30 questions and save your progress.
        </p>
      </div>
    </div>
  );
}
