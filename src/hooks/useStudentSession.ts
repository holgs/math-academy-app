import { useState, useEffect } from 'react';
import { StudentProfile, Problem, Session } from '@/types';
import { initialStudent, calculateXP, updateMastery } from '@/utils/studentLogic';
import { generateProblem } from '@/utils/problemGenerator';

export const useStudentSession = () => {
  const [student, setStudent] = useState<StudentProfile>(initialStudent);
  const [session, setSession] = useState<Session>({
    currentProblem: null,
    problemsSolved: 0,
    correctAnswers: 0,
    startTime: new Date(),
    activeTime: 0
  });
  const [userAnswer, setUserAnswer] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Active Learning: nessun pulsante "Non lo so"
  const mustAttempt = !showFeedback && session.currentProblem;

  const startProblem = (topicId: string) => {
    const problem = generateProblem(topicId);
    setSession(prev => ({
      ...prev,
      currentProblem: problem,
      activeTime: 0
    }));
    setUserAnswer('');
    setShowFeedback(false);
    setShowHint(false);
  };

  const checkAnswer = () => {
    if (!session.currentProblem) return;

    const correct = userAnswer.trim() === session.currentProblem.answer;
    setIsCorrect(correct);
    setShowFeedback(true);

    // Aggiorna statistiche
    setSession(prev => ({
      ...prev,
      problemsSolved: prev.problemsSolved + 1,
      correctAnswers: correct ? prev.correctAnswers + 1 : prev.correctAnswers
    }));

    // Aggiorna padronanza
    const topicId = session.currentProblem.id.split('-')[0]; // Estrai topic base
    setStudent(prev => ({
      ...prev,
      xp: prev.xp + calculateXP(1, correct, session.activeTime),
      mastery: updateMastery(topicId, correct, prev.mastery)
    }));
  };

  const nextProblem = () => {
    if (!session.currentProblem) return;
    
    // Continua con lo stesso tipo di problema per pratica deliberata
    const topicId = session.currentProblem.id.split('-')[0];
    startProblem(topicId);
  };

  // Timer per tracciare il tempo attivo
  useEffect(() => {
    if (session.currentProblem && !showFeedback) {
      const timer = setInterval(() => {
        setSession(prev => ({
          ...prev,
          activeTime: prev.activeTime + 1
        }));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [session.currentProblem, showFeedback]);

  return {
    student,
    session,
    userAnswer,
    setUserAnswer,
    showFeedback,
    isCorrect,
    showHint,
    setShowHint,
    mustAttempt,
    startProblem,
    checkAnswer,
    nextProblem
  };
};