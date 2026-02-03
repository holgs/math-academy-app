import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LandingPage from '@/components/LandingPage';
import ProblemSolver from '@/components/ProblemSolver';

export default function App() {
  const [showApp, setShowApp] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <AnimatePresence mode="wait">
        {!showApp ? (
          <motion.div
            key="landing"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <LandingPage onStart={() => setShowApp(true)} />
          </motion.div>
        ) : (
          <motion.div
            key="app"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <ProblemSolver />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}