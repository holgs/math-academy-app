'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as d3 from 'd3';
import { Layers, Lightbulb, Lock, Play, X } from 'lucide-react';

interface Node {
  id: string;
  title: string;
  layer: number;
  status: 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'MASTERED';
  x?: number;
  y?: number;
  description?: string;
}

interface Link {
  source: string;
  target: string;
}

interface KnowledgeLightbulb {
  tips: string[];
  commonMistakes: string[];
  realWorldApps: string[];
}

export default function KnowledgeGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<{ nodes: Node[], links: Link[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [lightbulb, setLightbulb] = useState<KnowledgeLightbulb | null>(null);
  const [showLightbulb, setShowLightbulb] = useState(false);

  useEffect(() => {
    fetchGraphData();
  }, []);

  const fetchGraphData = async () => {
    try {
      const res = await fetch('/api/knowledge-graph');
      const json = await res.json();
      setData(json);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load graph:', error);
      setLoading(false);
    }
  };

  const fetchLightbulb = async (nodeId: string) => {
    try {
      const res = await fetch(`/api/knowledge-points/${nodeId}/lightbulb`);
      if (res.ok) {
        const data = await res.json();
        setLightbulb(data);
        setShowLightbulb(true);
      }
    } catch (error) {
      console.error('Failed to load lightbulb:', error);
    }
  };

  useEffect(() => {
    if (!svgRef.current || !data || data.nodes.length === 0) return;

    const width = 1200;
    const height = 700;
    const padding = 80;
    const nodeWidth = 160;
    const nodeHeight = 70;

    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    svg.selectAll('*').remove();

    const g = svg.append('g');

    // Group nodes by layer
    const layers = d3.group(data.nodes, d => d.layer);
    const layerIndices = Array.from(layers.keys()).sort((a, b) => a - b);
    const layerCount = layerIndices.length;

    // Calculate positions - vertical layout (layers from top to bottom)
    const yStep = (height - 2 * padding) / (layerCount > 1 ? layerCount - 1 : 1);
    
    data.nodes.forEach(node => {
      const layerNodes = layers.get(node.layer) || [];
      const indexInLayer = layerNodes.indexOf(node);
      const xStep = (width - 2 * padding) / (layerNodes.length > 1 ? layerNodes.length - 1 : 1);
      
      node.x = padding + (layerNodes.length > 1 ? indexInLayer * xStep : (width - 2 * padding) / 2);
      node.y = padding + node.layer * yStep;
    });

    // Zoom setup
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 2])
      .on('zoom', (event) => g.attr('transform', event.transform));

    svg.call(zoom);

    // Initial zoom to fit
    const initialScale = 0.85;
    svg.call(zoom.transform, d3.zoomIdentity.translate(width * (1 - initialScale) / 2, 30).scale(initialScale));

    // Draw Links with curves
    g.append('g')
      .selectAll('path')
      .data(data.links)
      .enter()
      .append('path')
      .attr('d', (d: any) => {
        const sourceNode = data.nodes.find(n => n.id === d.source);
        const targetNode = data.nodes.find(n => n.id === d.target);
        if (!sourceNode || !targetNode) return '';
        
        const sx = sourceNode.x!;
        const sy = sourceNode.y! + nodeHeight / 2;
        const tx = targetNode.x!;
        const ty = targetNode.y! - nodeHeight / 2;
        const midY = (sy + ty) / 2;
        
        return `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`;
      })
      .attr('fill', 'none')
      .attr('stroke', '#94A3B8')
      .attr('stroke-width', 2)
      .attr('opacity', 0.4);

    // Draw Nodes as cards
    const nodeGroups = g.append('g')
      .selectAll('g')
      .data(data.nodes)
      .enter()
      .append('g')
      .attr('transform', (d: any) => `translate(${d.x - nodeWidth / 2},${d.y - nodeHeight / 2})`)
      .style('cursor', 'pointer');

    // Card background with status colors
    nodeGroups.append('rect')
      .attr('width', nodeWidth)
      .attr('height', nodeHeight)
      .attr('rx', 12)
      .attr('fill', (d: Node) => {
        if (d.status === 'MASTERED') return '#10B981';
        if (d.status === 'IN_PROGRESS') return '#F59E0B';
        if (d.status === 'AVAILABLE') return '#FFFFFF';
        return '#F1F5F9';
      })
      .attr('stroke', (d: Node) => {
        if (d.status === 'MASTERED') return '#059669';
        if (d.status === 'IN_PROGRESS') return '#D97706';
        if (d.status === 'AVAILABLE') return '#3B82F6';
        return '#CBD5E0';
      })
      .attr('stroke-width', 2)
      .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.08))')
      .on('click', (event, d) => {
        setSelectedNode(d);
        if (d.status !== 'LOCKED') {
          window.location.href = `/learn/${d.id}`;
        }
      });

    // Lightbulb icon for hints
    nodeGroups.append('circle')
      .attr('cx', nodeWidth - 15)
      .attr('cy', 15)
      .attr('r', 8)
      .attr('fill', '#FEF3C7')
      .attr('stroke', '#F59E0B')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedNode(d);
        fetchLightbulb(d.id);
      });

    nodeGroups.append('text')
      .attr('x', nodeWidth - 15)
      .attr('y', 19)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .text('💡')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedNode(d);
        fetchLightbulb(d.id);
      });

    // Node Title
    nodeGroups.append('text')
      .attr('x', 12)
      .attr('y', 28)
      .attr('font-size', '12px')
      .attr('font-weight', '600')
      .attr('fill', (d: Node) => d.status === 'AVAILABLE' || d.status === 'LOCKED' ? '#1E293B' : 'white')
      .text((d: Node) => d.title.length > 18 ? d.title.substring(0, 16) + '...' : d.title);

    // Node Status
    nodeGroups.append('text')
      .attr('x', 12)
      .attr('y', 48)
      .attr('font-size', '9px')
      .attr('font-weight', '500')
      .attr('fill', (d: Node) => {
        if (d.status === 'MASTERED' || d.status === 'IN_PROGRESS') return 'rgba(255,255,255,0.9)';
        return '#64748B';
      })
      .text((d: Node) => {
        const labels: Record<string, string> = {
          'LOCKED': '🔒 Bloccato',
          'AVAILABLE': '▶️ Inizia',
          'IN_PROGRESS': '⏳ In corso',
          'MASTERED': '✅ Completato'
        };
        return labels[d.status];
      });

  }, [data]);

  if (loading) {
    return (
      <div className="h-[600px] flex items-center justify-center">
        <div className="neu-convex p-6 text-blue-600">
          <Layers className="w-8 h-8 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full">
      { /* Legend */ }
      <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2">
        {[
          { color: 'bg-green-500', label: 'Completato' },
          { color: 'bg-amber-500', label: 'In corso' },
          { color: 'bg-blue-500', label: 'Disponibile' },
          { color: 'bg-gray-300', label: 'Bloccato' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 bg-white/90 backdrop-blur px-2 py-1 rounded-full shadow-sm border border-gray-200">
            <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
            <span className="text-[10px] font-bold text-gray-600">{item.label}</span>
          </div>
        ))}
      </div>

      { /* Instructions */ }
      <div className="absolute bottom-4 left-4 z-10 text-[10px] text-gray-400 font-medium">
        Clicca 💡 per suggerimenti • Clicca la scheda per iniziare
      </div>

      { /* Lightbulb Modal */ }
      <AnimatePresence>
        {showLightbulb && lightbulb && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
            onClick={() => setShowLightbulb(false)}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                      <Lightbulb className="w-5 h-5 text-yellow-600" />
                    </div>
                    <h3 className="font-bold text-gray-800">💡 Lampadina</h3>
                  </div>
                  <button 
                    onClick={() => setShowLightbulb(false)}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <X size={20} className="text-gray-400" />
                  </button>
                </div>

                {selectedNode && (
                  <p className="text-sm text-gray-500 mb-4">{selectedNode.title}</p>
                )}

                <div className="space-y-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h4 className="text-xs font-bold text-blue-700 uppercase mb-2">💡 Suggerimenti</h4>
                    <ul className="space-y-1">
                      {lightbulb.tips.map((tip, i) => (
                        <li key={i} className="text-sm text-blue-800">• {tip}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-red-50 p-3 rounded-lg">
                    <h4 className="text-xs font-bold text-red-700 uppercase mb-2">⚠️ Errori comuni</h4>
                    <ul className="space-y-1">
                      {lightbulb.commonMistakes.map((mistake, i) => (
                        <li key={i} className="text-sm text-red-800">• {mistake}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-green-50 p-3 rounded-lg">
                    <h4 className="text-xs font-bold text-green-700 uppercase mb-2">🌍 Applicazioni reali</h4>
                    <ul className="space-y-1">
                      {lightbulb.realWorldApps.map((app, i) => (
                        <li key={i} className="text-sm text-green-800">• {app}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <svg
        ref={svgRef}
        className="w-full h-[600px] rounded-2xl bg-slate-50 border border-slate-200"
      />
    </div>
  );
}
