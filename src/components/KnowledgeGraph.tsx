'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as d3 from 'd3';
import { Layers, Play, ChevronRight, Lock } from 'lucide-react';

interface Node {
  id: string;
  title: string;
  layer: number;
  status: 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'MASTERED';
  x?: number;
  y?: number;
}

interface Link {
  source: string;
  target: string;
}

export default function KnowledgeGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<{ nodes: Node[], links: Link[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);

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

  useEffect(() => {
    if (!svgRef.current || !data || data.nodes.length === 0) return;

    const width = 1200;
    const height = 800;
    const padding = 100;
    const nodeWidth = 180;
    const nodeHeight = 80;

    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    svg.selectAll('*').remove();

    const g = svg.append('g');

    // Group nodes by layer
    const layers = d3.group(data.nodes, d => d.layer);
    const layerIndices = Array.from(layers.keys()).sort((a, b) => a - b);
    const layerCount = layerIndices.length;

    // Calculate positions
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
      .scaleExtent([0.2, 2])
      .on('zoom', (event) => g.attr('transform', event.transform));

    svg.call(zoom);

    // Initial zoom to fit
    const initialScale = 0.8;
    svg.call(zoom.transform, d3.zoomIdentity.translate(width * (1 - initialScale) / 2, 50).scale(initialScale));

    // Draw Links with curves - using bezier curves manually
    g.append('g')
      .selectAll('path')
      .data(data.links)
      .enter()
      .append('path')
      .attr('d', (d: any) => {
        const sourceNode = data.nodes.find(n => n.id === d.source);
        const targetNode = data.nodes.find(n => n.id === d.target);
        if (!sourceNode || !targetNode) return '';
        
        // Simple cubic bezier curve
        const sx = sourceNode.x!;
        const sy = sourceNode.y!;
        const tx = targetNode.x!;
        const ty = targetNode.y!;
        const midY = (sy + ty) / 2;
        
        return `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`;
      })
      .attr('fill', 'none')
      .attr('stroke', '#CBD5E0')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')
      .attr('opacity', 0.5);

    // Draw Nodes as cards
    const nodeGroups = g.append('g')
      .selectAll('g')
      .data(data.nodes)
      .enter()
      .append('g')
      .attr('transform', (d: any) => `translate(${d.x - nodeWidth / 2},${d.y - nodeHeight / 2})`)
      .style('cursor', 'pointer')
      .on('mouseenter', (event, d) => setHoveredNode(d))
      .on('mouseleave', () => setHoveredNode(null))
      .on('click', (event, d) => {
        if (d.status !== 'LOCKED') {
          window.location.href = `/learn/${d.id}`;
        }
      });

    // Card background
    nodeGroups.append('rect')
      .attr('width', nodeWidth)
      .attr('height', nodeHeight)
      .attr('rx', 16)
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
      .style('filter', 'drop-shadow(0 4px 6px rgba(0,0,0,0.05))');

    // Node Title
    nodeGroups.append('text')
      .attr('x', 20)
      .attr('y', 35)
      .attr('font-size', '14px')
      .attr('font-weight', '700')
      .attr('fill', (d: Node) => d.status === 'AVAILABLE' || d.status === 'LOCKED' ? '#1E293B' : 'white')
      .text((d: Node) => d.title.length > 20 ? d.title.substring(0, 18) + '...' : d.title);

    // Node Status Text
    nodeGroups.append('text')
      .attr('x', 20)
      .attr('y', 55)
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('fill', (d: Node) => d.status === 'AVAILABLE' || d.status === 'LOCKED' ? '#64748B' : 'rgba(255,255,255,0.8)')
      .text((d: Node) => d.status.replace('_', ' '));

    // Icon (Lock or Play)
    nodeGroups.append('g')
      .attr('transform', `translate(${nodeWidth - 40}, ${nodeHeight / 2 - 12})`)
      .append('path')
      .attr('d', (d: Node) => d.status === 'LOCKED' 
        ? "M12 11V7a4 4 0 0 1 8 0v4h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3zm2 0h4V7a2 2 0 1 0-4 0v4z" // Lucide Lock
        : "M5 3l14 9-14 9V3z" // Lucide Play
      )
      .attr('transform', 'scale(0.8)')
      .attr('fill', (d: Node) => {
        if (d.status === 'MASTERED' || d.status === 'IN_PROGRESS') return 'white';
        if (d.status === 'AVAILABLE') return '#3B82F6';
        return '#94A3B8';
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
    <div ref={containerRef} className="relative w-full bg-[#F8FAFC] rounded-2xl overflow-hidden border border-slate-200">
      <div className="absolute top-4 left-4 z-10 flex gap-4">
        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-slate-200">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-[10px] font-bold text-slate-600 uppercase">Mastered</span>
        </div>
        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-slate-200">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-[10px] font-bold text-slate-600 uppercase">In Corso</span>
        </div>
        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-slate-200">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-[10px] font-bold text-slate-600 uppercase">Disponibile</span>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 z-10 text-[10px] text-slate-400 font-medium italic">
        Trascina per spostarti • Usa la rotella per zoomare
      </div>

      <svg
        ref={svgRef}
        className="w-full h-[600px] touch-none"
      />
    </div>
  );
}
