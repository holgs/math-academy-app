'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Lightbulb, Lock, Play, Undo2 } from 'lucide-react';
import KatexContent from './KatexContent';

type GraphPoint = {
  id: string;
  title: string;
  description: string;
  layer: number;
  prerequisites: string[];
  status: 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'MASTERED';
  hasChildren: boolean;
};

type PointDetail = {
  id: string;
  title: string;
  description: string;
  layer: number;
  status: 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'MASTERED';
  masteryLevel: number;
  importedTheory: string[];
  importedTips: string[];
  importedExamples: Array<{ title?: string; content?: string }>;
  examples: Array<{
    id: string;
    question: string;
    answer: string;
    hint: string | null;
    difficulty: number;
  }>;
};

const statusColor: Record<GraphPoint['status'], string> = {
  LOCKED: 'bg-gray-100 text-gray-500 border-gray-200',
  AVAILABLE: 'bg-blue-100 text-blue-700 border-blue-200',
  IN_PROGRESS: 'bg-amber-100 text-amber-700 border-amber-200',
  MASTERED: 'bg-green-100 text-green-700 border-green-200',
};

export default function KnowledgeGraph() {
  const [path, setPath] = useState<GraphPoint[]>([]);
  const [points, setPoints] = useState<GraphPoint[]>([]);
  const [selected, setSelected] = useState<PointDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPoints();
  }, []);

  const breadcrumb = useMemo(() => path.map((p) => p.title).join(' > '), [path]);

  async function loadPoints(parentId?: string) {
    setLoading(true);
    setError('');
    try {
      const url = parentId
        ? `/api/knowledge-graph?mode=progressive&parentId=${encodeURIComponent(parentId)}`
        : '/api/knowledge-graph?mode=progressive';
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore caricamento mappa');
      setPoints(data.points || []);
    } catch (err: any) {
      setError(err.message || 'Errore rete');
    } finally {
      setLoading(false);
    }
  }

  async function selectPoint(point: GraphPoint) {
    setError('');
    try {
      const res = await fetch(`/api/knowledge-points/${point.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore caricamento dettaglio');
      setSelected(data);
    } catch (err: any) {
      setError(err.message || 'Errore rete');
    }
  }

  function enterChildren(point: GraphPoint) {
    setPath((prev) => [...prev, point]);
    loadPoints(point.id);
    setSelected(null);
  }

  function goToLevel(index: number) {
    if (index < 0) {
      setPath([]);
      loadPoints();
      setSelected(null);
      return;
    }

    const nextPath = path.slice(0, index + 1);
    const last = nextPath[nextPath.length - 1];
    setPath(nextPath);
    loadPoints(last?.id);
    setSelected(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button className="neu-button px-2 py-1" onClick={() => goToLevel(-1)}>Radice</button>
        {path.map((node, idx) => (
          <button key={node.id} className="neu-button px-2 py-1 flex items-center gap-1" onClick={() => goToLevel(idx)}>
            {node.title}
            <ChevronRight className="w-3 h-3" />
          </button>
        ))}
        {breadcrumb && <span className="text-xs text-gray-500">{breadcrumb}</span>}
      </div>

      {error && <div className="neu-flat p-3 bg-red-50 text-red-600 text-sm">{error}</div>}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="neu-flat p-4">
          <h3 className="font-bold text-gray-800 mb-3">Argomenti disponibili (dal generale al particolare)</h3>
          {loading ? (
            <div className="text-sm text-gray-500">Caricamento...</div>
          ) : points.length === 0 ? (
            <div className="text-sm text-gray-500">Nessun sotto-argomento in questo livello.</div>
          ) : (
            <div className="space-y-2 max-h-[520px] overflow-auto pr-1">
              {points.map((point) => (
                <div key={point.id} className="neu-button p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-medium text-gray-800">L{point.layer + 1} - {point.title}</div>
                      <div className="text-xs text-gray-500">{point.description}</div>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded border ${statusColor[point.status]}`}>{point.status}</span>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <button className="neu-button px-2 py-1 text-xs" onClick={() => selectPoint(point)}>
                      Dettaglio
                    </button>
                    {point.hasChildren && (
                      <button className="neu-button px-2 py-1 text-xs text-indigo-700" onClick={() => enterChildren(point)}>
                        Apri sotto-argomenti
                      </button>
                    )}
                    {point.status !== 'LOCKED' ? (
                      <Link href={`/learn/${point.id}`} className="neu-button px-2 py-1 text-xs text-green-700">Vai allo studio</Link>
                    ) : (
                      <span className="text-xs text-gray-400 flex items-center gap-1"><Lock className="w-3 h-3" />Bloccato</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="neu-flat p-4">
          {!selected ? (
            <div className="text-sm text-gray-500">
              Seleziona un argomento per visualizzare teoria, suggerimenti, esempi ed esercizi importati.
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-gray-800">{selected.title}</h3>
                <p className="text-xs text-gray-500">Layer {selected.layer + 1} - Mastery {Math.round(selected.masteryLevel)}%</p>
              </div>

              <div className="neu-convex p-3">
                <p className="text-xs text-gray-500 mb-1">Descrizione</p>
                <KatexContent content={selected.description} />
              </div>

              {selected.importedTheory?.length > 0 && (
                <div className="neu-convex p-3">
                  <p className="text-xs text-gray-500 mb-2">Teoria importata</p>
                  <div className="space-y-2">
                    {selected.importedTheory.map((item, idx) => (
                      <KatexContent key={`th-${idx}`} content={item} />
                    ))}
                  </div>
                </div>
              )}

              {selected.importedTips?.length > 0 && (
                <div className="neu-convex p-3">
                  <p className="text-xs text-gray-500 mb-2 flex items-center gap-1"><Lightbulb className="w-3 h-3" />Suggerimenti importati</p>
                  <div className="space-y-2">
                    {selected.importedTips.map((item, idx) => (
                      <KatexContent key={`tip-${idx}`} content={item} />
                    ))}
                  </div>
                </div>
              )}

              {selected.importedExamples?.length > 0 && (
                <div className="neu-convex p-3">
                  <p className="text-xs text-gray-500 mb-2">Esempi guidati importati</p>
                  <div className="space-y-2">
                    {selected.importedExamples.map((item, idx) => (
                      <div key={`eximp-${idx}`} className="neu-pressed p-2">
                        <p className="text-sm font-medium text-gray-700 mb-1">{item.title || `Esempio ${idx + 1}`}</p>
                        <KatexContent content={item.content || ''} isHtml />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selected.examples?.length > 0 && (
                <div className="neu-convex p-3">
                  <p className="text-xs text-gray-500 mb-2">Esercizi disponibili</p>
                  <div className="space-y-2 max-h-52 overflow-auto pr-1">
                    {selected.examples.map((exercise) => (
                      <div key={exercise.id} className="neu-pressed p-2">
                        <KatexContent className="text-sm text-gray-700" content={exercise.question} />
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-3">
                          <span>Difficolta {exercise.difficulty}</span>
                          <span className="flex items-center gap-1"><Play className="w-3 h-3" />Pronto</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button className="neu-button px-3 py-2 text-xs" onClick={() => setSelected(null)}>
                  <Undo2 className="w-3 h-3 inline-block mr-1" />
                  Chiudi dettaglio
                </button>
                {selected.status !== 'LOCKED' && (
                  <Link href={`/learn/${selected.id}`} className="neu-button px-3 py-2 text-xs text-green-700">Apri argomento</Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
