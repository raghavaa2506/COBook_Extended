// frontend/src/components/Flowchart.js
import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

const Flowchart = ({ data }) => {
  const chartRef = useRef(null);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (data && chartRef.current && data.nodes && data.nodes.length > 0) {
      console.log('Flowchart data received:', data);
      setError(null);
      
      // Generate Mermaid syntax from flowchart data
      let mermaidSyntax = 'graph TD;\n';
      
      // Add nodes with proper syntax
      data.nodes.forEach(node => {
        let nodeShape = '(';
        let nodeEnd = ')';
        let nodeId = node.id;
        
        // Handle reserved keywords and ensure valid IDs
        if (node.id === 'start' || node.id === 'node_start') {
          nodeId = 'node_start';
        } else if (node.id === 'end' || node.id === 'node_end') {
          nodeId = 'node_end';
        }
        
        // Set node shape based on type
        if (node.type === 'start' || node.type === 'end') {
          nodeShape = '(';
          nodeEnd = ')';
        } else if (node.type === 'decision') {
          nodeShape = '{';
          nodeEnd = '}';
        } else if (node.type === 'output') {
          nodeShape = '>';
          nodeEnd = ']';
        } else {
          nodeShape = '[';
          nodeEnd = ']';
        }
        
        // Clean and escape the label
        let cleanLabel = (node.label || '').toString();
        cleanLabel = cleanLabel.replace(/"/g, '&quot;').replace(/\n/g, ' ');
        
        // Truncate very long labels
        if (cleanLabel.length > 30) {
          cleanLabel = cleanLabel.substring(0, 27) + '...';
        }
        
        mermaidSyntax += `  ${nodeId}${nodeShape}"${cleanLabel}"${nodeEnd};\n`;
      });
      
      // Add edges
      data.edges.forEach(edge => {
        let sourceId = edge.source;
        let targetId = edge.target;
        
        // Handle reserved keywords
        if (edge.source === 'start' || edge.source === 'node_start') {
          sourceId = 'node_start';
        } else if (edge.source === 'end' || edge.source === 'node_end') {
          sourceId = 'node_end';
        }
        
        if (edge.target === 'start' || edge.target === 'node_start') {
          targetId = 'node_start';
        } else if (edge.target === 'end' || edge.target === 'node_end') {
          targetId = 'node_end';
        }
        
        if (edge.label && edge.label.trim()) {
          const cleanLabel = edge.label.replace(/"/g, '&quot;');
          mermaidSyntax += `  ${sourceId} -->|"${cleanLabel}" ${targetId};\n`;
        } else {
          mermaidSyntax += `  ${sourceId} --> ${targetId};\n`;
        }
      });
      
      console.log('Generated Mermaid syntax:', mermaidSyntax);
      
      // Initialize Mermaid with proper configuration
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        themeVariables: {
          primaryColor: '#f3f4f6',
          primaryTextColor: '#1f2937',
          primaryBorderColor: '#d1d5db',
          lineColor: '#6b7280',
          secondaryColor: '#e5e7eb',
          tertiaryColor: '#f9fafb',
          background: '#ffffff',
          mainBkg: '#f3f4f6',
          secondBkg: '#e5e7eb',
          tertiaryColor: '#f9fafb'
        },
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'basis'
        }
      });
      
      // Render the chart
      const renderChart = async () => {
        try {
          // Clear previous content
          if (chartRef.current) {
            chartRef.current.innerHTML = '';
          }
          
          // Generate unique ID for this render
          const uniqueId = `flowchart-${Date.now()}`;
          
          const { svg } = await mermaid.render(uniqueId, mermaidSyntax);
          
          if (chartRef.current) {
            chartRef.current.innerHTML = svg;
            
            // Add some styling to the SVG
            const svgElement = chartRef.current.querySelector('svg');
            if (svgElement) {
              svgElement.style.maxWidth = '100%';
              svgElement.style.height = 'auto';
              svgElement.style.minHeight = '300px';
            }
          }
        } catch (error) {
          console.error('Error rendering flowchart:', error);
          setError(error.message);
          
          if (chartRef.current) {
            chartRef.current.innerHTML = `
              <div class="text-red-500 p-4 border border-red-200 rounded-md bg-red-50">
                <p class="font-semibold">Error rendering flowchart:</p>
                <p class="text-sm mt-1">${error.message}</p>
                <details class="mt-2">
                  <summary class="cursor-pointer text-sm font-medium">Show Mermaid syntax</summary>
                  <pre class="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto whitespace-pre-wrap">${mermaidSyntax}</pre>
                </details>
              </div>
            `;
          }
        }
      };
      
      renderChart();
    } else if (data && (!data.nodes || data.nodes.length === 0)) {
      // Handle empty data
      if (chartRef.current) {
        chartRef.current.innerHTML = `
          <div class="text-gray-500 text-center py-8">
            <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p class="text-sm">No flowchart data available</p>
            <p class="text-xs mt-1">Try running a more complex COBOL program</p>
          </div>
        `;
      }
    }
  }, [data]);
  
  return (
    <div className="w-full h-96 overflow-auto border border-gray-200 rounded-md p-4 bg-gray-50">
      <div ref={chartRef} className="flex justify-center items-center min-h-full">
        {!data ? (
          <div className="text-gray-500 text-center py-8">
            <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p class="text-sm">No flowchart data available</p>
            <p class="text-xs mt-1">Run the code first to generate visualizations</p>
          </div>
        ) : (
          <div class="w-full"></div>
        )}
      </div>
    </div>
  );
};

export default Flowchart;
