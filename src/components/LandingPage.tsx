import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Target, Zap, TrendingUp, Play, Pause } from 'lucide-react';
import HeartbeatVisualizer from '@/components/HeartbeatVisualizer';

export default function LandingPage({ onStart }: { onStart: () => void }) {
  const [pulseBPM, setPulseBPM] = useState(72);
  const [isPulsing, setIsPulsing] = useState(true);

  // Simula variazioni del battito durante l'interazione
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseBPM(prev => {
        const variation = Math.random() * 10 - 5; // ±5 BPM
        return Math.max(60, Math.min(90, prev + variation));
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: Target,
      title: "Active Learning",
      description: "Impari facendo, non guardando. Ogni concetto è accompagnato da esercizi immediati."
    },
    {
      icon: Zap,
      title: "Feedback Istantaneo",
      description: "Scopri subito se hai ragione o torto, senza aspettare la correzione."
    },
    {
      icon: TrendingUp,
      title: "Progressione Personale",
      description: "Avanzi solo quando hai padroneggiato davvero, al tuo ritmo."
    },
    {
      icon: BookOpen,
      title: "Metodo Scientifico",
      description: "Basato su 12 pilastri della neuroscienza dell'apprendimento."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          {/* Background Animation */}
          <div className="absolute inset-0">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute bg-white rounded-full opacity-10"
                style={{
                  width: Math.random() * 100 + 50,
                  height: Math.random() * 100 + 50,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  x: [0, Math.random() * 200 - 100],
                  y: [0, Math.random() * 200 - 100],
                }}
                transition={{
                  duration: Math.random() * 20 + 10,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: "linear"
                }}
              />
            ))}
          </div>

          <div className="relative text-center">
            {/* Main Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-8"
            >
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
                Math Academy
              </h1>
              <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto">
                Dove ogni battito del tuo cervello conta.
                Impara la matematica con un metodo che si adatta a te.
              </p>
            </motion.div>

            {/* Heartbeat Visualizer */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
              className="mb-12"
            >
              <div className="inline-flex flex-col items-center">
                <HeartbeatVisualizer 
                  isActive={isPulsing} 
                  bpm={pulseBPM} 
                  size="lg"
                />
                <button
                  onClick={() => setIsPulsing(!isPulsing)}
                  className="mt-4 px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-all flex items-center gap-2"
                >
                  {isPulsing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isPulsing ? 'Metti in pausa' : 'Avvia'} il battito
                </button>
              </div>
            </motion.div>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
            >
              <button
                onClick={onStart}
                className="px-8 py-4 bg-white text-indigo-900 rounded-full font-semibold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-2xl"
              >
                Inizia a Imparare
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Il Metodo che Batte al Tuo Ritmo
            </h2>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              Basato su 12 pilastri scientifici per un apprendimento efficace e duraturo
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
              >
                <feature.icon className="w-8 h-8 text-white mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-white/80">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="py-10 px-4 text-center">
        <p className="text-white/60">
          © 2026 Math Academy - Metodo di apprendimento quantistico
        </p>
      </div>
    </div>
  );
}