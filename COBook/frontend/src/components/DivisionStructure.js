import React, { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

const DivisionStructure = ({ data }) => {
  const [expandedNodes, setExpandedNodes] = useState({});
  
  if (!data || data.length === 0) {
    return (
      <div className="text-gray-500 text-center py-8">
        No division structure information available. Please compile the code first.
      </div>
    );
  }
  
  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };
  
  const renderNode = (node, level = 0) => {
    const isExpanded = expandedNodes[node.id] !== false;
    const hasChildren = node.children && node.children.length > 0;
    
    return (
      <div key={node.id} className="select-none">
        <div
          className={`flex items-center py-1 px-2 hover:bg-gray-100 cursor-pointer rounded`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => hasChildren && toggleNode(node.id)}
        >
          {hasChildren && (
            isExpanded ? (
              <ChevronDown className="w-4 h-4 mr-1 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 mr-1 text-gray-500" />
            )
          )}
          
          <span className={`text-sm ${
            node.type === 'division' ? 'font-bold text-gray-900' :
            node.type === 'section' ? 'font-medium text-gray-800' :
            'text-gray-700'
          }`}>
            {node.name}
          </span>
          
          <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
            node.type === 'division' ? 'bg-indigo-100 text-indigo-800' :
            node.type === 'section' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {node.type}
          </span>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="border border-gray-200 rounded-md p-4">
      <div className="space-y-1">
        {data.map(node => renderNode(node))}
      </div>
    </div>
  );
};

export default DivisionStructure;
