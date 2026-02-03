import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Lightbulb, RotateCcw } from 'lucide-react';
import { useStudentSession } from '@/hooks/useStudentSession';
import { knowledgeGraph } from '@/data/knowledgeGraph';

export default function ProblemSolver() {
  const {
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
  } = useStudentSession();

  const [selectedTopic, setSelectedTopic] = useState('math.base.arithmetic_op');

  const availableTopics = knowledgeGraph.filter(topic => 
    topic.prerequisites.every(prereq => student.mastery[prereq]?.status === 'mastered') ||
    topic.prerequisites.length === 0
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Math Academy</h1>
              <p className="text-gray-600">Metodo attivo di apprendimento</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">XP</div>
              <div className="text-2xl font-bold text-indigo-600">{student.xp}</div>
              <div className="text-sm text-gray-500">Streak: {student.streak} giorni</div>
            </div>
          </div>
        </div>

        {/* Topic Selection */}
        {!session.currentProblem && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Scegli un argomento</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableTopics.map(topic => (
                <button
                  key={topic.id}
                  onClick={() => {
                    setSelectedTopic(topic.id);
                    startProblem(topic.id);
                  }}
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
                >
                  <div className="font-semibold text-gray-800">{topic.title}</div>
                  <div className="text-sm text-gray-600 mt-1">{topic.description}</div>
                  <div className="text-xs text-indigo-600 mt-2">
                    Livello: {topic.layer} | Stato: {student.mastery[topic.id]?.status || 'Nuovo'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Problem Interface */}
        {session.currentProblem && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Risolvi il problema</h2>
              <div className="text-sm text-gray-500">
                Problema {session.problemsSolved + 1} | Tempo: {session.activeTime}s
              </div>
            </div>

            <AnimatePresence mode="wait">
              {!showFeedback ? (
                <motion.div
                  key="problem"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div 
                      className="text-lg text-gray-800"
                      dangerouslySetInnerHTML={{ __html: session.currentProblem.question }}
                    />
                  </div>

                  <div className="space-y-3">
                    <input
                      type="text"
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && checkAnswer()}
                      placeholder="Inserisci la risposta"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none text-lg"
                      autoFocus
                    />

                    <div className="flex gap-3">
                      <button
                        onClick={checkAnswer}
                        disabled={!userAnswer.trim()}
                        className="flex-1 bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
                      >
                        Verifica
                      </button>
                      
                      {session.currentProblem.hints && (
                        <button
                          onClick={() => setShowHint(true)}
                          className="px-4 py-3 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-all flex items-center gap-2"
                        >
                          <Lightbulb className="w-4 h-4" />
                          Suggerimento
                        </button>
                      )}
                    </div>

                    {showHint && session.currentProblem.hints && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
                      >
                        <div className="flex items-center gap-2 text-yellow-800 mb-2">
                          <Lightbulb className="w-4 h-4" />
                          <span className="font-semibold">Suggerimento</span>
                        </div>
                        <ul className="list-disc list-inside text-yellow-700">
                          {session.currentProblem.hints.map((hint, i) => (
                            <li key={i}>{hint}</li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="feedback"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  <div className={`p-4 rounded-lg ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-center gap-3 mb-3">
                      {isCorrect ? (
                        <Check className="w-6 h-6 text-green-600" />
                      ) : (
                        <X className="w-6 h-6 text-red-600" />
                      )}
                      <span className={`font-semibold ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                        {isCorrect ? 'Corretto!' : 'Sbagliato'}
                      </span>
                    </div>
                    
                    {!isCorrect && (
                      <div className="mb-3">
                        <div className="text-sm text-gray-600 mb-1">La risposta corretta è:</div>
                        <div className="font-mono text-lg bg-white p-2 rounded border">
                          {session.currentProblem.answer}
                        </div>
                      </div>
                    )}

                    <div className="text-sm text-gray-700">
                      {session.currentProblem.explanation}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={nextProblem}
                      className="flex-1 bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Prossimo Problema
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Progress Stats */}
        {session.problemsSolved > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-500">Progresso Sessione</div>
                <div className="text-lg font-semibold">
                  {session.correctAnswers}/{session.problemsSolved} corretti
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Precisione</div>
                <div className="text-lg font-semibold text-indigo-600">
                  {Math.round((session.correctAnswers / session.problemsSolved) * 100)}%
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}