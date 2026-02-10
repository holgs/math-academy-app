'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, BookOpen, ChevronDown, ChevronRight, Layers, Search, X } from 'lucide-react';
import {
  buildStructure,
  findDependents,
  findTopicById,
  makeTopicPath,
  SCHOOL_YEARS,
  type GraphTopic,
} from '@/lib/knowledge-graph-tree';

type Selection = {
  id: string;
  title: string;
  layer: number;
  pathLabel: string;
};

type TeacherTopic = GraphTopic;

interface TeacherTopicSelectorProps {
  selectedId: string;
  onSelect: (selection: Selection) => void;
  onClear?: () => void;
  title?: string;
  disabled?: boolean;
}

export default function TeacherTopicSelector({
  selectedId,
  onSelect,
  onClear,
  title = 'Selezione argomento progressiva',
  disabled = false,
}: TeacherTopicSelectorProps) {
  const [points, setPoints] = useState<TeacherTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState(selectedId);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchPoints();
  }, []);

  useEffect(() => {
    setSelectedTopicId(selectedId);
  }, [selectedId]);

  async function fetchPoints() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/teacher/knowledge-points?mode=flat');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore caricamento argomenti');

      const mapped: TeacherTopic[] = (data.points || []).map((point: any) => ({
        id: String(point.id),
        title: String(point.title),
        description: String(point.description || ''),
        layer: Number(point.layer || 0),
        prerequisites: Array.isArray(point.prerequisites) ? point.prerequisites : [],
        interferenceLinks: Array.isArray(point.interferenceLinks) ? point.interferenceLinks : [],
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

  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return [] as Array<TeacherTopic & { year: string; category: string; color: string }>;
    const q = searchQuery.toLowerCase();
    const results: Array<TeacherTopic & { year: string; category: string; color: string }> = [];

    for (const [year, categories] of Object.entries(structure)) {
      for (const [categoryKey, category] of Object.entries(categories)) {
        for (const topic of category.topics) {
          if (
            topic.title.toLowerCase().includes(q) ||
            topic.id.toLowerCase().includes(q) ||
            topic.description?.toLowerCase().includes(q)
          ) {
            results.push({ ...topic, year, category: category.name || categoryKey, color: category.color });
          }
        }
      }
    }

    return results;
  }, [searchQuery, structure]);

  const selectedDependents = useMemo(() => {
    if (!selectedTopic) return [];
    return findDependents(points, selectedTopic.id);
  }, [points, selectedTopic]);

  function toggleCategory(catName: string) {
    setExpandedCats((prev) => ({ ...prev, [catName]: !prev[catName] }));
  }

  function pickTopic(topic: TeacherTopic) {
    const pathLabel = makeTopicPath(topic);
    setSelectedTopicId(topic.id);
    onSelect({ id: topic.id, title: topic.title, layer: topic.layer, pathLabel });
  }

  function clearSelection() {
    setSelectedTopicId('');
    setSearchQuery('');
    onClear?.();
  }

  const selectedInterference = Array.isArray(selectedTopic?.interferenceLinks)
    ? selectedTopic.interferenceLinks
    : [];

  return (
    <div className="space-y-3">
      <h2 className="font-bold text-gray-800">{title}</h2>
      {error && <div className="text-sm bg-red-50 text-red-700 p-2 rounded">{error}</div>}

      <div className={`grid lg:grid-cols-[340px_1fr] gap-3 ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
        <div className="neu-flat border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-3 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
            <h3 className="text-sm font-semibold text-white">Knowledge Graph</h3>
            <p className="text-[11px] text-blue-100">Seleziona l'argomento finale della lezione</p>
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
            <div className="max-h-[380px] overflow-y-auto p-2 space-y-1">
              {filteredResults.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Nessun risultato</p>
              ) : (
                filteredResults.map((topic) => (
                  <button
                    type="button"
                    key={topic.id}
                    className={`w-full text-left p-2 rounded hover:bg-gray-100 border ${
                      selectedTopicId === topic.id ? 'bg-blue-50 border-blue-200' : 'border-transparent'
                    }`}
                    onClick={() => pickTopic(topic)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: topic.color }} />
                      <span className="text-sm font-medium flex-1 truncate">{topic.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100">L{topic.layer}</span>
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
                    type="button"
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

              <div className="max-h-[380px] overflow-y-auto">
                {loading ? (
                  <p className="text-sm text-gray-500 p-3">Caricamento argomenti...</p>
                ) : (
                  Object.entries(structure[selectedYear] || {}).map(([catName, catData]) => (
                    <div key={catName} className="border-b last:border-b-0">
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 p-3 hover:bg-gray-50 text-left"
                        onClick={() => toggleCategory(catName)}
                      >
                        {expandedCats[catName] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: catData.color }} />
                        <span className="text-sm font-medium flex-1">{catData.name}</span>
                        <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded">{catData.topics.length}</span>
                      </button>

                      {expandedCats[catName] && (
                        <div className="pb-2">
                          {catData.topics.map((topic) => (
                            <button
                              type="button"
                              key={topic.id}
                              className={`w-full flex items-center gap-2 py-1.5 px-4 pl-10 hover:bg-gray-100 text-left text-sm ${
                                selectedTopicId === topic.id ? 'bg-blue-50' : ''
                              }`}
                              onClick={() => pickTopic(topic)}
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
                              {Array.isArray(topic.interferenceLinks) && topic.interferenceLinks.length > 0 && (
                                <AlertTriangle size={12} className="text-orange-400" />
                              )}
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
          {selectedTopic ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{selectedTopic.title}</h3>
                <p className="text-xs text-gray-500 mt-1">{makeTopicPath(selectedTopic)}</p>
                <code className="text-[11px] bg-gray-100 px-2 py-1 rounded mt-2 inline-block">{selectedTopic.id}</code>
              </div>

              <div className="bg-white rounded-xl p-3 border">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <BookOpen size={15} className="text-blue-500" />
                  Prerequisiti ({selectedTopic.prerequisites.length})
                </h4>
                {selectedTopic.prerequisites.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedTopic.prerequisites.map((prereqId) => {
                      const prereq = findTopicById(points, prereqId);
                      return (
                        <button
                          type="button"
                          key={prereqId}
                          className="flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded text-xs"
                          onClick={() => prereq && pickTopic(prereq)}
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
                  Sblocca ({selectedDependents.length})
                </h4>
                {selectedDependents.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedDependents.map((dep) => (
                      <button
                        type="button"
                        key={dep.id}
                        className="px-2 py-1 bg-green-50 hover:bg-green-100 rounded text-xs"
                        onClick={() => pickTopic(dep)}
                      >
                        {dep.title}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic">Nessun argomento successivo diretto</p>
                )}
              </div>

              {selectedInterference.length > 0 && (
                <div className="bg-white rounded-xl p-3 border border-orange-200">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-orange-700 mb-2">
                    <AlertTriangle size={15} className="text-orange-500" />
                    Possibili confusioni ({selectedInterference.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedInterference.map((item) => {
                      const linked = findTopicById(points, String(item.topicId));
                      return (
                        <button
                          type="button"
                          key={`${selectedTopic.id}-${item.topicId}`}
                          className="w-full text-left p-2 rounded bg-orange-50 hover:bg-orange-100 text-xs"
                          onClick={() => linked && pickTopic(linked)}
                        >
                          <div className="font-medium">{linked?.title || String(item.topicId)}</div>
                          {item.reason && <div className="text-orange-700 mt-1">{item.reason}</div>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button type="button" className="neu-button px-3 py-2 text-xs" onClick={() => pickTopic(selectedTopic)}>
                  Conferma argomento
                </button>
                <button type="button" className="neu-button px-3 py-2 text-xs" onClick={clearSelection}>
                  Reset
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              Seleziona un argomento dal pannello a sinistra per vedere prerequisiti, sblocchi e confermare la scelta.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
