// frontend/src/App.js - Enhanced with onExplainError and all new features

import React, { useState } from 'react';
import {
  Play, Plus, Trash2, Save, Upload, Code, FileText,
  Users, PlayCircle, Edit3, Braces, Zap, BookOpen
} from 'lucide-react';
import CodeCell from './components/CodeCell';
import TextCell from './components/TextCell';
import AIAssistant from './components/AIAssistant';

const BACKEND = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

// ─── Default starter cells ────────────────────────────────────────────────────
const STARTER_CELLS = [
  {
    id: 1,
    type: 'text',
    content: `<h1>Welcome to COBook</h1>
<p>An <strong>interactive COBOL notebook</strong> for program comprehension — combining code execution, visualization, and AI explanation in one tool.</p>
<ul>
<li>📝 Write and execute COBOL programs (GnuCOBOL)</li>
<li>📊 Visualize control flow, data flow, memory layout, and division structure</li>
<li>📚 Browse the Data Dictionary with PIC clause decoder</li>
<li>🤖 AI-powered code explanation, error fixing, and summarization</li>
<li>🔄 Interactive I/O support (ACCEPT statements)</li>
</ul>
<p>Click the <strong>▶ Run</strong> button on a code cell, or press <strong>Shift+Enter</strong>. Click <strong>📊</strong> to open visualizations.</p>`,
    output: '',
    isRunning: false,
    needsInput: false,
    sessionId: null
  },
  {
    id: 2,
    type: 'code',
    content: `       IDENTIFICATION DIVISION.
       PROGRAM-ID. WelcomeDemo.

       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01 WS-COUNTER    PIC 9(3) VALUE 0.
       01 WS-MAX        PIC 9(3) VALUE 5.
       01 WS-MESSAGE    PIC X(50).

       PROCEDURE DIVISION.
           MOVE 'Starting COBook demo...' TO WS-MESSAGE.
           DISPLAY WS-MESSAGE.

           PERFORM VARYING WS-COUNTER FROM 1 BY 1
               UNTIL WS-COUNTER > WS-MAX
               DISPLAY 'Step ' WS-COUNTER ' of ' WS-MAX
           END-PERFORM.

           DISPLAY '=== Demo Complete! ==='.
           DISPLAY 'Click the chart icon to see visualizations.'.
           STOP RUN.`,
    output: '',
    isRunning: false,
    needsInput: false,
    sessionId: null
  }
];

