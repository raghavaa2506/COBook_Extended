// frontend/src/components/VisualizationPanel.js - Enhanced with Data Dictionary tab

import React, { useState, useEffect, useCallback } from 'react';
import {
  X, BarChart3, GitBranch, Database, FileText, Play,
  RefreshCw, Table, ChevronDown
} from 'lucide-react';
import Flowchart from './Flowchart';
import DataFlow from './DataFlow';
import MemoryLayout from './MemoryLayout';
import DivisionStructure from './DivisionStructure';
import ExecutionAnimation from './ExecutionAnimation';
import DataDictionary from './DataDictionary';

const BACKEND = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const tabs = [
  { id: 'flowchart', name: 'Flowchart', icon: GitBranch, description: 'Control flow diagram' },
  { id: 'structure', name: 'Structure', icon: FileText, description: 'Division/section tree' },
  { id: 'dictionary', name: 'Data Dictionary', icon: Table, description: 'Variables & PIC clauses' },
  { id: 'dataflow', name: 'Data Flow', icon: BarChart3, description: 'Variable data flow' },
  { id: 'memory', name: 'Memory', icon: Database, description: 'Memory layout' },
  { id: 'execution', name: 'Execution', icon: Play, description: 'Step-by-step trace' },
];

const VisualizationPanel = ({ code, isVisible, onClose }) => {
  const [activeTab, setActiveTab] = useState('flowchart');
  const [isLoading, setIsLoading] = useState(false);
  const [loadedTabs, setLoadedTabs] = useState(new Set());
  const [data, setData] = useState({
    flowchart: null,
    dataflow: null,
    memoryLayout: null,
    divisionStructure: null,
    executionTrace: null,
    dataDictionary: null,
  });
  const [errors, setErrors] = useState({});

  const fetchTab = useCallback(async (tabId, force = false) => {
    if (!code) return;
    if (loadedTabs.has(tabId) && !force) return;

    const endpointMap = {
      flowchart: 'flowchart',
      dataflow: 'dataflow',
      memory: 'memory',
      structure: 'structure',
      execution: 'trace',
      dictionary: 'datadictionary',
    };

    const endpoint = endpointMap[tabId];
    if (!endpoint) return;

    setIsLoading(true);
    try {
      const resp = await fetch(`${BACKEND}/api/visualization/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const result = await resp.json();

      setData(prev => {
        const keyMap = {
          flowchart: 'flowchart',
          dataflow: 'dataflow',
          memory: 'memoryLayout',
          structure: 'divisionStructure',
          execution: 'executionTrace',
          dictionary: 'dataDictionary',
        };
        const resultKeyMap = {
          flowchart: 'flowchart',
          dataflow: 'dataflow',
          memory: 'memoryLayout',
          structure: 'structure',
          execution: 'trace',
          dictionary: 'dictionary',
        };

        return { ...prev, [keyMap[tabId]]: result[resultKeyMap[tabId]] || null };
      });

      setLoadedTabs(prev => new Set([...prev, tabId]));
      setErrors(prev => { const n = { ...prev }; delete n[tabId]; return n; });
    } catch (err) {
      console.error(`Error loading ${tabId}:`, err);
      setErrors(prev => ({ ...prev, [tabId]: err.message }));
    } finally {
      setIsLoading(false);
    }
  }, [code, loadedTabs]);

  // Load active tab when visibility or tab changes
  useEffect(() => {
    if (isVisible && code) {
      fetchTab(activeTab);
    }
  }, [isVisible, activeTab, code]);

  // Reset when code changes
  useEffect(() => {
    setLoadedTabs(new Set());
    setData({
      flowchart: null, dataflow: null, memoryLayout: null,
      divisionStructure: null, executionTrace: null, dataDictionary: null,
    });
    setErrors({});
  }, [code]);

  const handleRefresh = () => {
    setLoadedTabs(prev => {
      const n = new Set(prev);
      n.delete(activeTab);
      return n;
    });
    fetchTab(activeTab, true);
  };

  if (!isVisible) return null;

  const activeData = {
    flowchart: data.flowchart,
    dataflow: data.dataflow,
    memory: data.memoryLayout,
    structure: data.divisionStructure,
    execution: data.executionTrace,
    dictionary: data.dataDictionary,
  }[activeTab];

  const activeError = errors[activeTab];
  const isTabLoaded = loadedTabs.has(activeTab);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden mt-3">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-indigo-600 to-violet-600">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-white" />
          <span className="text-sm font-semibold text-white">Program Visualizations</span>
          <span className="ml-2 bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
            {tabs.find(t => t.id === activeTab)?.description}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex overflow-x-auto border-b border-gray-200 bg-gray-50 px-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const hasError = !!errors[tab.id];
          const isLoaded = loadedTabs.has(tab.id);

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-indigo-500 text-indigo-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              } ${hasError ? 'text-red-400' : ''}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.name}</span>
              {isLoaded && !hasError && (
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
              )}
              {hasError && (
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Panel Content */}
      <div className="p-5" style={{ minHeight: '380px' }}>
        {isLoading && !isTabLoaded ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm">Analyzing COBOL program...</p>
          </div>
        ) : activeError ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md text-center">
              <p className="text-red-600 font-medium text-sm mb-2">Visualization Error</p>
              <p className="text-red-500 text-xs">{activeError}</p>
              <button
                onClick={handleRefresh}
                className="mt-3 px-4 py-2 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'flowchart' && (
              <div>
                {data.flowchart?.nodes && (
                  <p className="text-xs text-gray-400 mb-2">
                    {data.flowchart.nodes.length} nodes · {data.flowchart.edges?.length || 0} edges
                  </p>
                )}
                <Flowchart data={data.flowchart} />
              </div>
            )}
            {activeTab === 'dataflow' && <DataFlow data={data.dataflow} />}
            {activeTab === 'memory' && <MemoryLayout data={data.memoryLayout} />}
            {activeTab === 'structure' && <DivisionStructure data={data.divisionStructure} />}
            {activeTab === 'execution' && <ExecutionAnimation data={data.executionTrace} />}
            {activeTab === 'dictionary' && <DataDictionary data={data.dataDictionary} />}
          </>
        )}
      </div>
    </div>
  );
};

export default VisualizationPanel;
