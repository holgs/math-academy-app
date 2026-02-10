'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Layers,
  Lock,
  Play,
  Search,
  X,
} from 'lucide-react';
import KatexContent from './KatexContent';
import {
  buildStructure,
  findDependents,
  findTopicById,
  makeTopicPath,
  SCHOOL_YEARS,
  type GraphTopic,
} from '@/lib/knowledge-graph-tree';

type PointDetail = {
  id: string;
  title: string;
  description: string;
  layer: number;
  status: 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'MASTERED';
  masteryLevel: number;
  prerequisites: string[];
  interferenceLinks?: Array<{ topicId: string; reason?: string }>;
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

type StudentTopic = GraphTopic & {
  description: string;
  status: 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'MASTERED';
};

const statusColor: Record<StudentTopic['status'], string> = {
  LOCKED: 'bg-gray-100 text-gray-500 border-gray-200',
  AVAILABLE: 'bg-blue-100 text-blue-700 border-blue-200',
  IN_PROGRESS: 'bg-amber-100 text-amber-700 border-amber-200',
  MASTERED: 'bg-green-100 text-green-700 border-green-200',
};

export default function KnowledgeGraph() {
  const [points, setPoints] = useState<StudentTopic[]>([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [selectedDetail, setSelectedDetail] = useState<PointDetail | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPoints();
  }, []);

  async function loadPoints() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/knowledge-graph?mode=flat');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore caricamento mappa');

      const mapped: StudentTopic[] = (data.points || []).map((point: any) => ({
        id: String(point.id),
        title: String(point.title),
        description: String(point.description || ''),
        layer: Number(point.layer || 0),
        prerequisites: Array.isArray(point.prerequisites) ? point.prerequisites : [],
        interferenceLinks: Array.isArray(point.interferenceLinks) ? point.interferenceLinks : [],
        status: point.status || 'LOCKED',
      }));

      setPoints(mapped);
    } catch (err: any) {
      setError(err.message || 'Errore rete');
    } finally {
      setLoading(false);
    }
  }

  const structure = useMemo(() => buildStructure(points), [points]);
  const years = useMemo(() => [...SCHOOL_YEARS], []);

  useEffect(() => {
    if (!selectedYear && years.length > 0) {
      setSelectedYear(years[0]);
    }
  }, [years, selectedYear]);

  const selectedTopic = useMemo(
    () => findTopicById(points, selectedTopicId),
    [points, selectedTopicId]
  );

  const dependents = useMemo(() => {
    if (!selectedTopic) return [];
    return findDependents(points, selectedTopic.id);
  }, [points, selectedTopic]);

  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return [] as Array<StudentTopic & { year: string; category: string; color: string }>;
    const q = searchQuery.toLowerCase();
    const results: Array<StudentTopic & { year: string; category: string; color: string }> = [];

    for (const [year, categories] of Object.entries(structure)) {
      for (const [categoryKey, category] of Object.entries(categories)) {
        for (const topic of category.topics) {
          if (
            topic.title.toLowerCase().includes(q) ||
            topic.id.toLowerCase().includes(q) ||
            topic.description.toLowerCase().includes(q)
          ) {
            results.push({ ...topic, year, category: category.name || categoryKey, color: category.color });
          }
        }
      }
    }

    return results;
  }, [searchQuery, structure]);

  async function selectTopic(topic: StudentTopic) {
    setSelectedTopicId(topic.id);
    setError('');
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/knowledge-points/${topic.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore caricamento dettaglio');
      setSelectedDetail(data as PointDetail);
    } catch (err: any) {
      setError(err.message || 'Errore rete');
      setSelectedDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  function toggleCategory(catName: string) {
    setExpandedCats((prev) => ({ ...prev, [catName]: !prev[catName] }));
  }

  const interferenceLinks = Array.isArray(selectedDetail?.interferenceLinks)
    ? selectedDetail.interferenceLinks
    : [];

  return (
    <div className="grid lg:grid-cols-[360px_1fr] gap-4">
      <div className="neu-flat border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
          <h3 className="text-white font-semibold">Knowledge Graph</h3>
          <p className="text-[11px] text-blue-100">Esplora la mappa per anno, categoria e argomento</p>
        </div>

        <div className="p-3 border-b">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca argomento..."
              className="neu-input w-full pl-9 pr-8 py-2 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={loading}
            />
            {searchQuery && (
              <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setSearchQuery('')}>
                <X size={16} className="text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {searchQuery ? (
          <div className="max-h-[540px] overflow-y-auto p-2 space-y-1">
            {filteredResults.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">Nessun risultato</p>
            ) : (
              filteredResults.map((topic) => (
                <button
                  key={topic.id}
                  className={`w-full text-left p-2 rounded hover:bg-gray-100 border ${
                    selectedTopicId === topic.id ? 'bg-blue-50 border-blue-200' : 'border-transparent'
                  }`}
                  onClick={() => selectTopic(topic)}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: topic.color }} />
                    <span className="text-sm font-medium flex-1 truncate">{topic.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${statusColor[topic.status]}`}>{topic.status}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{topic.year} {'->'} {topic.category}</div>
                </button>
              ))
            )}
          </div>
        ) : (
          <>
            <div className="flex border-b">
              {years.map((year) => (
                <button
                  key={year}
                  className={`flex-1 py-2 text-xs font-medium ${
                    selectedYear === year
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedYear(year)}
                >
                  {year}
                </button>
              ))}
            </div>

            <div className="max-h-[540px] overflow-y-auto">
              {loading ? (
                <p className="text-sm text-gray-500 p-3">Caricamento...</p>
              ) : (
                Object.entries(structure[selectedYear] || {}).map(([catName, catData]) => (
                  <div key={catName} className="border-b last:border-b-0">
                    <button
                      className="w-full flex items-center gap-2 p-3 hover:bg-gray-50 text-left"
                      onClick={() => toggleCategory(catName)}
                    >
                      {expandedCats[catName] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: catData.color }} />
                      <span className="font-medium text-sm flex-1">{catData.name}</span>
                      <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded">{catData.topics.length}</span>
                    </button>

                    {expandedCats[catName] && (
                      <div className="pb-2">
                        {catData.topics.map((topic) => (
                          <button
                            key={topic.id}
                            className={`w-full flex items-center gap-2 py-1.5 px-4 pl-10 hover:bg-gray-100 text-left text-sm ${
                              selectedTopicId === topic.id ? 'bg-blue-50' : ''
                            }`}
                            onClick={() => selectTopic(topic as StudentTopic)}
                          >
                            <div
                              className={`w-2 h-2 rounded-full ${
                                topic.layer === 0
                                  ? 'bg-green-400'
                                  : topic.layer === 1
                                  ? 'bg-yellow-400'
                                  : 'bg-red-400'
                              }`}
                            />
                            <span className="flex-1 truncate">{topic.title}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${statusColor[(topic as StudentTopic).status]}`}>
                              {(topic as StudentTopic).status}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      <div className="neu-flat border border-gray-200 rounded-xl p-4">
        {error && <div className="text-sm bg-red-50 text-red-700 p-2 rounded mb-3">{error}</div>}

        {!selectedTopicId ? (
          <div className="text-sm text-gray-500">
            Seleziona un argomento dalla sidebar per visualizzare prerequisiti, contenuti e collegamenti.
          </div>
        ) : detailLoading ? (
          <div className="text-sm text-gray-500">Caricamento dettaglio...</div>
        ) : !selectedDetail ? (
          <div className="text-sm text-gray-500">Nessun dettaglio disponibile.</div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`text-[10px] px-2 py-1 rounded border ${statusColor[selectedDetail.status]}`}>{selectedDetail.status}</span>
                <code className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded font-mono">{selectedDetail.id}</code>
              </div>
              <h3 className="text-2xl font-bold text-gray-800">{selectedDetail.title}</h3>
              <p className="text-xs text-gray-500 mt-1">{makeTopicPath(selectedDetail)}</p>
              <p className="text-xs text-gray-500 mt-1">Layer {selectedDetail.layer + 1} - Mastery {Math.round(selectedDetail.masteryLevel)}%</p>
            </div>

            <div className="bg-white rounded-xl p-3 border">
              <p className="text-xs text-gray-500 mb-1">Descrizione</p>
              <KatexContent content={selectedDetail.description} />
            </div>

            <div className="bg-white rounded-xl p-3 border">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <BookOpen size={15} className="text-blue-500" />
                Prerequisiti ({selectedDetail.prerequisites.length})
              </h4>
              {selectedDetail.prerequisites.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedDetail.prerequisites.map((prereqId) => {
                    const prereq = findTopicById(points, prereqId);
                    return (
                      <button
                        key={prereqId}
                        className="flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded text-xs"
                        onClick={() => prereq && selectTopic(prereq as StudentTopic)}
                      >
                        {prereq?.title || prereqId}
                        <ArrowRight size={12} className="text-blue-400" />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">Nessun prerequisito (argomento base)</p>
              )}
            </div>

            <div className="bg-white rounded-xl p-3 border">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Layers size={15} className="text-green-500" />
                Sblocca ({dependents.length})
              </h4>
              {dependents.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {dependents.map((dep) => (
                    <button
                      key={dep.id}
                      className="px-2 py-1 bg-green-50 hover:bg-green-100 rounded text-xs"
                      onClick={() => selectTopic(dep as StudentTopic)}
                    >
                      {dep.title}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">Nessun argomento successivo diretto</p>
              )}
            </div>

            {interferenceLinks.length > 0 && (
              <div className="bg-white rounded-xl p-3 border border-orange-200">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-orange-700 mb-2">
                  <AlertTriangle size={15} className="text-orange-500" />
                  Possibili confusioni ({interferenceLinks.length})
                </h4>
                <div className="space-y-2">
                  {interferenceLinks.map((item) => {
                    const linked = findTopicById(points, String(item.topicId));
                    return (
                      <button
                        key={`${selectedDetail.id}-${item.topicId}`}
                        className="w-full text-left p-2 rounded bg-orange-50 hover:bg-orange-100 text-xs"
                        onClick={() => linked && selectTopic(linked as StudentTopic)}
                      >
                        <div className="font-medium">{linked?.title || String(item.topicId)}</div>
                        {item.reason && <div className="text-orange-700 mt-1">{item.reason}</div>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedDetail.importedTheory?.length > 0 && (
              <div className="bg-white rounded-xl p-3 border">
                <p className="text-xs text-gray-500 mb-2">Teoria importata</p>
                <div className="space-y-2">
                  {selectedDetail.importedTheory.map((item, idx) => (
                    <KatexContent key={`th-${idx}`} content={item} />
                  ))}
                </div>
              </div>
            )}

            {selectedDetail.importedTips?.length > 0 && (
              <div className="bg-white rounded-xl p-3 border">
                <p className="text-xs text-gray-500 mb-2">Suggerimenti importati</p>
                <div className="space-y-2">
                  {selectedDetail.importedTips.map((item, idx) => (
                    <KatexContent key={`tip-${idx}`} content={item} />
                  ))}
                </div>
              </div>
            )}

            {selectedDetail.importedExamples?.length > 0 && (
              <div className="bg-white rounded-xl p-3 border">
                <p className="text-xs text-gray-500 mb-2">Esempi guidati importati</p>
                <div className="space-y-2">
                  {selectedDetail.importedExamples.map((item, idx) => (
                    <div key={`eximp-${idx}`} className="neu-pressed p-2">
                      <p className="text-sm font-medium text-gray-700 mb-1">{item.title || `Esempio ${idx + 1}`}</p>
                      <KatexContent content={item.content || ''} isHtml />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedDetail.examples?.length > 0 && (
              <div className="bg-white rounded-xl p-3 border">
                <p className="text-xs text-gray-500 mb-2">Esercizi disponibili</p>
                <div className="space-y-2 max-h-52 overflow-auto pr-1">
                  {selectedDetail.examples.map((exercise) => (
                    <div key={exercise.id} className="neu-pressed p-2">
                      <KatexContent className="text-sm text-gray-700" content={exercise.question} />
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-3">
                        <span>Difficolta {exercise.difficulty}</span>
                        <span className="flex items-center gap-1">
                          <Play className="w-3 h-3" />
                          Pronto
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedDetail.status !== 'LOCKED' ? (
              <Link href={`/learn/${selectedDetail.id}`} className="neu-button px-3 py-2 text-xs text-green-700 inline-flex items-center gap-1">
                <Play className="w-3 h-3" />
                Vai allo studio
              </Link>
            ) : (
              <span className="text-xs text-gray-400 inline-flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Completa i prerequisiti per sbloccare
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
