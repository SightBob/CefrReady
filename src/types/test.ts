// ============================================================
// CefrReady Test System — Centralized Type Definitions
// ============================================================

// --- Identifiers & Enums ---

export type TestTypeId = 'focus-form' | 'focus-meaning' | 'form-meaning' | 'listening';

export const TEST_TYPE_IDS: TestTypeId[] = [
  'focus-form',
  'focus-meaning',
  'form-meaning',
  'listening',
];

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type Difficulty = 'easy' | 'medium' | 'hard';

// --- Structured Data Types ---

export interface ConversationLine {
  speaker: string;
  text: string;
}

export interface Blank {
  id: number;
  correctAnswer: string;
  hint?: string;
}

export interface Article {
  title: string;
  text: string;
  blanks: Blank[];
}

export interface Option {
  key: string;
  value: string;
}

// --- Question Types (discriminated union by testTypeId) ---

export interface BaseQuestion {
  id: number;
  testTypeId: TestTypeId;
  questionText: string;
  cefrLevel: CefrLevel;
  difficulty: Difficulty | null;
  explanation: string | null;
  orderIndex: number;
}

/** Grammar-based MCQ (4 options A–D) */
export interface FocusFormQuestion extends BaseQuestion {
  testTypeId: 'focus-form';
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
}

/** Conversation-based MCQ (3–4 options) */
export interface FocusMeaningQuestion extends BaseQuestion {
  testTypeId: 'focus-meaning';
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string | null;
  correctAnswer: string;
  conversation: ConversationLine[];
}

/** Passage with fill-in-the-blank */
export interface FormMeaningQuestion extends BaseQuestion {
  testTypeId: 'form-meaning';
  article: Article;
  correctAnswer: string | null;
}

/** Audio-based MCQ (4 options, transcript) */
export interface ListeningQuestion extends BaseQuestion {
  testTypeId: 'listening';
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  audioUrl: string | null;
  transcript: string | null;
}

export type Question =
  | FocusFormQuestion
  | FocusMeaningQuestion
  | FormMeaningQuestion
  | ListeningQuestion;

/** Question as returned by the public API (no answers leaked) */
export type PublicQuestion = Omit<Question, 'correctAnswer' | 'explanation'>;

/** Question as returned in demo mode (includes answers) */
export type DemoQuestion = Question;

// --- Answer & Result Types ---

export interface SubmittedAnswer {
  questionId: number;
  selectedAnswer: string;
}

export interface QuestionResult {
  questionId: number;
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string | null;
  explanation: string | null;
}

// --- Submission ---

export interface TestSubmission {
  testTypeId: TestTypeId;
  answers: SubmittedAnswer[];
  isDemo?: boolean;
}

export interface TestSubmissionResult {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  results: QuestionResult[];
  attemptId?: number;
}

// --- Database Entities ---

export interface TestType {
  id: TestTypeId;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  duration: number | null;
  questionCount: number | null;
  active: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestAttempt {
  id: number;
  userId: string;
  testTypeId: TestTypeId;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  startedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserAnswer {
  id: number;
  attemptId: number;
  questionId: number;
  selectedAnswer: string;
  isCorrect: boolean;
  createdAt: Date;
}

export interface UserProgress {
  id: number;
  userId: string;
  testTypeId: TestTypeId;
  averageScore: number;
  testsTaken: number;
  lastAttemptAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// --- Progress API Response ---

export interface ProgressResponse {
  success: boolean;
  data: {
    overall: {
      testsTaken: number;
      averageScore: number;
    };
    byCategory: Array<{
      testTypeId: TestTypeId;
      averageScore: number;
      testsTaken: number;
    }>;
    recentAttempts: Array<{
      id: number;
      testTypeId: TestTypeId;
      testTypeName: string;
      score: number;
      totalQuestions: number;
      correctAnswers: number;
      completedAt: Date | null;
    }>;
  };
}

// --- Test Card Display ---

export interface TestCardData {
  type: TestTypeId;
  title: string;
  description: string;
  duration: string;
  questions: number;
  href: string;
}
