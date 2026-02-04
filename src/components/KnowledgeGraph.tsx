'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import * as d3 from 'd3';
import { Layers } from 'lucide-react';

interface Node {
  id: string;
  title: string;
  layer: number;
  status: 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'MASTERED';
  x?: number;
  y?: number;
}

interface Link {
  source: string | Node;
  target: string | Node;
}

export default function KnowledgeGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLayer, setSelectedLayer] = useState<number | 'all'>('all');

  useEffect(() => {
    fetchGraphData();
  }, []);

  const fetchGraphData = async () => {
    try {
      const res = await fetch('/api/knowledge-graph');
      const data = await res.json();
      setNodes(data.nodes);
      setLinks(data.links);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load graph:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = 500;

    // Filter nodes based on layer
    const activeNodes = selectedLayer === 'all' 
      ? nodes 
      : nodes.filter(n => n.layer === selectedLayer);
    
    // Position calculation needs to consider all nodes to maintain structure,
    // or we can just render only active ones. 
    // Let's render all but change opacity for non-selected layers
    
    // Group nodes by layer
    const layers = d3.group(nodes, d => d.layer);
    const layerCount = Math.max(...nodes.map(n => n.layer)) + 1;
    
    // Position nodes in layers
    const nodeRadius = 35;
    const layerHeight = height / (layerCount + 1);
    
    nodes.forEach(node => {
      const layerNodes = layers.get(node.layer) || [];
      const index = layerNodes.indexOf(node);
      const layerWidth = width - 100;
      const spacing = layerNodes.length > 1 ? layerWidth / (layerNodes.length - 1) : 0;
      
      node.x = 50 + (layerNodes.length > 1 ? index * spacing : layerWidth / 2);
      node.y = 50 + node.layer * layerHeight;
    });

    // Draw links
    const linkElements = svg
      .append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#CBD5E0')
      .attr('stroke-width', 2)
      .attr('x1', (d: any) => (d.source as Node).x || 0)
      .attr('y1', (d: any) => (d.source as Node).y || 0)
      .attr('x2', (d: any) => (d.target as Node).x || 0)
      .attr('y2', (d: any) => (d.target as Node).y || 0)
      .attr('opacity', (d: any) => {
        if (selectedLayer === 'all') return 1;
        const sourceLayer = (d.source as Node).layer;
        const targetLayer = (d.target as Node).layer;
        return (sourceLayer === selectedLayer || targetLayer === selectedLayer) ? 1 : 0.1;
      });

    // Draw nodes
    const nodeGroups = svg
      .append('g')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('transform', (d: any) => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer')
      .attr('opacity', (d: Node) => selectedLayer === 'all' || d.layer === selectedLayer ? 1 : 0.1);

    // Node circles with neumorphism effect
    nodeGroups
      .append('circle')
      .attr('r', nodeRadius)
      .attr('fill', (d: Node) => {
        switch (d.status) {
          case 'MASTERED': return '#10B981';
          case 'IN_PROGRESS': return '#F59E0B';
          case 'AVAILABLE': return '#E0E5EC';
          default: return '#A0AEC0';
        }
      })
      .attr('stroke', (d: Node) => {
        switch (d.status) {
          case 'MASTERED': return '#059669';
          case 'IN_PROGRESS': return '#D97706';
          case 'AVAILABLE': return '#CBD5E0';
          default: return '#718096';
        }
      })
      .attr('stroke-width', 3)
      .style('filter', (d: Node) => 
        d.status === 'AVAILABLE' || d.status === 'IN_PROGRESS' 
          ? 'drop-shadow(4px 4px 8px rgba(163, 177, 198, 0.6))' 
          : 'none'
      );

    // Node labels
    nodeGroups
      .append('text')
      .text((d: Node) => d.title.substring(0, 10) + (d.title.length > 10 ? '...' : ''))
      .attr('text-anchor', 'middle')
      .attr('dy', nodeRadius + 20)
      .attr('font-size', '11px')
      .attr('fill', '#4A5568')
      .attr('font-weight', '500');

    // Click handler
    nodeGroups.on('click', (event: any, d: Node) => {
      if (d.status !== 'LOCKED') {
        window.location.href = `/learn/${d.id}`;
      }
    });

  }, [nodes, links, selectedLayer]);

  if (loading) {
    return (
      <div className="h-[500px] flex items-center justify-center">
        <div className="neu-convex p-6">
          <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const maxLayer = nodes.length > 0 ? Math.max(...nodes.map(n => n.layer)) : 3;
  const layers = Array.from({ length: maxLayer + 1 }, (_, i) => i);

  return (
    <div className="relative">
      {/* Layer Filters */}
      <div className="absolute top-0 right-0 z-10 flex items-center gap-2 bg-[#E0E5EC]/80 backdrop-blur-sm p-2 rounded-xl border border-white/50 shadow-sm">
        <Layers className="w-4 h-4 text-gray-500" />
        <span className="text-xs font-medium text-gray-500 mr-1">Layer:</span>
        <button
          onClick={() => setSelectedLayer('all')}
          className={`px-2 py-1 text-xs rounded-md transition-all ${
            selectedLayer === 'all' 
              ? 'bg-blue-500 text-white shadow-md' 
              : 'text-gray-600 hover:bg-gray-200'
          }`}
        >
          Tutti
        </button>
        {layers.map(layer => (
          <button
            key={layer}
            onClick={() => setSelectedLayer(layer)}
            className={`w-6 h-6 flex items-center justify-center text-xs rounded-md transition-all ${
              selectedLayer === layer
                ? 'bg-blue-500 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            {layer}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <svg
          ref={svgRef}
          width="100%"
          height="500"
          className="min-w-[800px]"
        />
      </div>
    </div>
  );
}
