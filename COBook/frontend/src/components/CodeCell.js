// frontend/src/components/CodeCell.js - Enhanced with inline VisualizationPanel

import React, { useState, useRef, useEffect } from 'react';
import {
  Play, Trash2, Plus, Terminal, Zap, BarChart3,
  ChevronDown, ChevronUp, Send, Copy, Check
} from 'lucide-react';
import VisualizationPanel from './VisualizationPanel';

const CodeCell = ({
  cell,
  index,
  onUpdateContent,
  onRunCell,
  onDeleteCell,
  onAddCell,
  onShowAIAssistant,
  onProvideInput
}) => {
  const [showOutput, setShowOutput] = useState(true);
  const [showVisualization, setShowVisualization] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [inputHistory, setInputHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef(null);
  const inputRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      onRunCell(cell.id);
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newContent = cell.content.substring(0, start) + '       ' + cell.content.substring(end);
      onUpdateContent(cell.id, newContent);
      setTimeout(() => {
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 7;
      }, 0);
    }
  };

  const handleInputSubmit = async () => {
    if (inputValue === null || inputValue === undefined) return;
    const newHistory = [...inputHistory, inputValue];
    setInputHistory(newHistory);
    setHistoryIndex(-1);
    try {
      await onProvideInput(cell.id, inputValue);
      setInputValue('');
    } catch (error) {
      console.error('Error providing input:', error);
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleInputSubmit();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (inputHistory.length > 0) {
        const newIndex = historyIndex < inputHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setInputValue(inputHistory[inputHistory.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInputValue(inputHistory[inputHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputValue('');
      }
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cell.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { }
  };

  useEffect(() => {
    if (cell.needsInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [cell.needsInput]);

  useEffect(() => {
    if (cell.output) setShowOutput(true);
  }, [cell.output]);

  const hasError = cell.output && (
    cell.output.includes('Compilation failed') ||
    cell.output.includes('error:') ||
    cell.output.includes('Connection Error')
  );

  return (
    <div className={`bg-white rounded-xl border transition-all group shadow-sm hover:shadow-md ${
      showVisualization ? 'border-indigo-400' : 'border-gray-200 hover:border-indigo-200'
    }`}>
      {/* Cell Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-1.5 rounded-md">
            <Terminal className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-500 font-semibold tracking-wider">COBOL</span>
            <div className="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              In [{index + 1}]
            </div>
          </div>
          {cell.isRunning && (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full animate-pulse">
              Running...
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Copy */}
          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-gray-200 rounded-md text-gray-500 transition-colors"
            title="Copy code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Run */}
          <button
            onClick={() => onRunCell(cell.id)}
            disabled={cell.isRunning}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-medium transition-colors disabled:opacity-50"
            title="Run cell (Shift+Enter)"
          >
            {cell.isRunning ? (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="w-3 h-3" />
            )}
            <span>Run</span>
          </button>

          {/* AI */}
          <button
            onClick={() => onShowAIAssistant(cell.id)}
            className="p-1.5 hover:bg-indigo-50 rounded-md text-indigo-600 transition-colors"
            title="AI Assistant"
          >
            <Zap className="w-3.5 h-3.5" />
          </button>

          {/* Visualize */}
          <button
            onClick={() => setShowVisualization(v => !v)}
            className={`p-1.5 rounded-md transition-colors ${
              showVisualization
                ? 'bg-indigo-100 text-indigo-700'
                : 'hover:bg-gray-100 text-gray-500'
            }`}
            title="Toggle visualizations"
          >
            <BarChart3 className="w-3.5 h-3.5" />
          </button>

          {/* Add below */}
          <button
            onClick={() => onAddCell('code', cell.id)}
            className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500 transition-colors"
            title="Add cell below"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* Delete */}
          <button
            onClick={() => onDeleteCell(cell.id)}
            className="p-1.5 hover:bg-red-50 rounded-md text-red-500 transition-colors"
            title="Delete cell"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Code Editor */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={cell.content}
          onChange={(e) => onUpdateContent(cell.id, e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full min-h-[280px] max-h-[600px] bg-gray-950 text-teal-300 font-mono text-sm p-4 outline-none resize-y leading-relaxed"
          spellCheck={false}
          style={{ tabSize: 7, fontFamily: '"Fira Code", "JetBrains Mono", "Cascadia Code", monospace' }}
          disabled={cell.isRunning}
          placeholder="Write COBOL code here... (Shift+Enter to run)"
        />
        <div className="absolute bottom-2 right-3 text-xs text-gray-600 font-mono select-none">
          {cell.content.split('\n').length} lines
        </div>
      </div>

      {/* Output */}
      {cell.output && (
        <div className="border-t border-gray-100">
          <div
            className="px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setShowOutput(s => !s)}
          >
            <div className="flex items-center gap-2">
              <div className={`p-1 rounded ${hasError ? 'bg-red-100' : 'bg-gray-100'}`}>
                <Terminal className={`w-3 h-3 ${hasError ? 'text-red-500' : 'text-gray-500'}`} />
              </div>
              <span className={`text-xs font-mono font-semibold ${hasError ? 'text-red-600' : 'text-gray-500'}`}>
                {hasError ? 'ERROR' : 'OUTPUT'}
              </span>
              {cell.needsInput && (
                <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium animate-pulse">
                  ⌨ Waiting for input
                </span>
              )}
            </div>
            {showOutput ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>

          {showOutput && (
            <div className="px-4 pb-4">
              <pre className={`text-sm font-mono whitespace-pre-wrap leading-relaxed ${
                hasError ? 'text-red-700' : 'text-gray-700'
              }`}>
                {cell.output}
              </pre>

              {/* Input box */}
              {cell.needsInput && (
                <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                    <p className="text-sm font-semibold text-indigo-900">
                      Program waiting for input
                    </p>
                  </div>
                  <p className="text-xs text-indigo-600 mb-3">
                    Type your response and press Enter or click Send
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleInputKeyDown}
                      placeholder="Type input here..."
                      className="flex-1 px-3 py-2 border border-indigo-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white"
                      autoFocus
                    />
                    <button
                      onClick={handleInputSubmit}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1.5 text-sm font-medium"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Send
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    ↑↓ arrow keys navigate input history
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Visualization Panel (inline) */}
      {showVisualization && (
        <div className="border-t border-indigo-100 px-4 pb-4">
          <VisualizationPanel
            code={cell.content}
            isVisible={showVisualization}
            onClose={() => setShowVisualization(false)}
          />
        </div>
      )}
    </div>
  );
};

export default CodeCell;
