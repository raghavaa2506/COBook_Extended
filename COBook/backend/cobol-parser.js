// backend/cobol-parser.js - Enhanced with Data Dictionary, REDEFINES, VALUE extraction

const fs = require('fs').promises;
const path = require('path');

// ─── Main parse entry point ───────────────────────────────────────────────────
async function parseCobol(code) {
  try {
    return await enhancedCobolParser(code);
  } catch (error) {
    console.error('COBOL parsing error:', error);
    return { divisions: {}, variables: {}, procedureFlow: [], dataDictionary: [] };
  }
}

// ─── Enhanced Parser ──────────────────────────────────────────────────────────
async function enhancedCobolParser(code) {
  const lines = code.split('\n');
  const divisions = {};
  let currentDivision = null;
  let currentSection = null;
  let currentParagraph = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('*')) continue;

    // Division headers
    const divisionMatch = trimmed.match(/^([A-Z]+)\s+DIVISION\./i);
    if (divisionMatch) {
      currentDivision = divisionMatch[1].toUpperCase();
      divisions[currentDivision] = { sections: {}, content: [] };
      currentSection = null;
      currentParagraph = null;
      continue;
    }

    // Section headers
    const sectionMatch = trimmed.match(/^([A-Z][A-Z0-9-]*)\s+SECTION\./i);
    if (sectionMatch && currentDivision) {
      currentSection = sectionMatch[1].toUpperCase();
      if (!divisions[currentDivision].sections) divisions[currentDivision].sections = {};
      divisions[currentDivision].sections[currentSection] = { paragraphs: {}, content: [] };
      currentParagraph = null;
      continue;
    }

    // Paragraph headers (in PROCEDURE division)
    const paragraphMatch = trimmed.match(/^([A-Z0-9][A-Z0-9-]*)\.$/i);
    if (paragraphMatch && currentDivision === 'PROCEDURE' && currentSection) {
      currentParagraph = paragraphMatch[1].toUpperCase();
      if (!divisions[currentDivision].sections[currentSection]) {
        divisions[currentDivision].sections[currentSection] = { paragraphs: {}, content: [] };
      }
      divisions[currentDivision].sections[currentSection].paragraphs[currentParagraph] = { content: [] };
      continue;
    }

    // Content routing
    if (currentDivision) {
      if (currentSection) {
        if (currentParagraph && divisions[currentDivision].sections[currentSection]) {
          divisions[currentDivision].sections[currentSection].paragraphs[currentParagraph].content.push(trimmed);
        } else if (divisions[currentDivision].sections[currentSection]) {
          divisions[currentDivision].sections[currentSection].content.push(trimmed);
        }
      } else {
        divisions[currentDivision].content.push(trimmed);
      }
    }
  }

  // Handle PROCEDURE DIVISION without sections
  if (divisions.PROCEDURE && Object.keys(divisions.PROCEDURE.sections || {}).length === 0) {
    divisions.PROCEDURE.sections = divisions.PROCEDURE.sections || {};
    divisions.PROCEDURE.sections['MAIN'] = { paragraphs: {}, content: [] };
    let para = null;
    for (const line of (divisions.PROCEDURE.content || [])) {
      const pm = line.trim().match(/^([A-Z0-9][A-Z0-9-]*)\.$/i);
      if (pm) {
        para = pm[1].toUpperCase();
        divisions.PROCEDURE.sections['MAIN'].paragraphs[para] = { content: [] };
      } else if (para) {
        divisions.PROCEDURE.sections['MAIN'].paragraphs[para].content.push(line.trim());
      } else {
        divisions.PROCEDURE.sections['MAIN'].content.push(line.trim());
      }
    }
  }

  // Extract variables + data dictionary
  const { variables, dataDictionary } = extractVariablesAndDictionary(code);

  // Extract procedure flow
  const procedureFlow = extractProcedureFlow(divisions);

  return { divisions, variables, procedureFlow, dataDictionary };
}

