// frontend/src/components/DataFlow.js - Fixed mermaid ID bug, edge syntax, and empty-data fallback

import React, { useEffect, useRef, useState } from 'react';

// ─── Pure SVG/HTML renderer (no mermaid dependency issues) ───────────────────
// We render the data flow ourselves so it always works, regardless of mermaid version.

const NODE_COLORS = {
  variable:  { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af', label: 'VAR' },
  process:   { bg: '#dcfce7', border: '#22c55e', text: '#166534', label: 'OP'  },
  input:     { bg: '#fef9c3', border: '#eab308', text: '#713f12', label: 'IN'  },
  output:    { bg: '#fae8ff', border: '#a855f7', text: '#6b21a8', label: 'OUT' },
  compute:   { bg: '#ffedd5', border: '#f97316', text: '#7c2d12', label: 'CALC'},
};

// Layout: variables on left (x=60), ops in center (x=340), outputs on right (x=620)
function layoutNodes(nodes) {
  const varNodes     = nodes.filter(n => n.type === 'variable');
  const processNodes = nodes.filter(n => n.type === 'process');
  const inputNodes   = nodes.filter(n => n.type === 'input');
  const outputNodes  = nodes.filter(n => n.type === 'output');
  const computeNodes = nodes.filter(n => n.type === 'compute');

  const placed = {};
  const GAP = 70;

  const place = (arr, x, startY) => {
    arr.forEach((n, i) => {
      placed[n.id] = { x, y: startY + i * GAP };
    });
  };

  place(varNodes,     80,  60);
  place(inputNodes,   80,  60 + varNodes.length * GAP + 20);
  place(processNodes, 340, 60);
  place(computeNodes, 340, 60 + processNodes.length * GAP + 20);
  place(outputNodes,  620, 60);

  const totalH = Math.max(
    (varNodes.length + inputNodes.length) * GAP,
    (processNodes.length + computeNodes.length) * GAP,
    outputNodes.length * GAP
  ) + 120;

  return { placed, totalH };
}

function truncate(str, n = 22) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}

const NODE_W = 160;
const NODE_H = 44;
const R = 8;

function DataFlowSVG({ nodes, edges }) {
  const { placed, totalH } = layoutNodes(nodes);
  const svgW = 760;
  const svgH = Math.max(totalH, 260);

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      width="100%"
      style={{ minHeight: 220, fontFamily: 'system-ui, sans-serif' }}
    >
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#6b7280" />
        </marker>
      </defs>

      {/* Edges */}
      {edges.map((edge, i) => {
        const src = placed[edge.source];
        const tgt = placed[edge.target];
        if (!src || !tgt) return null;

        const x1 = src.x + NODE_W;
        const y1 = src.y + NODE_H / 2;
        const x2 = tgt.x;
        const y2 = tgt.y + NODE_H / 2;
        const mx = (x1 + x2) / 2;

        return (
          <g key={i}>
            <path
              d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
              fill="none"
              stroke="#9ca3af"
              strokeWidth="1.5"
              markerEnd="url(#arrow)"
            />
            {edge.label && (
              <text
                x={mx}
                y={(y1 + y2) / 2 - 5}
                textAnchor="middle"
                fontSize="10"
                fill="#6b7280"
              >
                {edge.label}
              </text>
            )}
          </g>
        );
      })}

      {/* Nodes */}
      {nodes.map(node => {
        const pos = placed[node.id];
        if (!pos) return null;
        const c = NODE_COLORS[node.type] || NODE_COLORS.process;
        const lines = (node.label || '').split('\n');
        const line1 = truncate(lines[0], 20);
        const line2 = lines[1] ? truncate(lines[1], 20) : null;

        return (
          <g key={node.id}>
            <rect
              x={pos.x}
              y={pos.y}
              width={NODE_W}
              height={NODE_H}
              rx={R}
              fill={c.bg}
              stroke={c.border}
              strokeWidth="1.5"
            />
            {/* Badge */}
            <rect
              x={pos.x}
              y={pos.y}
              width={34}
              height={NODE_H}
              rx={R}
              fill={c.border}
            />
            <rect x={pos.x + 24} y={pos.y} width={10} height={NODE_H} fill={c.border} />
            <text
              x={pos.x + 17}
              y={pos.y + NODE_H / 2 + 4}
              textAnchor="middle"
              fontSize="9"
              fontWeight="bold"
              fill="white"
            >
              {c.label}
            </text>
            {/* Label */}
            <text
              x={pos.x + 44}
              y={line2 ? pos.y + NODE_H / 2 - 4 : pos.y + NODE_H / 2 + 4}
              fontSize="11"
              fontWeight="600"
              fill={c.text}
            >
              {line1}
            </text>
            {line2 && (
              <text x={pos.x + 44} y={pos.y + NODE_H / 2 + 10} fontSize="9" fill={c.text + 'cc'}>
                {line2}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Legend ──────────────────────────────────────────────────────────────────
function Legend() {
  const items = [
    { color: NODE_COLORS.variable,  label: 'Variable' },
    { color: NODE_COLORS.process,   label: 'MOVE op' },
    { color: NODE_COLORS.compute,   label: 'Compute' },
    { color: NODE_COLORS.input,     label: 'ACCEPT' },
    { color: NODE_COLORS.output,    label: 'DISPLAY' },
  ];
  return (
    <div className="flex flex-wrap gap-3 mb-3">
      {items.map(({ color, label }) => (
        <div key={label} className="flex items-center gap-1.5 text-xs text-gray-600">
          <div
            className="w-3 h-3 rounded-sm border"
            style={{ background: color.bg, borderColor: color.border }}
          />
          {label}
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const DataFlow = ({ data }) => {
  const hasData = data && data.nodes && data.nodes.length > 0;

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
        <p className="text-sm font-medium">No data flow data</p>
        <p className="text-xs mt-1">Click the visualization button on a code cell</p>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
        <p className="text-sm font-medium">No data flow detected</p>
        <p className="text-xs mt-1 text-center max-w-xs">
          Add variables in WORKING-STORAGE and use MOVE, COMPUTE, DISPLAY, or ACCEPT statements
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Legend />
      <div className="border border-gray-200 rounded-xl overflow-auto bg-gray-50 p-4" style={{ minHeight: 260 }}>
        <DataFlowSVG nodes={data.nodes} edges={data.edges} />
      </div>
      <p className="text-xs text-gray-400">
        {data.nodes.length} node{data.nodes.length !== 1 ? 's' : ''} · {(data.edges || []).length} edge{(data.edges || []).length !== 1 ? 's' : ''}
      </p>
    </div>
  );
};

export default DataFlow;
