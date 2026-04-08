// backend/visualization.js - Enhanced with Data Dictionary

const { parseCobol } = require('./cobol-parser');

// ─── Flowchart ────────────────────────────────────────────────────────────────
async function generateFlowchart(code) {
  try {
    const ast = await parseCobol(code);
    const nodes = [];
    const edges = [];

    nodes.push({ id: 'node_start', type: 'start', label: 'START', position: { x: 300, y: 50 } });

    let prevNodeId = 'node_start';
    let nodeId = 1;
    let yPosition = 150;

    if (!ast.procedureFlow || ast.procedureFlow.length === 0) {
      nodes.push({ id: 'node_main', type: 'process', label: 'Main Program', position: { x: 300, y: 150 } });
      edges.push({ id: 'edge_start_main', source: 'node_start', target: 'node_main' });
      prevNodeId = 'node_main';
      nodeId = 2;
      yPosition = 250;
    } else {
      for (const section of ast.procedureFlow) {
        for (const statement of section.statements) {
          const currentNodeId = `node_${nodeId++}`;
          let nodeType = 'process';
          let label = '';

          switch (statement.type) {
            case 'IF':
              nodeType = 'decision';
              label = `IF ${(statement.condition || '').substring(0, 25)}`;
              break;
            case 'PERFORM':
              nodeType = 'call';
              label = `PERFORM ${(statement.target || '').substring(0, 25)}`;
              if (statement.until) label += `\nUNTIL ${statement.until.substring(0, 20)}`;
              break;
            case 'EVALUATE':
              nodeType = 'decision';
              label = `EVALUATE ${(statement.target || '').substring(0, 22)}`;
              break;
            case 'MOVE':
              nodeType = 'process';
              label = `MOVE ${(statement.source || '').substring(0, 12)} TO ${(statement.destination || '').substring(0, 12)}`;
              break;
            case 'DISPLAY':
              nodeType = 'output';
              label = `DISPLAY ${(statement.content || '').substring(0, 22)}`;
              break;
            case 'ACCEPT':
              nodeType = 'input';
              label = `ACCEPT ${(statement.target || '').substring(0, 25)}`;
              break;
            case 'COMPUTE':
              nodeType = 'process';
              label = (statement.content || 'COMPUTE').substring(0, 30);
              break;
            case 'STOP':
              nodeType = 'end';
              label = 'STOP RUN';
              break;
            case 'GOTO':
              nodeType = 'call';
              label = `GO TO ${(statement.target || '').substring(0, 24)}`;
              break;
            default:
              label = (statement.content || 'Statement').substring(0, 30);
          }

          nodes.push({ id: currentNodeId, type: nodeType, label, position: { x: 300, y: yPosition } });
          edges.push({
            id: `edge_${nodeId}`,
            source: prevNodeId,
            target: currentNodeId,
            label: statement.type === 'IF' ? 'Yes' : ''
          });
          prevNodeId = currentNodeId;
          yPosition += 100;
        }
      }
    }

    nodes.push({ id: 'node_end', type: 'end', label: 'END', position: { x: 300, y: yPosition } });
    edges.push({ id: 'edge_end', source: prevNodeId, target: 'node_end' });

    return { nodes, edges };
  } catch (error) {
    console.error('Error generating flowchart:', error);
    return {
      nodes: [
        { id: 'node_start', type: 'start', label: 'START' },
        { id: 'node_process', type: 'process', label: 'Process' },
        { id: 'node_end', type: 'end', label: 'END' }
      ],
      edges: [
        { id: 'edge_1', source: 'node_start', target: 'node_process' },
        { id: 'edge_2', source: 'node_process', target: 'node_end' }
      ]
    };
  }
}

