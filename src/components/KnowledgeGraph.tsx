'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as d3 from 'd3';
import { Layers, Info, Play } from 'lucide-react';

interface Node extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  layer: number;
  status: 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'MASTERED';
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
}

export default function KnowledgeGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLayer, setSelectedLayer] = useState<number | 'all'>('all');
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);

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

    const width = containerRef.current?.clientWidth || 800;
    const height = 600;
    const nodeRadius = 30;

    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    svg.selectAll('*').remove();

    // Create a container for the graph to handle zoom/pan
    const g = svg.append('g');

    // Filter nodes for simulation to keep it tidy if filtered
    const simulationNodes = nodes.map(d => ({ ...d }));
    const simulationLinks = links.map(d => ({ ...d }));

    const layerCount = Math.max(...nodes.map(n => n.layer)) + 1;
    const layerSpacing = height / (layerCount + 1);

    const simulation = d3.forceSimulation<Node>(simulationNodes)
      .force('link', d3.forceLink<Node, Link>(simulationLinks).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(nodeRadius * 1.5))
      .force('y', d3.forceY<Node>(d => (d.layer + 1) * layerSpacing).strength(2))
      .force('x', d3.forceX(width / 2).strength(0.1));

    // Draw links
    const linkElements = g.append('g')
      .selectAll('line')
      .data(simulationLinks)
      .enter()
      .append('line')
      .attr('stroke', '#CBD5E0')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', (d: any) => d.status === 'LOCKED' ? '5,5' : '0')
      .attr('opacity', 0.6);

    // Draw nodes
    const nodeGroups = g.append('g')
      .selectAll('g')
      .data(simulationNodes)
      .enter()
      .append('g')
      .style('cursor', 'pointer')
      .on('mouseenter', (event, d) => setHoveredNode(d))
      .on('mouseleave', () => setHoveredNode(null))
      .on('click', (event, d) => {
        if (d.status !== 'LOCKED') {
          window.location.href = `/learn/${d.id}`;
        }
      });

    // Outer glow for active/mastered nodes
    nodeGroups.append('circle')
      .attr('r', nodeRadius + 4)
      .attr('fill', 'white')
      .attr('opacity', 0)
      .attr('class', 'node-glow');

    // Main circle
    nodeGroups.append('circle')
      .attr('r', nodeRadius)
      .attr('class', 'neu-circle')
      .attr('fill', (d: Node) => {
        if (d.status === 'MASTERED') return '#10B981';
        if (d.status === 'IN_PROGRESS') return '#F59E0B';
        if (d.status === 'AVAILABLE') return '#FFFFFF';
        return '#E2E8F0';
      })
      .attr('stroke', (d: Node) => {
        if (d.status === 'MASTERED') return '#059669';
        if (d.status === 'IN_PROGRESS') return '#D97706';
        if (d.status === 'AVAILABLE') return '#3B82F6';
        return '#CBD5E0';
      })
      .attr('stroke-width', 3)
      .style('filter', 'drop-shadow(2px 2px 4px rgba(0,0,0,0.1))');

    // Icon/Text inside node
    nodeGroups.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.3em')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('fill', (d: Node) => d.status === 'AVAILABLE' ? '#3B82F6' : 'white')
      .text((d: Node) => d.title.substring(0, 2).toUpperCase());

    // Label below node
    nodeGroups.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', nodeRadius + 20)
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('fill', '#4A5568')
      .text((d: Node) => d.title);

    simulation.on('tick', () => {
      linkElements
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      nodeGroups
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
      
      // Keep nodes within bounds
      simulationNodes.forEach(d => {
        d.x = Math.max(nodeRadius, Math.min(width - nodeRadius, d.x!));
        d.y = Math.max(nodeRadius, Math.min(height - nodeRadius, d.y!));
      });
    });

    // Drag functionality
    nodeGroups.call(d3.drag<SVGGElement, Node>()
      .on('start', (event) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      })
      .on('drag', (event) => {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      })
      .on('end', (event) => {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }) as any);

    // Zoom functionality
    svg.call(d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 2])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      }));

  }, [nodes, links, selectedLayer]);

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
      {/* Tooltip */}
      <AnimatePresence>
        {hoveredNode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute top-4 left-4 z-20 neu-flat p-4 max-w-xs pointer-events-none"
          >
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                hoveredNode.status === 'MASTERED' ? 'bg-green-500' : 
                hoveredNode.status === 'IN_PROGRESS' ? 'bg-yellow-500' : 'bg-blue-500'
              }`} />
              {hoveredNode.title}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Layer {hoveredNode.layer} • Status: {hoveredNode.status}
            </p>
            {hoveredNode.status !== 'LOCKED' && (
              <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-blue-600 uppercase">
                <Play className="w-3 h-3" /> Clicca per iniziare
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
        <div className="neu-flat p-2 flex flex-col gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" /> Mastered
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" /> In Corso
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border-2 border-blue-500 bg-white" /> Disponibile
          </div>
        </div>
      </div>

      <svg
        ref={svgRef}
        className="w-full h-[600px] rounded-2xl touch-none"
      />
    </div>
  );
}
