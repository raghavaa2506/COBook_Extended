// backend/server.js - Enhanced with Data Dictionary, PIC Decoder, and all new endpoints

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const http = require('http');
const { execCobol, provideInput } = require('./cobol-runner');
const { getAIAssistance } = require('./ai-assistant');
const { decodePicClause } = require('./cobol-parser');
const {
  generateFlowchart,
  generateDataFlow,
  generateMemoryLayout,
  generateDivisionStructure,
  generateExecutionTrace,
  generateDataDictionary
} = require('./visualization');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = process.env.PORT || 5000;

const activeSessions = new Map();
const connections = new Map();
const notebooks = new Map();

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'COBook API is running',
    connections: connections.size,
    notebooks: notebooks.size,
    activeSessions: activeSessions.size,
    timestamp: new Date().toISOString()
  });
});

// ─── Execute ──────────────────────────────────────────────────────────────────
app.post('/api/execute', async (req, res) => {
  const { code, cellId } = req.body;
  if (!code) return res.status(400).json({ error: 'No code provided' });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📋 Execution Request - Cell ID: ${cellId || 'N/A'}`);
  console.log(`📏 Code size: ${code.length} characters`);
  console.log(`${'='.repeat(60)}`);

  const startTime = Date.now();
  let responseSent = false;

  try {
    const onInputNeeded = (sessionId, output) => {
      if (responseSent) return;
      activeSessions.set(cellId, sessionId);
      responseSent = true;
      res.json({
        success: true,
        output,
        needsInput: true,
        sessionId,
        executionTime: Date.now() - startTime
      });
    };

    const result = await execCobol(code, onInputNeeded);

    if (!responseSent) {
      responseSent = true;
      res.json({
        success: !result.error,
        output: result.output,
        error: result.error,
        executionTime: result.executionTime,
        needsInput: false,
        sessionId: null
      });
    }
  } catch (error) {
    console.error('❌ Execution error:', error);
    if (!responseSent) {
      responseSent = true;
      res.status(500).json({ success: false, error: error.message, needsInput: false, sessionId: null });
    }
  }
});

// ─── Provide Input ────────────────────────────────────────────────────────────
app.post('/api/provide-input', async (req, res) => {
  const { cellId, input, sessionId } = req.body;
  if (input === undefined || input === null) return res.status(400).json({ error: 'Missing input' });
  if (!cellId && !sessionId) return res.status(400).json({ error: 'Missing session identifier' });

  const programSessionId = sessionId || activeSessions.get(cellId);
  if (!programSessionId) {
    return res.status(400).json({ error: 'No active program waiting for input' });
  }

  try {
    const result = await provideInput(programSessionId, input);
    if (!result.needsInput) activeSessions.delete(cellId);

    if (!result.success) {
      activeSessions.delete(cellId);
      return res.status(200).json({
        success: false,
        error: result.error || 'Program terminated unexpectedly',
        output: result.output || '',
        needsInput: false,
        sessionId: null
      });
    }

    res.json({
      success: true,
      output: result.output,
      error: null,
      needsInput: result.needsInput || false,
      sessionId: result.needsInput ? result.sessionId : null
    });
  } catch (error) {
    console.error('❌ Error providing input:', error);
    activeSessions.delete(cellId);
    res.status(500).json({ success: false, error: error.message, needsInput: false, sessionId: null });
  }
});

// ─── AI Assist ────────────────────────────────────────────────────────────────
app.post('/api/ai-assist', async (req, res) => {
  const { prompt, context, cellType, feature } = req.body;
  if (!prompt) return res.status(400).json({ error: 'No prompt provided' });

  console.log(`\n🤖 AI Assist Request: "${prompt.substring(0, 50)}..."`);
  console.log(`Feature: ${feature || 'generate'}`);

  try {
    const result = await getAIAssistance(prompt, context, cellType, feature || 'generate');
    res.json({
      success: true,
      generatedCode: result.code,
      suggestion: result.suggestion,
      explanation: result.explanation,
      feature: result.feature
    });
  } catch (error) {
    console.error('❌ AI error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── PIC Clause Decoder ───────────────────────────────────────────────────────
app.post('/api/pic-decode', async (req, res) => {
  const { pic } = req.body;
  if (!pic) return res.status(400).json({ error: 'No PIC clause provided' });

  console.log(`\n🔍 PIC Decode Request: "${pic}"`);
  try {
    const decoded = decodePicClause(pic);
    res.json({ success: true, decoded });
    console.log('✓ PIC decoded');
  } catch (error) {
    console.error('❌ PIC decode error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Visualizations ───────────────────────────────────────────────────────────
app.post('/api/visualization/flowchart', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'No code provided' });
  try {
    const flowchart = await generateFlowchart(code);
    console.log(`✓ Flowchart: ${flowchart.nodes.length} nodes, ${flowchart.edges.length} edges`);
    res.json({ success: true, flowchart });
  } catch (error) {
    console.error('❌ Flowchart error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/visualization/dataflow', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'No code provided' });
  try {
    const dataflow = await generateDataFlow(code);
    console.log(`✓ Data flow: ${dataflow.nodes.length} nodes, ${dataflow.edges.length} edges`);
    res.json({ success: true, dataflow });
  } catch (error) {
    console.error('❌ Data flow error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/visualization/memory', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'No code provided' });
  try {
    const memoryLayout = await generateMemoryLayout(code);
    console.log(`✓ Memory layout: ${memoryLayout.length} groups`);
    res.json({ success: true, memoryLayout });
  } catch (error) {
    console.error('❌ Memory layout error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/visualization/structure', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'No code provided' });
  try {
    const structure = await generateDivisionStructure(code);
    console.log(`✓ Division structure: ${structure.length} divisions`);
    res.json({ success: true, structure });
  } catch (error) {
    console.error('❌ Division structure error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/visualization/trace', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'No code provided' });
  try {
    const trace = await generateExecutionTrace(code);
    console.log(`✓ Execution trace: ${trace.length} steps`);
    res.json({ success: true, trace });
  } catch (error) {
    console.error('❌ Execution trace error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Data Dictionary (NEW) ────────────────────────────────────────────────────
app.post('/api/visualization/datadictionary', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'No code provided' });
  try {
    const dictionary = await generateDataDictionary(code);
    console.log(`✓ Data dictionary: ${dictionary.length} entries`);
    res.json({ success: true, dictionary });
  } catch (error) {
    console.error('❌ Data dictionary error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Notebooks ────────────────────────────────────────────────────────────────
app.post('/api/notebooks/save', (req, res) => {
  const { id, name, cells, comments } = req.body;
  notebooks.set(id, { id, name, cells, comments, updatedAt: new Date().toISOString() });
  console.log(`💾 Notebook saved: ${name}`);
  res.json({ success: true, id });
});

app.get('/api/notebooks/:id', (req, res) => {
  const notebook = notebooks.get(req.params.id);
  if (notebook) res.json(notebook);
  else res.status(404).json({ error: 'Notebook not found' });
});

// ─── WebSocket ────────────────────────────────────────────────────────────────
wss.on('connection', (ws, req) => {
  const userId = req.headers['sec-websocket-key'];
  connections.set(userId, ws);
  console.log(`🔌 New connection: ${userId.substring(0, 8)}... (Total: ${connections.size})`);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      connections.forEach((client, id) => {
        if (id !== userId && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    connections.delete(userId);
    console.log(`🔌 Connection closed (Total: ${connections.size})`);
  });

  ws.send(JSON.stringify({ type: 'welcome', userId, connections: connections.size }));
});

// ─── Error Handlers ───────────────────────────────────────────────────────────
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║             🚀 COBook Server Running                   ║
╠════════════════════════════════════════════════════════╣
║  📡 API Server:        http://localhost:${PORT}        ║
║  🔌 WebSocket:         ws://localhost:${PORT}          ║
║  🤖 AI Assistant:      ${process.env.GROQ_API_KEY ? '✓ Enabled (Groq)' : '✗ Disabled (no key)'}             ║
║  📊 Visualization:     Flowchart, DataFlow, Memory     ║
║                        Structure, Trace, Dictionary    ║
║  🔍 PIC Decoder:       ✓ Enabled (rule-based)         ║
║  🔢 Interactive I/O:   ✓ Enabled                       ║
╚════════════════════════════════════════════════════════╝
  `);

  console.log('\n📚 All endpoints:');
  console.log('  POST /api/execute                    - Execute COBOL');
  console.log('  POST /api/provide-input              - Provide I/O input');
  console.log('  POST /api/ai-assist                  - AI assistance');
  console.log('  POST /api/pic-decode                 - Decode PIC clause [NEW]');
  console.log('  POST /api/visualization/flowchart    - Flowchart');
  console.log('  POST /api/visualization/dataflow     - Data flow');
  console.log('  POST /api/visualization/memory       - Memory layout');
  console.log('  POST /api/visualization/structure    - Division structure');
  console.log('  POST /api/visualization/trace        - Execution trace');
  console.log('  POST /api/visualization/datadictionary - Data Dictionary [NEW]');
  console.log('  GET  /api/health                     - Health check');
  console.log('  POST /api/notebooks/save             - Save notebook');
  console.log('  GET  /api/notebooks/:id              - Load notebook');
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  connections.forEach(ws => ws.close());
  server.close(() => { console.log('✓ Closed'); process.exit(0); });
});

process.on('SIGTERM', () => {
  connections.forEach(ws => ws.close());
  server.close(() => process.exit(0));
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});