// ─── Data Flow ────────────────────────────────────────────────────────────────
async function generateDataFlow(code) {
  try {
    const ast = await parseCobol(code);
    const nodes = [];
    const edges = [];
    const varNodes = {};   // varName → node id
    const edgeSet = new Set(); // prevent duplicate edges

    const addEdge = (src, tgt, label = '') => {
      const key = `${src}→${tgt}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push({ id: `e_${edges.length}`, source: src, target: tgt, label });
      }
    };

    // 1. Variable nodes (from DATA DIVISION)
    let varIdx = 0;
    for (const [varName, varInfo] of Object.entries(ast.variables)) {
      const id = `var_${varIdx++}`;
      varNodes[varName] = id;
      nodes.push({
        id,
        type: 'variable',
        label: `${varName}\nPIC ${varInfo.pic || '?'}`,
        position: { x: 60, y: 60 + varIdx * 70 }
      });
    }

    // helper: find variable node by name (case-insensitive, strip quotes/spaces)
    const findVar = (name) => {
      if (!name) return null;
      const clean = name.trim().replace(/^['"]|['"]$/g, '').toUpperCase();
      return varNodes[clean] || null;
    };

    // 2. Statement nodes from PROCEDURE DIVISION
    let stmtIdx = 0;
    for (const section of (ast.procedureFlow || [])) {
      for (const stmt of (section.statements || [])) {
        const sid = `stmt_${stmtIdx++}`;

        if (stmt.type === 'MOVE') {
          const src  = (stmt.source || '').trim();
          const dest = (stmt.destination || '').trim();
          nodes.push({
            id: sid, type: 'process',
            label: `MOVE\n${src.substring(0,14)} → ${dest.substring(0,14)}`,
            position: { x: 340, y: 60 + stmtIdx * 70 }
          });
          const srcVar  = findVar(src);
          const destVar = findVar(dest);
          if (srcVar)  addEdge(srcVar,  sid,  'reads');
          if (destVar) addEdge(sid, destVar, 'writes');

        } else if (stmt.type === 'DISPLAY') {
          const content = (stmt.content || '').trim();
          nodes.push({
            id: sid, type: 'output',
            label: `DISPLAY\n${content.substring(0, 20)}`,
            position: { x: 620, y: 60 + stmtIdx * 70 }
          });
          // link any referenced variables
          const words = content.split(/\s+/);
          for (const w of words) {
            const v = findVar(w);
            if (v) addEdge(v, sid, 'reads');
          }

        } else if (stmt.type === 'ACCEPT') {
          const target = (stmt.target || '').trim();
          nodes.push({
            id: sid, type: 'input',
            label: `ACCEPT\n${target.substring(0, 20)}`,
            position: { x: 60, y: 60 + stmtIdx * 70 }
          });
          const v = findVar(target);
          if (v) addEdge(sid, v, 'writes');

        } else if (stmt.type === 'COMPUTE') {
          const content = (stmt.content || '').trim();
          nodes.push({
            id: sid, type: 'compute',
            label: `COMPUTE\n${content.substring(0, 20)}`,
            position: { x: 340, y: 60 + stmtIdx * 70 }
          });
          // crude: find any ALL-CAPS words that match variable names
          const words = content.split(/[\s=+\-*/()]+/);
          for (const w of words) {
            const v = findVar(w);
            if (v) addEdge(v, sid, 'reads');
          }
          // destination is the first token before '='
          const destMatch = content.match(/^([A-Z0-9][A-Z0-9-]*)\s*=/i);
          if (destMatch) {
            const v = findVar(destMatch[1]);
            if (v) addEdge(sid, v, 'writes');
          }
        }
        // skip IF/PERFORM/STOP — not data-flow relevant
      }
    }

    // If we ended up with no nodes at all, return empty so UI shows the empty state
    if (nodes.length === 0) return { nodes: [], edges: [] };

    return { nodes, edges };
  } catch (error) {
    console.error('Error generating data flow:', error);
    return { nodes: [], edges: [] };
  }
}

// ─── Memory Layout ────────────────────────────────────────────────────────────
async function generateMemoryLayout(code) {
  try {
    const ast = await parseCobol(code);
    const memoryLayout = [];
    const groupedVars = {};

    for (const [varName, varInfo] of Object.entries(ast.variables)) {
      const lvl = varInfo.level;
      if (!groupedVars[lvl]) groupedVars[lvl] = [];
      groupedVars[lvl].push({ name: varName, pic: varInfo.pic, type: varInfo.type, size: varInfo.size || 0 });
    }

    const sortedLevels = Object.keys(groupedVars).sort((a, b) => parseInt(a) - parseInt(b));
    let offset = 0;
    for (const level of sortedLevels) {
      const group = { level: parseInt(level), variables: [], offset, size: 0 };
      for (const variable of groupedVars[level]) {
        const varOffset = offset;
        offset += variable.size;
        group.variables.push({ ...variable, offset: varOffset });
        group.size += variable.size;
      }
      memoryLayout.push(group);
    }

    return memoryLayout;
  } catch (error) {
    console.error('Error generating memory layout:', error);
    return [];
  }
}

// ─── Division Structure ───────────────────────────────────────────────────────
async function generateDivisionStructure(code) {
  try {
    const ast = await parseCobol(code);
    const tree = [];

    for (const [divisionName, division] of Object.entries(ast.divisions)) {
      const divisionNode = {
        id: divisionName,
        name: `${divisionName} DIVISION`,
        type: 'division',
        children: []
      };

      for (const [sectionName, section] of Object.entries(division.sections || {})) {
        const sectionNode = {
          id: `${divisionName}_${sectionName}`,
          name: `${sectionName} SECTION`,
          type: 'section',
          children: []
        };

        for (const [paragraphName] of Object.entries(section.paragraphs || {})) {
          sectionNode.children.push({
            id: `${divisionName}_${sectionName}_${paragraphName}`,
            name: `${paragraphName}.`,
            type: 'paragraph',
            children: []
          });
        }

        divisionNode.children.push(sectionNode);
      }

      tree.push(divisionNode);
    }

    return tree;
  } catch (error) {
    console.error('Error generating division structure:', error);
    return [];
  }
}

// ─── Execution Trace ──────────────────────────────────────────────────────────
async function generateExecutionTrace(code) {
  try {
    const ast = await parseCobol(code);
    const trace = [];
    let stepId = 0;

    for (const section of ast.procedureFlow) {
      for (const statement of section.statements) {
        trace.push({
          id: stepId++,
          section: section.section,
          paragraph: section.paragraph,
          statement: statement.content || '',
          type: statement.type,
          variables: extractVariables(statement)
        });
      }
    }

    return trace;
  } catch (error) {
    console.error('Error generating execution trace:', error);
    return [];
  }
}

// ─── Data Dictionary ──────────────────────────────────────────────────────────
async function generateDataDictionary(code) {
  try {
    const ast = await parseCobol(code);
    return ast.dataDictionary || [];
  } catch (error) {
    console.error('Error generating data dictionary:', error);
    return [];
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function extractVariables(statement) {
  const variables = [];
  if (statement.type === 'MOVE') {
    if (statement.source) variables.push({ name: statement.source, action: 'read' });
    if (statement.destination) variables.push({ name: statement.destination, action: 'write' });
  } else if (statement.type === 'DISPLAY') {
    const matches = (statement.content || '').matchAll(/([A-Z][A-Z0-9-]*)/g);
    for (const match of matches) {
      variables.push({ name: match[1], action: 'read' });
    }
  } else if (statement.type === 'ACCEPT') {
    if (statement.target) variables.push({ name: statement.target, action: 'write' });
  } else if (statement.type === 'COMPUTE') {
    const matches = (statement.content || '').matchAll(/([A-Z][A-Z0-9-]*)/g);
    for (const match of matches) {
      variables.push({ name: match[1], action: 'read' });
    }
  }
  return variables;
}

module.exports = {
  generateFlowchart,
  generateDataFlow,
  generateMemoryLayout,
  generateDivisionStructure,
  generateExecutionTrace,
  generateDataDictionary
};