// ─── Variable + Data Dictionary Extraction ───────────────────────────────────
function extractVariablesAndDictionary(code) {
  const variables = {};
  const dataDictionary = [];

  // Find DATA DIVISION block
  const dataMatch = code.match(/DATA\s+DIVISION\.([\s\S]*?)(?=PROCEDURE\s+DIVISION|$)/i);
  if (!dataMatch) return { variables, dataDictionary };

  const dataBlock = dataMatch[1];

  // Enhanced regex: captures level, name, PIC, VALUE, REDEFINES
  // Handles multi-line entries by joining continuation lines
  const entries = [];
  let currentEntry = '';
  for (const line of dataBlock.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('*')) continue;

    // If line starts with a level number, it's a new entry
    if (/^\d{2}\s+/.test(trimmed)) {
      if (currentEntry) entries.push(currentEntry);
      currentEntry = trimmed;
    } else {
      currentEntry += ' ' + trimmed;
    }
  }
  if (currentEntry) entries.push(currentEntry);

  for (const entry of entries) {
    const e = entry.replace(/\s+/g, ' ').trim();

    // Level + name
    const levelNameMatch = e.match(/^(\d{2})\s+([A-Z0-9][A-Z0-9-]*)/i);
    if (!levelNameMatch) continue;

    const level = parseInt(levelNameMatch[1]);
    const name = levelNameMatch[2].toUpperCase();
    if (name === 'FILLER') continue; // skip FILLER

    // PIC clause
    const picMatch = e.match(/(?:PIC|PICTURE)\s+(?:IS\s+)?([A-Z0-9()\-+.,$*/Vv]+)/i);
    const pic = picMatch ? picMatch[1].toUpperCase().replace(/\.$/, '') : null;

    // VALUE clause
    const valueMatch = e.match(/VALUE\s+(?:IS\s+)?([^\s.]+(?:\s+[^\s.]+)*?)(?:\.|$)/i);
    const value = valueMatch ? valueMatch[1].trim().replace(/^['"]|['"]$/g, '') : null;

    // REDEFINES clause
    const redefinesMatch = e.match(/REDEFINES\s+([A-Z0-9][A-Z0-9-]*)/i);
    const redefines = redefinesMatch ? redefinesMatch[1].toUpperCase() : null;

    // OCCURS clause
    const occursMatch = e.match(/OCCURS\s+(\d+)(?:\s+TO\s+(\d+))?\s+TIMES?/i);
    const occurs = occursMatch ? {
      min: occursMatch[2] ? parseInt(occursMatch[1]) : null,
      max: parseInt(occursMatch[2] || occursMatch[1])
    } : null;

    // COMP / USAGE
    const usageMatch = e.match(/(?:USAGE\s+(?:IS\s+)?)?(?:COMP(?:-\d)?|BINARY|DISPLAY|PACKED-DECIMAL|INDEX)/i);
    const usage = usageMatch ? usageMatch[0].toUpperCase().replace(/^USAGE\s+(IS\s+)?/, '') : 'DISPLAY';

    const type = pic ? determineType(pic) : 'group';
    const size = pic ? calculateSize(pic) : 0;

    const varEntry = {
      level,
      name,
      pic,
      value,
      redefines,
      occurs,
      usage,
      type,
      size
    };

    if (pic) {
      variables[name] = varEntry;
    }

    dataDictionary.push(varEntry);
  }

  return { variables, dataDictionary };
}

// ─── PIC Clause Analysis ──────────────────────────────────────────────────────
function determinePicDetails(pic) {
  if (!pic) return null;
  const p = pic.toUpperCase();

  const signed = p.includes('S');
  const hasDecimal = p.includes('V') || p.includes('.');

  // Count integer digits
  let intDigits = 0;
  let decDigits = 0;
  let alphaChars = 0;

  // Expand repeating patterns like 9(5) → 99999
  const expanded = p.replace(/([A-Z9])\((\d+)\)/g, (_, ch, n) => ch.repeat(parseInt(n)));

  const vIdx = expanded.indexOf('V');
  const intPart = vIdx >= 0 ? expanded.substring(0, vIdx) : expanded;
  const decPart = vIdx >= 0 ? expanded.substring(vIdx + 1) : '';

  intDigits = (intPart.match(/9/g) || []).length;
  decDigits = (decPart.match(/9/g) || []).length;
  alphaChars = (expanded.match(/X/g) || []).length;

  // Format type
  let format = 'DISPLAY';
  if (p.includes('COMP-3') || p.includes('PACKED-DECIMAL')) format = 'COMP-3 (Packed Decimal)';
  else if (p.includes('COMP-1')) format = 'COMP-1 (Float)';
  else if (p.includes('COMP-2')) format = 'COMP-2 (Double)';
  else if (p.includes('COMP')) format = 'COMP (Binary)';

  // Determine category
  let category = 'Unknown';
  if (alphaChars > 0 && intDigits === 0) category = 'Alphanumeric';
  else if (alphaChars > 0) category = 'Alphanumeric/Numeric';
  else if (hasDecimal) category = signed ? 'Signed Decimal' : 'Unsigned Decimal';
  else if (intDigits > 0) category = signed ? 'Signed Integer' : 'Unsigned Integer';

  return {
    signed,
    intDigits,
    decDigits,
    alphaChars,
    hasDecimal,
    format,
    category,
    totalBytes: alphaChars || intDigits + decDigits + (signed ? 1 : 0)
  };
}

// ─── PIC Decoder (Rule-based, deterministic) ──────────────────────────────────
function decodePicClause(pic) {
  if (!pic) return { error: 'No PIC clause provided' };

  const p = pic.toUpperCase().replace(/\s+/g, '');
  const details = determinePicDetails(p);

  const parts = [];

  if (details.signed) {
    parts.push({ symbol: 'S', meaning: 'Signed (can hold negative values)', color: 'red' });
  }

  // Parse each character/group
  const tokens = p.replace(/S/g, '').match(/([A-Z])\((\d+)\)|[A-Z9]/g) || [];
  for (const token of tokens) {
    const groupMatch = token.match(/([A-Z])\((\d+)\)/);
    if (groupMatch) {
      const [, ch, n] = groupMatch;
      parts.push(charMeaning(ch, parseInt(n)));
    } else {
      parts.push(charMeaning(token, 1));
    }
  }

  return {
    original: pic,
    normalized: p,
    parts,
    details,
    summary: buildSummary(details)
  };
}

function charMeaning(ch, count) {
  const meanings = {
    '9': { color: 'blue', label: `9(${count})`, meaning: `${count} numeric digit${count > 1 ? 's' : ''}` },
    'X': { color: 'green', label: `X(${count})`, meaning: `${count} alphanumeric character${count > 1 ? 's' : ''}` },
    'A': { color: 'teal', label: `A(${count})`, meaning: `${count} alphabetic character${count > 1 ? 's' : ''}` },
    'V': { color: 'orange', label: 'V', meaning: 'Implied decimal point (no physical storage)' },
    '.': { color: 'orange', label: '.', meaning: 'Explicit decimal point (uses 1 byte)' },
    'Z': { color: 'purple', label: `Z(${count})`, meaning: `${count} zero-suppressed digit${count > 1 ? 's' : ''}` },
    '+': { color: 'pink', label: '+', meaning: 'Sign character (+ or -)' },
    '-': { color: 'pink', label: '-', meaning: 'Sign character (minus or space)' },
    '$': { color: 'yellow', label: '$', meaning: 'Currency symbol' },
    ',': { color: 'gray', label: ',', meaning: 'Comma insertion character' },
    'B': { color: 'gray', label: `B(${count})`, meaning: `${count} blank insertion character${count > 1 ? 's' : ''}` },
  };
  return meanings[ch] || { color: 'gray', label: ch, meaning: `Unknown character: ${ch}` };
}

function buildSummary(details) {
  const parts = [];
  if (details.signed) parts.push('signed');
  if (details.alphaChars > 0) parts.push(`${details.alphaChars}-character alphanumeric`);
  if (details.intDigits > 0) parts.push(`${details.intDigits} integer digit${details.intDigits > 1 ? 's' : ''}`);
  if (details.decDigits > 0) parts.push(`${details.decDigits} decimal digit${details.decDigits > 1 ? 's' : ''}`);
  if (details.format !== 'DISPLAY') parts.push(`stored as ${details.format}`);
  return parts.join(', ') || 'Unknown format';
}

// ─── Type & Size Helpers ─────────────────────────────────────────────────────
function determineType(pic) {
  const p = pic.toUpperCase();
  if (p.includes('X') || p.includes('A')) return 'alphanumeric';
  if (p.includes('9')) {
    if (p.includes('V') || p.includes('.')) return 'numeric-decimal';
    return 'numeric';
  }
  return 'unknown';
}

function calculateSize(pic) {
  if (!pic) return 0;
  const p = pic.toUpperCase();
  // Handle X(n), 9(n) patterns
  let size = 0;
  const tokens = p.match(/([A-Z9])\((\d+)\)|[A-Z9]/g) || [];
  for (const token of tokens) {
    const groupMatch = token.match(/([A-Z9])\((\d+)\)/);
    if (groupMatch) {
      size += parseInt(groupMatch[2]);
    } else if (token !== 'V' && token !== 'S') {
      size += 1;
    }
  }
  return size;
}

// ─── Procedure Flow Extraction ───────────────────────────────────────────────
function extractProcedureFlow(divisions) {
  const procedureFlow = [];
  if (!divisions.PROCEDURE) return procedureFlow;

  for (const [sectionName, section] of Object.entries(divisions.PROCEDURE.sections || {})) {
    // Also process direct section content
    const paragraphsToProcess = { ...section.paragraphs };

    // If section has no paragraphs but has content, treat content as a default paragraph
    if (Object.keys(paragraphsToProcess).length === 0 && section.content && section.content.length > 0) {
      paragraphsToProcess['_MAIN'] = { content: section.content };
    }

    for (const [paragraphName, paragraph] of Object.entries(paragraphsToProcess)) {
      const content = paragraph.content.join('\n');
      const statements = extractControlFlow(content);
      if (statements.length > 0) {
        procedureFlow.push({ section: sectionName, paragraph: paragraphName, statements });
      }
    }
  }

  return procedureFlow;
}

// ─── Control Flow Extraction ─────────────────────────────────────────────────
function extractControlFlow(content) {
  const statements = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('*')) continue;

    const ifMatch = trimmed.match(/^IF\s+(.+?)(?:\s+THEN)?$/i);
    if (ifMatch) {
      statements.push({ type: 'IF', condition: ifMatch[1], content: trimmed });
      continue;
    }

    const performMatch = trimmed.match(/^PERFORM\s+(.+?)(?:\s+UNTIL\s+(.+))?$/i);
    if (performMatch) {
      statements.push({ type: 'PERFORM', target: performMatch[1], until: performMatch[2] || null, content: trimmed });
      continue;
    }

    const evaluateMatch = trimmed.match(/^EVALUATE\s+(.+)/i);
    if (evaluateMatch) {
      statements.push({ type: 'EVALUATE', target: evaluateMatch[1], content: trimmed });
      continue;
    }

    const moveMatch = trimmed.match(/^MOVE\s+(.+?)\s+TO\s+(.+)/i);
    if (moveMatch) {
      statements.push({ type: 'MOVE', source: moveMatch[1], destination: moveMatch[2], content: trimmed });
      continue;
    }

    const displayMatch = trimmed.match(/^DISPLAY\s+(.+)/i);
    if (displayMatch) {
      statements.push({ type: 'DISPLAY', content: displayMatch[1] });
      continue;
    }

    const acceptMatch = trimmed.match(/^ACCEPT\s+(.+)/i);
    if (acceptMatch) {
      statements.push({ type: 'ACCEPT', target: acceptMatch[1], content: trimmed });
      continue;
    }

    const computeMatch = trimmed.match(/^(ADD|SUBTRACT|MULTIPLY|DIVIDE|COMPUTE)\s+(.+)/i);
    if (computeMatch) {
      statements.push({ type: 'COMPUTE', operation: computeMatch[1].toUpperCase(), content: trimmed });
      continue;
    }

    if (trimmed.match(/^STOP\s+RUN/i)) {
      statements.push({ type: 'STOP', content: 'STOP RUN' });
      continue;
    }

    if (trimmed.match(/^GO\s+TO\s+(.+)/i)) {
      const gotoMatch = trimmed.match(/^GO\s+TO\s+(.+)/i);
      statements.push({ type: 'GOTO', target: gotoMatch[1], content: trimmed });
      continue;
    }

    statements.push({ type: 'STATEMENT', content: trimmed.length > 60 ? trimmed.substring(0, 57) + '...' : trimmed });
  }

  return statements;
}

module.exports = { parseCobol, decodePicClause, determinePicDetails, calculateSize, determineType };
