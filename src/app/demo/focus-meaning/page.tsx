'use client';

import { useState } from 'react';
import { ArrowLeft, Clock, ChevronRight, CheckCircle, XCircle, MessageCircle } from 'lucide-react';
import Link from 'next/link';

interface ConversationLine {
  speaker: string;
  text: string;
}

interface Question {
  id: number;
  conversation: ConversationLine[];
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

const demoQuestions: Question[] = [
  {
    id: 1,
    conversation: [
      { speaker: 'A', text: 'Hey, how was your interview yesterday?' },
      { speaker: 'B', text: 'It went quite well, actually. The manager was really impressed with my portfolio.' },
      { speaker: 'A', text: 'That\'s great! When will you hear back from them?' },
      { speaker: 'B', text: 'They said they\'d get back to me by the end of the week.' },
    ],
    question: 'What does "get back to me" mean in this conversation?',
    options: ['Return to the office', 'Contact me with a response', 'Go back home', 'Send an email'],
    correctAnswer: 1,
    explanation: '"Get back to someone" means to contact them with a response or answer.',
  },
  {
    id: 2,
    conversation: [
      { speaker: 'A', text: 'I heard you\'re moving to a new apartment.' },
      { speaker: 'B', text: 'Yes, I finally found a place that doesn\'t cost an arm and a leg.' },
      { speaker: 'A', text: 'That\'s lucky! Housing prices have been crazy lately.' },
      { speaker: 'B', text: 'Tell me about it. I\'ve been looking for months.' },
    ],
    question: 'What does "cost an arm and a leg" mean?',
    options: ['Require physical effort', 'Be very expensive', 'Need special permission', 'Take a long time'],
    correctAnswer: 1,
    explanation: '"Cost an arm and a leg" is an idiom meaning something is very expensive.',
  },
  {
    id: 3,
    conversation: [
      { speaker: 'A', text: 'Did you finish the project on time?' },
      { speaker: 'B', text: 'I had to burn the midnight oil, but yes, I submitted it yesterday.' },
      { speaker: 'A', text: 'You should take a break then. You\'ve been working too hard.' },
      { speaker: 'B', text: 'I know. I\'m planning to take a few days off next week.' },
    ],
    question: 'What does "burn the midnight oil" mean?',
    options: ['Use too much electricity', 'Work late into the night', 'Start a fire', 'Waste resources'],
    correctAnswer: 1,
    explanation: '"Burn the midnight oil" means to work or study late into the night.',
  },
  {
    id: 4,
    conversation: [
      { speaker: 'A', text: 'How was the party last night?' },
      { speaker: 'B', text: 'It was a bit awkward. John really put his foot in his mouth.' },
      { speaker: 'A', text: 'What happened?' },
      { speaker: 'B', text: 'He accidentally mentioned Sarah\'s ex-husband in front of everyone.' },
    ],
    question: 'What does "put his foot in his mouth" mean?',
    options: ['Tripped and fell', 'Said something embarrassing', 'Got injured', 'Left early'],
    correctAnswer: 1,
    explanation: '"Put one\'s foot in one\'s mouth" means to say something embarrassing or tactless.',
  },
  {
    id: 5,
    conversation: [
      { speaker: 'A', text: 'Are you coming to the meeting tomorrow?' },
      { speaker: 'B', text: 'I\'m on the fence about it. There\'s another event I might attend instead.' },
      { speaker: 'A', text: 'Well, let me know by tonight so I can finalize the headcount.' },
      { speaker: 'B', text: 'Sure, I\'ll decide after checking my schedule.' },
    ],
    question: 'What does "on the fence" mean?',
    options: ['Sitting on a fence', 'Undecided', 'Already decided', 'Feeling tired'],
    correctAnswer: 1,
    explanation: '"On the fence" means being undecided or neutral about something.',
  },
];

export default function DemoFocusMeaningPage() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const handleAnswer = (answerIndex: number) => {
    if (selectedAnswer !== null) return;
    
    setSelectedAnswer(answerIndex);
    setShowExplanation(true);
    
    if (answerIndex === demoQuestions[currentQuestion].correctAnswer) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestion < demoQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
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
  };

  if (isFinished) {
    const percentage = Math.round((score / demoQuestions.length) * 100);
    const passed = percentage >= 70;

    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/demo" className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors mb-6">
          <ArrowLeft className="w-5 h-5" />
          Back to Demo Tests
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
            {passed ? 'Great Job!' : 'Keep Practicing!'}
          </h1>
          <p className="text-slate-600 mb-6">
            {passed ? 'You passed the demo test!' : 'You need 70% to pass. Try again!'}
          </p>

          <div className="bg-slate-50 rounded-xl p-6 mb-6">
            <p className="text-5xl font-bold text-slate-900 mb-2">{percentage}%</p>
            <p className="text-slate-500">{score} out of {demoQuestions.length} correct</p>
          </div>

          <div className="bg-primary-50 rounded-xl p-4 mb-6">
            <p className="text-primary-700 font-medium">Want more questions and progress tracking?</p>
            <Link href="/tests" className="text-primary-600 hover:text-primary-700 underline font-medium">
              Login for Full Tests →
            </Link>
          </div>

          <div className="flex gap-4 justify-center">
            <button onClick={handleRestart} className="btn-primary">
              Try Again
            </button>
            <Link href="/demo" className="btn-secondary">
              Other Demo Tests
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const question = demoQuestions[currentQuestion];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href="/demo" className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors mb-4">
          <ArrowLeft className="w-5 h-5" />
          Back to Demo Tests
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Focus on Meaning (Demo)</h1>
          <div className="flex items-center gap-2 text-slate-500">
            <Clock className="w-5 h-5" />
            <span>5 min</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-slate-600 mb-2">
          <span>Question {currentQuestion + 1} of {demoQuestions.length}</span>
          <span>{Math.round(((currentQuestion + 1) / demoQuestions.length) * 100)}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / demoQuestions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 md:p-8 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="w-5 h-5 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-600">Conversation</span>
        </div>
        
        {/* Conversation Display */}
        <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-3">
          {question.conversation.map((line, index) => (
            <div key={index} className="flex gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                line.speaker === 'A' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'bg-accent-100 text-accent-700'
              }`}>
                {line.speaker}
              </div>
              <p className="flex-1 text-slate-700 leading-relaxed pt-1">{line.text}</p>
            </div>
          ))}
        </div>

        <p className="text-lg font-medium text-slate-800 mb-6">{question.question}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {question.options.map((option, index) => {
            let buttonClass = 'p-4 rounded-xl border-2 text-left transition-all duration-200 ';
            
            if (selectedAnswer === null) {
              buttonClass += 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50';
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
          {currentQuestion < demoQuestions.length - 1 ? 'Next Question' : 'Finish Test'}
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
