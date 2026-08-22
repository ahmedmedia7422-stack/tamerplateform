export interface Student {
  id?: string;
  code: string;
  name: string;
  phone: string;
  className: string;
  groupName: string;
  totalScore?: number;
  badges?: string[];
  password?: string;
  avatar?: string;
  createdAt: string;
}

export interface Quiz {
  id: string;
  quiz_name: string;
  class_name: string;
  duration_minutes?: number;
  is_active: boolean;
  createdAt: string;
}

export interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_answer: string; // "A" | "B" | "C" | "D"
}

export interface StudentAnswer {
  question_id: string;
  question_text: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_answer: string;
  selected_answer: string;
}

export interface QuizResult {
  id?: string;
  student_code: string;
  student_name: string;
  phone: string;
  class_name: string;
  group_name: string;
  quiz_id: string;
  quiz_name: string;
  score: number;
  total_questions: number;
  submittedAt: string;
  student_answers?: StudentAnswer[];
}

export interface Video {
  id: string;
  title: string;
  class_name: string;
  youtube_url: string;
  createdAt: string;
}

export interface ChatMessage {
  id?: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}
