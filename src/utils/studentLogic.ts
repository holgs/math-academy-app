import { StudentProfile } from '@/types';

export const initialStudent: StudentProfile = {
  id: 'student-001',
  name: 'Studente Demo',
  xp: 0,
  streak: 0,
  mastery: {}
};

export const calculateXP = (problemDifficulty: number, firstAttempt: boolean, timeSpent: number): number => {
  let baseXP = 10;
  if (firstAttempt) baseXP *= 1.5;
  if (timeSpent < 30) baseXP *= 1.2;
  return Math.round(baseXP * problemDifficulty);
};

export const canAccessTopic = (topicId: string, mastery: StudentProfile['mastery'], knowledgeGraph: any[]): boolean => {
  const topic = knowledgeGraph.find((t: any) => t.id === topicId);
  if (!topic) return false;
  
  return topic.prerequisites.every((prereqId: string) => 
    mastery[prereqId]?.status === 'mastered'
  );
};

export const updateMastery = (
  topicId: string, 
  correct: boolean, 
  mastery: StudentProfile['mastery']
): StudentProfile['mastery'] => {
  const current = mastery[topicId] || {
    status: 'not_started',
    lastPracticed: new Date(),
    correctStreak: 0
  };

  if (correct) {
    const newStreak = current.correctStreak + 1;
    const status = newStreak >= 3 ? 'mastered' : 
                  newStreak >= 1 ? 'practicing' : 'learning';
    
    return {
      ...mastery,
      [topicId]: {
        status,
        lastPracticed: new Date(),
        correctStreak: newStreak
      }
    };
  } else {
    return {
      ...mastery,
      [topicId]: {
        ...current,
        status: 'learning',
        lastPracticed: new Date(),
        correctStreak: 0
      }
    };
  }
};