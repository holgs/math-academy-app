export interface KnowledgePoint {
  id: string;
  title: string;
  description: string;
  layer: number;
  prerequisites: string[];
  interference_links?: Array<{
    topicId: string;
    reason: string;
  }>;
  encompassed_skills?: Array<{
    topicId: string;
    weight: number;
  }>;
}

export interface StudentProfile {
  id: string;
  name: string;
  xp: number;
  streak: number;
  mastery: Record<string, {
    status: 'not_started' | 'learning' | 'practicing' | 'mastered';
    lastPracticed: Date;
    correctStreak: number;
  }>;
}

export interface Problem {
  id: string;
  question: string;
  answer: string;
  type: 'free_input';
  hints?: string[];
  explanation: string;
}

export interface Session {
  currentProblem: Problem | null;
  problemsSolved: number;
  correctAnswers: number;
  startTime: Date;
  activeTime: number;
}