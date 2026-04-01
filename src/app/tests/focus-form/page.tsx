'use client';

import { useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import TestLayout from '@/components/TestLayout';

interface Question {
  id: number;
  sentence: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

const sampleQuestions: Question[] = [
  {
    id: 1,
    sentence: 'She ___ to the store yesterday.',
    options: ['go', 'goes', 'went', 'going'],
    correctAnswer: 2,
    explanation: '"Yesterday" indicates past tense, so "went" is correct.',
  },
  {
    id: 2,
    sentence: 'They have ___ working all day.',
    options: ['is', 'are', 'been', 'being'],
    correctAnswer: 2,
    explanation: 'Present perfect continuous uses "have been" + -ing form.',
  },
  {
    id: 3,
    sentence: 'If I ___ rich, I would travel the world.',
    options: ['am', 'was', 'were', 'be'],
    correctAnswer: 2,
    explanation: 'Second conditional uses "were" for all subjects in the if-clause.',
  },
  {
    id: 4,
    sentence: 'The book ___ by millions of people.',
    options: ['has read', 'has been read', 'have been read', 'is reading'],
    correctAnswer: 1,
    explanation: 'Passive voice in present perfect: has/have been + past participle.',
  },
  {
    id: 5,
    sentence: 'She made him ___ the truth.',
    options: ['tell', 'to tell', 'telling', 'told'],
    correctAnswer: 0,
    explanation: 'Make + object + base form of verb (without "to").',
  },
  {
    id: 6,
    sentence: 'The children ___ playing in the garden when it started to rain.',
    options: ['is', 'are', 'was', 'were'],
    correctAnswer: 3,
    explanation: 'Past continuous with plural subject requires "were".',
  },
  {
    id: 7,
    sentence: 'I wish I ___ speak French fluently.',
    options: ['can', 'could', 'would', 'will'],
    correctAnswer: 1,
    explanation: '"Wish" for present situations takes "could" for abilities.',
  },
  {
    id: 8,
    sentence: 'Neither the teacher nor the students ___ present.',
    options: ['is', 'are', 'was', 'were'],
    correctAnswer: 1,
    explanation: 'With "neither...nor", the verb agrees with the nearest subject.',
  },
  {
    id: 9,
    sentence: 'It\'s time we ___ home.',
    options: ['go', 'went', 'going', 'gone'],
    correctAnswer: 1,
    explanation: '"It\'s time" is followed by past tense for present meaning.',
  },
  {
    id: 10,
    sentence: 'Had I known about the meeting, I ___ have attended.',
    options: ['will', 'would', 'shall', 'can'],
    correctAnswer: 1,
    explanation: 'Third conditional: "would have" for hypothetical past situations.',
  },
];

export default function FocusFormPage() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(sampleQuestions.length).fill(null));
  const [flaggedQuestions, setFlaggedQuestions] = useState<number[]>([]);

  const handleAnswer = (answerIndex: number) => {
    if (selectedAnswer !== null) return;
    
    setSelectedAnswer(answerIndex);
    setShowExplanation(true);
    
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = answerIndex;
    setAnswers(newAnswers);
    
    if (answerIndex === sampleQuestions[currentQuestion].correctAnswer) {
      setScore(score + 1);
    }
  };

  const handleQuestionSelect = (index: number) => {
    setCurrentQuestion(index);
    setSelectedAnswer(answers[index]);
    setShowExplanation(answers[index] !== null);
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setSelectedAnswer(answers[currentQuestion - 1]);
      setShowExplanation(answers[currentQuestion - 1] !== null);
    }
  };

  const handleNext = () => {
    if (currentQuestion < sampleQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(answers[currentQuestion + 1]);
      setShowExplanation(answers[currentQuestion + 1] !== null);
    }
  };

  const handleFlag = () => {
    if (flaggedQuestions.includes(currentQuestion)) {
      setFlaggedQuestions(flaggedQuestions.filter(q => q !== currentQuestion));
    } else {
      setFlaggedQuestions([...flaggedQuestions, currentQuestion]);
    }
  };

  const handleSubmit = () => {
    const unanswered = answers.filter(a => a === null).length;
    if (unanswered > 0) {
      const confirm = window.confirm(`You have ${unanswered} unanswered questions. Are you sure you want to submit?`);
      if (!confirm) return;
    }
    setIsFinished(true);
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setScore(0);
    setIsFinished(false);
    setAnswers(Array(sampleQuestions.length).fill(null));
    setFlaggedQuestions([]);
  };

  if (isFinished) {
    const percentage = Math.round((score / sampleQuestions.length) * 100);
    const passed = percentage >= 70;

    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/tests" className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors mb-6">
          ← Back to Tests
        </Link>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 text-center">
          <div className={`inline-flex p-4 rounded-full ${passed ? 'bg-emerald-50' : 'bg-red-50'} mb-6`}>
            {passed ? (
              <CheckCircle className="w-12 h-12 text-emerald-600" />
            ) : (
              <XCircle className="w-12 h-12 text-red-600" />
            )}
          </div>
          
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {passed ? 'Congratulations!' : 'Keep Practicing!'}
          </h1>
          <p className="text-slate-600 mb-6">
            {passed ? 'You passed the test!' : 'You need 70% to pass. Try again!'}
          </p>

          <div className="bg-slate-50 rounded-xl p-6 mb-6">
            <p className="text-5xl font-bold text-slate-900 mb-2">{percentage}%</p>
            <p className="text-slate-500">{score} out of {sampleQuestions.length} correct</p>
          </div>

          <div className="flex gap-4 justify-center">
            <button onClick={handleRestart} className="btn-primary">
              Try Again
            </button>
            <Link href="/tests" className="btn-secondary">
              Other Tests
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const question = sampleQuestions[currentQuestion];

  return (
    <TestLayout
      title="Focus on Form"
      duration="15 min"
      totalQuestions={sampleQuestions.length}
      currentQuestion={currentQuestion}
      answers={answers}
      flaggedQuestions={flaggedQuestions}
      onQuestionSelect={handleQuestionSelect}
      onPrevious={handlePrevious}
      onNext={handleNext}
      onSubmit={handleSubmit}
      onFlag={handleFlag}
    >
      {/* Question Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 md:p-8">
        <p className="text-lg md:text-xl text-slate-800 mb-6 leading-relaxed">
          {question.sentence}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {question.options.map((option, index) => {
            let buttonClass = 'p-4 rounded-xl border-2 text-left transition-all duration-200 ';
            
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
                <span className="font-medium text-slate-800">{option}</span>
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {showExplanation && (
          <div className={`mt-6 p-4 rounded-xl ${selectedAnswer === question.correctAnswer ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
            <p className="font-medium text-slate-800 mb-1">
              {selectedAnswer === question.correctAnswer ? '✓ Correct!' : '✗ Incorrect'}
            </p>
            <p className="text-slate-600">{question.explanation}</p>
          </div>
        )}
      </div>
    </TestLayout>
  );
}
