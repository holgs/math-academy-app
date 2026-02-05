'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Minimize2,
  X,
  Play,
  Pause,
  Grid3X3
} from 'lucide-react';

interface Slide {
  id: string;
  type: 'content' | 'example' | 'exercise' | 'summary';
  title: string;
  content: string;
  order: number;
}

interface Lesson {
  id: string;
  title: string;
  description: string;
  slides: Slide[];
}

export default function PresentLesson() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params?.id as string;
  
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);

  useEffect(() => {
    if (lessonId) {
      fetchLesson();
    }
  }, [lessonId]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        prevSlide();
      } else if (e.key === 'Escape') {
        if (isFullscreen) {
          exitFullscreen();
        }
      } else if (e.key === 'f') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide, lesson, isFullscreen]);

  const fetchLesson = async () => {
    try {
      const res = await fetch(`/api/teacher/lessons/${lessonId}`);
      if (res.ok) {
        const data = await res.json();
        setLesson(data.lesson);
      }
    } catch (error) {
      console.error('Failed to fetch lesson:', error);
    } finally {
      setLoading(false);
    }
  };

  const nextSlide = useCallback(() => {
    if (lesson && currentSlide < lesson.slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    }
  }, [currentSlide, lesson]);

  const prevSlide = useCallback(() => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  }, [currentSlide]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      exitFullscreen();
    }
  };

  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    setIsFullscreen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white">Caricamento...</div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white">Lezione non trovata</div>
      </div>
    );
  }

  const slide = lesson.slides[currentSlide];
  const progress = ((currentSlide + 1) / lesson.slides.length) * 100;

  return (
    <div className={`min-h-screen bg-gray-900 text-white ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-gray-800 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/teacher/lessons')}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-semibold text-sm">{lesson.title}</h1>
            <p className="text-xs text-gray-400">
              Slide {currentSlide + 1} di {lesson.slides.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowThumbnails(!showThumbnails)}
            className={`p-2 rounded-lg transition-colors ${showThumbnails ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
          >
            <Grid3X3 className="w-5 h-5" />
          </button>
          <button 
            onClick={toggleFullscreen}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="fixed top-14 left-0 right-0 h-1 bg-gray-700 z-40">
        <motion.div 
          className="h-full bg-purple-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Main Content */}
      <div className="pt-16 pb-20 min-h-screen flex items-center justify-center p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="max-w-5xl w-full"
          >
            {/* Slide Type Badge */}
            <div className="mb-6">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                slide.type === 'content' ? 'bg-blue-500/20 text-blue-300' :
                slide.type === 'example' ? 'bg-green-500/20 text-green-300' :
                slide.type === 'exercise' ? 'bg-amber-500/20 text-amber-300' :
                'bg-purple-500/20 text-purple-300'
              }`}>
                {slide.type}
              </span>
            </div>

            {/* Slide Title */}
            <h2 className="text-4xl md:text-5xl font-bold mb-8">{slide.title}</h2>

            {/* Slide Content */}
            <div 
              className="prose prose-invert prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: slide.content }}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Thumbnails Panel */}
      <AnimatePresence>
        {showThumbnails && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-20 left-4 right-4 bg-gray-800 rounded-xl p-4 z-30 max-h-48 overflow-y-auto"
          >
            <div className="flex gap-3">
              {lesson.slides.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setCurrentSlide(idx);
                    setShowThumbnails(false);
                  }}
                  className={`flex-shrink-0 w-32 p-3 rounded-lg text-left transition-colors ${
                    idx === currentSlide 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <span className="text-xs opacity-70">{idx + 1}</span>
                  <p className="text-sm font-medium truncate">{s.title}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-gray-800 flex items-center justify-between px-4 z-40">
        <button 
          onClick={prevSlide}
          disabled={currentSlide === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="hidden sm:inline">Precedente</span>
        </button>

        <div className="text-sm text-gray-400">
          {currentSlide + 1} / {lesson.slides.length}
        </div>

        <button 
          onClick={nextSlide}
          disabled={currentSlide === lesson.slides.length - 1}
          className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <span className="hidden sm:inline">Successiva</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Click zones for navigation */}
      <div 
        className="fixed top-16 bottom-16 left-0 w-1/4 z-30 cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
        onClick={prevSlide}
      >
        <div className="h-full flex items-center justify-start pl-4">
          <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
            <ChevronLeft className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      <div 
        className="fixed top-16 bottom-16 right-0 w-1/4 z-30 cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
        onClick={nextSlide}
      >
        <div className="h-full flex items-center justify-end pr-4">
          <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
            <ChevronRight className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
