'use client';

import { useState } from 'react';
import { ArrowLeft, Clock, ChevronRight, CheckCircle, XCircle, Play, Pause, Volume2 } from 'lucide-react';
import Link from 'next/link';

interface Question {
  id: number;
  audioScript: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

const sampleQuestions: Question[] = [
  {
    id: 1,
    audioScript: "Good morning, everyone. Today's meeting has been rescheduled to 3 PM in Conference Room B. Please bring your quarterly reports. Thank you.",
    question: 'When is the meeting?',
    options: ['This morning', 'At 3 PM', 'In Conference Room A', 'Tomorrow'],
    correctAnswer: 1,
    explanation: 'The speaker says "Today\'s meeting has been rescheduled to 3 PM".',
  },
  {
    id: 2,
    audioScript: "I'm calling to inform you that your package has been delivered to the front desk. Please pick it up at your earliest convenience. The reference number is 5-7-9-2.",
    question: 'Where is the package?',
    options: ['At the post office', 'In the mailbox', 'At the front desk', 'With the delivery person'],
    correctAnswer: 2,
    explanation: 'The speaker says "your package has been delivered to the front desk".',
  },
  {
    id: 3,
    audioScript: "The museum is open from 9 AM to 6 PM on weekdays, and from 10 AM to 5 PM on weekends. Adult tickets are $15, and children under 12 enter free.",
    question: 'How much does an adult ticket cost?',
    options: ['$5', '$10', '$15', 'Free'],
    correctAnswer: 2,
    explanation: 'The speaker says "Adult tickets are $15".',
  },
  {
    id: 4,
    audioScript: "Due to heavy rain, all outdoor activities have been cancelled. The indoor swimming pool and gym remain open. We apologize for any inconvenience.",
    question: 'Why were outdoor activities cancelled?',
    options: ['The pool is closed', 'Due to heavy rain', 'The gym is full', 'Staff shortage'],
    correctAnswer: 1,
    explanation: 'The speaker says "Due to heavy rain, all outdoor activities have been cancelled".',
  },
  {
    id: 5,
    audioScript: "To reach the airport, take Highway 101 North for about 20 miles. Exit at Airport Boulevard and follow the signs to Terminal 2. Allow extra time during rush hour.",
    question: 'Which highway should you take?',
    options: ['Highway 101 South', 'Airport Boulevard', 'Highway 101 North', 'Terminal 2'],
    correctAnswer: 2,
    explanation: 'The speaker says "take Highway 101 North for about 20 miles".',
  },
];

export default function ListeningPage() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);

  const handlePlayAudio = () => {
    setIsPlaying(true);
    // Simulate audio playback - in real app, this would use Web Audio API
    setTimeout(() => {
      setIsPlaying(false);
      setHasPlayed(true);
    }, 3000);
  };

  const handleAnswer = (answerIndex: number) => {
    if (selectedAnswer !== null) return;
    
    setSelectedAnswer(answerIndex);
    setShowExplanation(true);
    
    if (answerIndex === sampleQuestions[currentQuestion].correctAnswer) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestion < sampleQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setHasPlayed(false);
    } else {
      setIsFinished(true);
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setScore(0);
    setIsFinished(false);
    setHasPlayed(false);
  };

  if (isFinished) {
    const percentage = Math.round((score / sampleQuestions.length) * 100);
    const passed = percentage >= 70;

    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/tests" className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors mb-6">
          <ArrowLeft className="w-5 h-5" />
          Back to Tests
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
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href="/tests" className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors mb-4">
          <ArrowLeft className="w-5 h-5" />
          Back to Tests
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Listening Comprehension</h1>
          <div className="flex items-center gap-2 text-slate-500">
            <Clock className="w-5 h-5" />
            <span>30 min</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-slate-600 mb-2">
          <span>Question {currentQuestion + 1} of {sampleQuestions.length}</span>
          <span>{Math.round(((currentQuestion + 1) / sampleQuestions.length) * 100)}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / sampleQuestions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Audio Player */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 md:p-8 mb-6">
        <div className="flex items-center justify-center mb-6">
          <button
            onClick={handlePlayAudio}
            disabled={isPlaying}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 ${
              isPlaying 
                ? 'bg-orange-100 cursor-not-allowed' 
                : 'bg-gradient-to-br from-orange-500 to-amber-500 hover:scale-105 shadow-lg'
            }`}
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 text-orange-600" />
            ) : (
              <Play className="w-8 h-8 text-white ml-1" />
            )}
          </button>
        </div>

        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 text-slate-500">
            <Volume2 className="w-5 h-5" />
            <span>{isPlaying ? 'Playing audio...' : hasPlayed ? 'Click to play again' : 'Click to play audio'}</span>
          </div>
        </div>

        {/* Show transcript after answering */}
        {showExplanation && (
          <div className="bg-slate-50 rounded-xl p-4 mb-6">
            <p className="text-sm font-medium text-slate-600 mb-2">Audio Transcript:</p>
            <p className="text-slate-800 italic">"{question.audioScript}"</p>
          </div>
        )}

        <div className="border-t border-slate-100 pt-6">
          <p className="text-lg font-medium text-slate-800 mb-4">{question.question}</p>

          <div className="grid grid-cols-1 gap-3">
            {question.options.map((option, index) => {
              let buttonClass = 'p-4 rounded-xl border-2 text-left transition-all duration-200 ';
              
              if (selectedAnswer === null) {
                buttonClass += 'border-slate-200 hover:border-orange-300 hover:bg-orange-50';
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
        </div>

        {showExplanation && (
          <div className={`mt-6 p-4 rounded-xl ${selectedAnswer === question.correctAnswer ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
            <p className="font-medium text-slate-800 mb-1">
              {selectedAnswer === question.correctAnswer ? '✓ Correct!' : '✗ Incorrect'}
            </p>
            <p className="text-slate-600">{question.explanation}</p>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleNext}
          disabled={selectedAnswer === null}
          className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {currentQuestion < sampleQuestions.length - 1 ? 'Next Question' : 'Finish Test'}
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
