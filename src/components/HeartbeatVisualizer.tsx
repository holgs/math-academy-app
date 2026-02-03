import { motion } from 'framer-motion';
import { Heart, Activity } from 'lucide-react';

interface HeartbeatVisualizerProps {
  isActive: boolean;
  bpm: number; // beats per minute
  size?: 'sm' | 'md' | 'lg';
}

export default function HeartbeatVisualizer({ 
  isActive, 
  bpm, 
  size = 'md' 
}: HeartbeatVisualizerProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const pulseDuration = 60 / bpm; // secondi tra i battiti

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Sfondo con effetto onda */}
      <motion.div
        className="absolute inset-0 bg-red-500 rounded-full opacity-20"
        animate={isActive ? {
          scale: [1, 1.5, 2],
          opacity: [0.2, 0.1, 0]
        } : {}}
        transition={{
          duration: pulseDuration,
          repeat: Infinity,
          ease: "easeOut"
        }}
      />
      
      {/* Icona cuore principale */}
      <motion.div
        className={`relative ${sizeClasses[size]}`}
        animate={isActive ? {
          scale: [1, 1.1, 1],
        } : {}}
        transition={{
          duration: pulseDuration * 0.3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <Heart 
          className={`w-full h-full ${isActive ? 'text-red-500' : 'text-gray-300'}`}
          fill={isActive ? 'currentColor' : 'none'}
        />
      </motion.div>

      {/* Linea ECG */}
      {isActive && (
        <svg 
          className="absolute -bottom-4 left-0 right-0 h-6" 
          viewBox="0 0 100 20"
        >
          <motion.path
            d="M0,10 L20,10 L25,5 L30,15 L35,10 L60,10 L65,5 L70,15 L75,10 L100,10"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{
              duration: pulseDuration,
              repeat: Infinity,
              ease: "linear"
            }}
            className="text-red-400"
          />
        </svg>
      )}

      {/* BPM counter */}
      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <Activity className="w-3 h-3" />
          <span>{bpm} BPM</span>
        </div>
      </div>
    </div>
  );
}