// ─── COBook App ───────────────────────────────────────────────────────────────
const COBook = () => {
  const [cells, setCells] = useState(STARTER_CELLS);
  const [nextId, setNextId] = useState(3);
  const [notebookName, setNotebookName] = useState('Untitled Notebook');
  const [isEditingName, setIsEditingName] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [comments, setComments] = useState({});

  // ── Cell management ──────────────────────────────────────────────────────────
  const addCell = (type = 'code', afterId = null) => {
    const newCell = {
      id: nextId,
      type,
      content: type === 'code'
        ? `       IDENTIFICATION DIVISION.\n       PROGRAM-ID. Program${nextId}.\n       PROCEDURE DIVISION.\n           DISPLAY 'New COBOL Program'.\n           STOP RUN.`
        : '<h2>New Section</h2><p>Click to edit...</p>',
      output: '',
      isRunning: false,
      needsInput: false,
      sessionId: null
    };

    if (afterId !== null) {
      const idx = cells.findIndex(c => c.id === afterId);
      const newCells = [...cells];
      newCells.splice(idx + 1, 0, newCell);
      setCells(newCells);
    } else {
      setCells(prev => [...prev, newCell]);
    }
    setNextId(n => n + 1);
  };

  const deleteCell = (id) => {
    if (cells.length > 1) setCells(prev => prev.filter(c => c.id !== id));
  };

  const updateContent = (id, newContent) => {
    setCells(prev => prev.map(c => c.id === id && c.content !== newContent ? { ...c, content: newContent } : c));
  };

  // ── Execution ─────────────────────────────────────────────────────────────────
  const runCell = async (id) => {
    const cell = cells.find(c => c.id === id);
    if (!cell || cell.type !== 'code') return;

    setCells(prev => prev.map(c => c.id === id ? {
      ...c, isRunning: true, output: 'Compiling...', needsInput: false, sessionId: null
    } : c));

    try {
      const resp = await fetch(`${BACKEND}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cell.content, cellId: id })
      });
      const data = await resp.json();

      let output = `GnuCOBOL Compiler v3.2.0\n`;
      if (data.success) {
        output += `Compilation successful\n\n${'─'.repeat(50)}\nProgram Output:\n${'─'.repeat(50)}\n${data.output}`;
        if (data.needsInput) {
          output += `\n${'─'.repeat(50)}`;
          setCells(prev => prev.map(c => c.id === id ? {
            ...c, isRunning: false, output, needsInput: true, sessionId: data.sessionId
          } : c));
          return;
        }
        output += `\n${'─'.repeat(50)}\n\nExecution time: ${data.executionTime}ms\nExit code: 0`;
      } else {
        output += `Compilation failed\n\n${data.error}`;
      }

      setCells(prev => prev.map(c => c.id === id ? {
        ...c, isRunning: false, output, needsInput: false, sessionId: null
      } : c));
    } catch (err) {
      setCells(prev => prev.map(c => c.id === id ? {
        ...c, isRunning: false,
        output: `Connection Error\n\nCouldn't reach backend: ${BACKEND}\n\nError: ${err.message}`,
        needsInput: false, sessionId: null
      } : c));
    }
  };

  const provideInputToCell = async (cellId, input) => {
    const cell = cells.find(c => c.id === cellId);
    if (!cell || !cell.sessionId) return;

    setCells(prev => prev.map(c => c.id === cellId ? {
      ...c, output: c.output + `${input}\n`, needsInput: false
    } : c));

    try {
      const resp = await fetch(`${BACKEND}/api/provide-input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cellId, sessionId: cell.sessionId, input })
      });
      const data = await resp.json();

      if (data.success) {
        const newOutput = data.output || cell.output;
        if (data.needsInput) {
          setCells(prev => prev.map(c => c.id === cellId ? {
            ...c, output: newOutput + `\n${'─'.repeat(50)}`, needsInput: true, sessionId: data.sessionId
          } : c));
        } else {
          setCells(prev => prev.map(c => c.id === cellId ? {
            ...c, output: newOutput + `\n${'─'.repeat(50)}\n\nProgram completed\nExit code: 0`,
            needsInput: false, sessionId: null
          } : c));
        }
      } else {
        setCells(prev => prev.map(c => c.id === cellId ? {
          ...c,
          output: (data.output || cell.output) + `\n\n❌ Error: ${data.error || 'Unknown error'}`,
          needsInput: false, sessionId: null
        } : c));
      }
    } catch (err) {
      setCells(prev => prev.map(c => c.id === cellId ? {
        ...c, output: c.output + `\n\n❌ Error: ${err.message}`, needsInput: false, sessionId: null
      } : c));
    }
  };

  const runAllCells = async () => {
    for (const cell of cells) {
      if (cell.type === 'code') {
        await runCell(cell.id);
        await new Promise(r => setTimeout(r, 600));
      }
    }
  };

  // ── AI Features ───────────────────────────────────────────────────────────────
  const aiRequest = async (feature, prompt, contextGetter) => {
    const context = contextGetter ? contextGetter() : '';
    const resp = await fetch(`${BACKEND}/api/ai-assist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, context, cellType: 'code', feature })
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (!data.success) throw new Error(data.error || 'AI request failed');
    return data;
  };

  const appendCell = (newCell) => {
    setCells(prev => [...prev, newCell]);
    setNextId(n => n + 1);
  };

  const insertCellAfter = (afterId, newCell) => {
    setCells(prev => {
      const idx = prev.findIndex(c => c.id === afterId);
      const next = [...prev];
      next.splice(idx + 1, 0, newCell);
      return next;
    });
    setNextId(n => n + 1);
  };

  const handleGenerateCode = async (prompt) => {
    const data = await aiRequest('generate', prompt, null);
    appendCell({
      id: nextId, type: 'code',
      content: data.generatedCode || data.suggestion,
      output: '', isRunning: false, needsInput: false, sessionId: null
    });
  };

  const handleExplainCode = async (prompt) => {
    const cell = cells.find(c => c.id === selectedCell);
    const data = await aiRequest('explain', prompt, () => cell?.content || '');
    insertCellAfter(selectedCell || cells[cells.length - 1].id, {
      id: nextId, type: 'text',
      content: `<h2>🤖 Code Explanation</h2><p>${(data.suggestion || '').replace(/\n/g, '<br>')}</p>`,
      output: '', isRunning: false, needsInput: false, sessionId: null
    });
  };

  const handleExplainError = async (prompt) => {
    const cell = cells.find(c => c.id === selectedCell);
    const data = await aiRequest('explain-error', prompt, () => cell?.output || '');
    insertCellAfter(selectedCell || cells[cells.length - 1].id, {
      id: nextId, type: 'text',
      content: `<h2>🔍 Error Explanation</h2><p>${(data.suggestion || '').replace(/\n/g, '<br>')}</p>`,
      output: '', isRunning: false, needsInput: false, sessionId: null
    });
  };

  const handleFixError = async (prompt) => {
    const cell = cells.find(c => c.id === selectedCell);
    const data = await aiRequest('fix', prompt, () => cell?.output || '');
    setCells(prev => prev.map(c => c.id === selectedCell
      ? { ...c, content: data.generatedCode || data.suggestion }
      : c
    ));
  };

  const handleConvertToPython = async (prompt) => {
    const cell = cells.find(c => c.id === selectedCell);
    const data = await aiRequest('convert', prompt, () => cell?.content || '');
    insertCellAfter(selectedCell || cells[cells.length - 1].id, {
      id: nextId, type: 'text',
      content: `<h2>🐍 Python Equivalent</h2><pre style="background:#f6f8fa;padding:12px;border-radius:6px;font-size:13px;overflow-x:auto"><code>${(data.generatedCode || data.suggestion || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`,
      output: '', isRunning: false, needsInput: false, sessionId: null
    });
  };

  const handleSummarizeProgram = async (prompt) => {
    const codeCells = cells.filter(c => c.type === 'code');
    const combined = codeCells.map(c => c.content).join('\n\n');
    const data = await aiRequest('summarize', prompt, () => combined);
    appendCell({
      id: nextId, type: 'text',
      content: `<h2>📋 Program Summary</h2><p>${(data.suggestion || '').replace(/\n/g, '<br>')}</p>`,
      output: '', isRunning: false, needsInput: false, sessionId: null
    });
  };

  // ── Comments ──────────────────────────────────────────────────────────────────
  const addComment = (cellId, comment) => {
    setComments(prev => ({
      ...prev,
      [cellId]: [...(prev[cellId] || []), {
        id: Date.now(), user: 'You', text: comment,
        timestamp: new Date().toLocaleTimeString()
      }]
    }));
  };

  const toggleComments = (cellId) => {
    // handled inside TextCell
  };

  // ── Save/Load ─────────────────────────────────────────────────────────────────
  const saveNotebook = () => {
    const notebook = { name: notebookName, cells, comments, version: '1.0' };
    const blob = new Blob([JSON.stringify(notebook, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${notebookName.replace(/\s+/g, '_')}.cobook`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadNotebook = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const nb = JSON.parse(ev.target.result);
        setNotebookName(nb.name || 'Loaded Notebook');
        setCells(nb.cells || []);
        setComments(nb.comments || {});
        const maxId = Math.max(...(nb.cells || []).map(c => c.id), 0);
        setNextId(maxId + 1);
      } catch {
        alert('Error loading notebook file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Logo + Name */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5">
                <div className="bg-indigo-600 p-2 rounded-lg shadow-sm">
                  <Code className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-1300 tracking-tight">COBook</span>
                <span className="hidden sm:block text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full"> 
                </span>
              </div>

              {isEditingName ? (
                <input
                  type="text"
                  value={notebookName}
                  onChange={e => setNotebookName(e.target.value)}
                  onBlur={() => setIsEditingName(false)}
                  onKeyDown={e => e.key === 'Enter' && setIsEditingName(false)}
                  className="text-sm text-gray-700 border-b-2 border-indigo-500 outline-none px-2 py-0.5 bg-transparent min-w-[160px]"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => setIsEditingName(true)}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-100 px-2 py-1 rounded-md transition-colors"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>{notebookName}</span>
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAIAssistant(true)}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                <Zap className="w-4 h-4" />
                <span className="hidden sm:block">AI Assist</span>
              </button>
              <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-3 py-2">
                <Users className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs font-medium text-gray-600">1</span>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100 flex-wrap">
            <button
              onClick={() => addCell('code')}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 px-3 py-1.5 rounded-md transition-colors"
            >
              <Braces className="w-3.5 h-3.5 text-indigo-500" />
              Code Cell
              <Plus className="w-3 h-3" />
            </button>

            <button
              onClick={() => addCell('text')}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:bg-green-50 hover:text-green-700 px-3 py-1.5 rounded-md transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-green-500" />
              Text Cell
              <Plus className="w-3 h-3" />
            </button>

            <div className="w-px h-5 bg-gray-200 mx-1" />

            <button
              onClick={runAllCells}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 px-3 py-1.5 rounded-md transition-colors"
            >
              <PlayCircle className="w-3.5 h-3.5 text-blue-500" />
              Run All
            </button>

            <div className="w-px h-5 bg-gray-200 mx-1" />

            <button
              onClick={saveNotebook}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:bg-amber-50 hover:text-amber-700 px-3 py-1.5 rounded-md transition-colors"
            >
              <Save className="w-3.5 h-3.5 text-amber-500" />
              Save
            </button>

            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:bg-purple-50 hover:text-purple-700 px-3 py-1.5 rounded-md transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-purple-500" />
              Load
              <input type="file" accept=".cobook,.json" onChange={loadNotebook} className="hidden" />
            </label>

            <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-400">
              <BookOpen className="w-3.5 h-3.5" />
              <span>{cells.length} cell{cells.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notebook Content */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-5">
        {cells.map((cell, index) => (
          <div key={cell.id}>
            {cell.type === 'code' ? (
              <CodeCell
                cell={cell}
                index={index}
                onUpdateContent={updateContent}
                onRunCell={runCell}
                onDeleteCell={deleteCell}
                onAddCell={addCell}
                onShowAIAssistant={(cId) => { setSelectedCell(cId); setShowAIAssistant(true); }}
                onProvideInput={provideInputToCell}
              />
            ) : (
              <TextCell
                cell={cell}
                index={index}
                onUpdateContent={updateContent}
                onDeleteCell={deleteCell}
                onAddCell={addCell}
                comments={comments}
                onToggleComments={toggleComments}
                onAddComment={addComment}
              />
            )}
          </div>
        ))}

        {/* Add cell button at bottom */}
        <div className="flex justify-center pt-2 pb-12">
          <div className="flex items-center gap-2">
            <button
              onClick={() => addCell('code')}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 border border-dashed border-gray-300 hover:border-indigo-300 px-4 py-2 rounded-lg transition-all"
            >
              <Braces className="w-4 h-4" />
              + Code Cell
            </button>
            <button
              onClick={() => addCell('text')}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-green-600 hover:bg-green-50 border border-dashed border-gray-300 hover:border-green-300 px-4 py-2 rounded-lg transition-all"
            >
              <FileText className="w-4 h-4" />
              + Text Cell
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-6 border-t border-gray-100 bg-white">
        <p className="text-xs text-gray-400">
          COBook · Interactive COBOL Development Environment · Powered by GnuCOBOL
        </p>
        <p className="text-xs text-gray-300 mt-1">
          AI by Groq · Visualizations: Flowchart · Data Dictionary · Division Structure · Memory · Execution Trace
        </p>
      </div>

      {/* AI Assistant Modal */}
      <AIAssistant
        isVisible={showAIAssistant}
        onClose={() => setShowAIAssistant(false)}
        selectedCell={selectedCell}
        onGenerateCode={handleGenerateCode}
        onExplainCode={handleExplainCode}
        onExplainError={handleExplainError}
        onFixError={handleFixError}
        onConvertToPython={handleConvertToPython}
        onSummarizeProgram={handleSummarizeProgram}
      />
    </div>
  );
};

export default COBook;
