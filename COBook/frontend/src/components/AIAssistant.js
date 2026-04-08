// frontend/src/components/AIAssistant.js - Enhanced with Explain Error + PIC features

import React, { useState } from 'react';
import {
  X, Sparkles, Code, FileText, Bug, ArrowRight,
  FileJson, Hash, AlertCircle, Lightbulb
} from 'lucide-react';

const features = [
  {
    id: 'generate',
    name: 'Generate Code',
    icon: Code,
    color: 'indigo',
    description: 'Generate COBOL code from a natural language description',
    placeholder: 'e.g., "Create a COBOL program that reads a file and calculates total sales"',
    hint: null
  },
  {
    id: 'explain',
    name: 'Explain Code',
    icon: FileText,
    color: 'blue',
    description: 'Get a plain English explanation of the selected COBOL code',
    placeholder: 'e.g., "What does this PERFORM loop do?" or "Explain this code"',
    hint: 'The code from the selected cell will be automatically included as context.'
  },
  {
    id: 'explain-error',
    name: 'Explain Error',
    icon: AlertCircle,
    color: 'red',
    description: 'Get a beginner-friendly explanation of a GnuCOBOL compilation error',
    placeholder: 'Paste the error message here, or just say "explain the error"',
    hint: 'The compilation error output from the selected cell will be included.'
  },
  {
    id: 'fix',
    name: 'Fix Error',
    icon: Bug,
    color: 'orange',
    description: 'Let AI fix the compilation error and return corrected COBOL code',
    placeholder: 'Describe the error or say "fix this"',
    hint: 'The error output from the selected cell will be included.'
  },
  {
    id: 'summarize',
    name: 'Summarize',
    icon: FileJson,
    color: 'purple',
    description: 'Get a one-paragraph business summary of the entire COBOL program',
    placeholder: 'e.g., "What does this program do?" or "Summarize for a business analyst"',
    hint: 'All code cells in the notebook will be analyzed.'
  },
  {
    id: 'convert',
    name: 'Convert to Python',
    icon: ArrowRight,
    color: 'green',
    description: 'Convert the selected COBOL code to equivalent Python',
    placeholder: 'e.g., "Convert this to Python" or "Show me the Python equivalent"',
    hint: 'The code from the selected cell will be converted.'
  },
];

const colorStyles = {
  indigo: {
    tab: 'bg-indigo-100 text-indigo-700 border-indigo-300',
    hint: 'bg-indigo-50 border-indigo-200 text-indigo-800',
    btn: 'bg-indigo-600 hover:bg-indigo-700',
    icon: 'text-indigo-600',
    badge: 'bg-indigo-100'
  },
  blue: {
    tab: 'bg-blue-100 text-blue-700 border-blue-300',
    hint: 'bg-blue-50 border-blue-200 text-blue-800',
    btn: 'bg-blue-600 hover:bg-blue-700',
    icon: 'text-blue-600',
    badge: 'bg-blue-100'
  },
  red: {
    tab: 'bg-red-100 text-red-700 border-red-300',
    hint: 'bg-red-50 border-red-200 text-red-800',
    btn: 'bg-red-600 hover:bg-red-700',
    icon: 'text-red-600',
    badge: 'bg-red-100'
  },
  orange: {
    tab: 'bg-orange-100 text-orange-700 border-orange-300',
    hint: 'bg-orange-50 border-orange-200 text-orange-800',
    btn: 'bg-orange-600 hover:bg-orange-700',
    icon: 'text-orange-600',
    badge: 'bg-orange-100'
  },
  purple: {
    tab: 'bg-purple-100 text-purple-700 border-purple-300',
    hint: 'bg-purple-50 border-purple-200 text-purple-800',
    btn: 'bg-purple-600 hover:bg-purple-700',
    icon: 'text-purple-600',
    badge: 'bg-purple-100'
  },
  green: {
    tab: 'bg-green-100 text-green-700 border-green-300',
    hint: 'bg-green-50 border-green-200 text-green-800',
    btn: 'bg-green-600 hover:bg-green-700',
    icon: 'text-green-600',
    badge: 'bg-green-100'
  },
};

const AIAssistant = ({
  isVisible,
  onClose,
  selectedCell,
  onGenerateCode,
  onExplainCode,
  onFixError,
  onConvertToPython,
  onSummarizeProgram,
  onExplainError,
}) => {
  const [activeFeature, setActiveFeature] = useState('generate');
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const feature = features.find(f => f.id === activeFeature);
  const colors = colorStyles[feature?.color || 'indigo'];

  const handleSubmit = async () => {
    const p = prompt.trim();
    if (!p) return;

    setIsLoading(true);
    setLastResult(null);

    try {
      switch (activeFeature) {
        case 'generate': await onGenerateCode(p); break;
        case 'explain': await onExplainCode(p); break;
        case 'explain-error': await (onExplainError || onExplainCode)(p); break;
        case 'fix': await onFixError(p); break;
        case 'convert': await onConvertToPython(p); break;
        case 'summarize': await onSummarizeProgram(p); break;
      }
      setPrompt('');
      onClose();
    } catch (error) {
      setLastResult({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-600 to-violet-600">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">AI Assistant</h2>
              <p className="text-xs text-white/70">Powered by Groq · Llama 3.3 70B</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feature Tabs */}
        <div className="flex overflow-x-auto gap-1 px-4 py-3 border-b border-gray-100 bg-gray-50">
          {features.map(f => {
            const Icon = f.icon;
            const c = colorStyles[f.color];
            const isActive = activeFeature === f.id;
            return (
              <button
                key={f.id}
                onClick={() => { setActiveFeature(f.id); setLastResult(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap border ${
                  isActive
                    ? `${c.tab} border-current`
                    : 'text-gray-500 bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {f.name}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-800 mb-1">{feature?.description}</p>
            {feature?.hint && (
              <div className={`flex items-start gap-2 p-3 rounded-lg border text-xs mt-2 ${colors.hint}`}>
                <Lightbulb className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{feature.hint}</span>
              </div>
            )}
          </div>

          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={feature?.placeholder || 'Enter your prompt...'}
            className="w-full h-36 border border-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none bg-gray-50 font-mono placeholder:font-sans placeholder:text-gray-400"
            disabled={isLoading}
          />
          <p className="text-xs text-gray-400 mt-1">Ctrl+Enter to submit</p>

          {lastResult?.type === 'error' && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-red-700">Error</p>
                <p className="text-xs text-red-600 mt-0.5">{lastResult.message}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            {selectedCell ? `Selected cell #${selectedCell}` : 'No cell selected'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading || !prompt.trim()}
              className={`px-5 py-2 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${colors.btn}`}
            >
              <Sparkles className="w-4 h-4" />
              {isLoading ? 'Processing...' : 'Generate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
