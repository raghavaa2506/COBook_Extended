// backend/ai-assistant.js - Enhanced with explain-error, pic context, and better prompts

require('dotenv').config();

let groq = null;
let aiEnabled = false;

try {
  if (process.env.GROQ_API_KEY) {
    const Groq = require('groq-sdk');
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    aiEnabled = true;
    console.log('✓ AI Assistant enabled with Groq API');
  } else {
    console.log('⚠ AI Assistant disabled - No GROQ_API_KEY in .env');
  }
} catch (error) {
  console.log('⚠ AI Assistant disabled - Groq SDK error:', error.message);
}

async function getAIAssistance(prompt, context = '', cellType = 'code', feature = 'generate') {
  if (!aiEnabled || !groq) {
    return generateFallbackResponse(prompt, context, cellType, feature);
  }

  try {
    let systemPrompt = buildSystemPrompt(feature, context);

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: feature === 'generate' || feature === 'fix' ? 0.3 : 0.7,
      max_tokens: 2500
    });

    const response = completion.choices[0]?.message?.content || '';

    // Extract code block if present
    let code = response;
    const codeBlockMatch = response.match(/```(?:cobol|python|COBOL)?\n([\s\S]*?)```/);
    if (codeBlockMatch) {
      code = codeBlockMatch[1].trim();
    }

    return {
      code: (feature === 'generate' || feature === 'fix' || feature === 'convert') ? code : response,
      suggestion: response,
      explanation: 'AI-generated via Groq/Llama',
      feature
    };
  } catch (error) {
    console.error('AI Assistant error:', error);
    return generateFallbackResponse(prompt, context, cellType, feature);
  }
}

function buildSystemPrompt(feature, context) {
  switch (feature) {
    case 'explain':
      return `You are an expert COBOL educator. Explain COBOL code in plain English for beginners and maintainers.

RULES:
1. Explain what the code DOES in business terms (not just syntax)
2. Explain COBOL-specific constructs: DIVISIONS, SECTIONS, PIC clauses, PERFORM, etc.
3. Decode any PIC clauses you see (e.g. PIC 9(5)V99 = 5-digit integer with 2 decimal places)
4. Break down the control flow step by step
5. Use numbered lists and clear headings
6. Mention any potential issues or good practices
7. Use simple language accessible to non-COBOL developers

Code to explain:
${context || 'No code provided'}`;

    case 'explain-error':
      return `You are an expert COBOL debugger. Explain GnuCOBOL compilation errors in plain English.

RULES:
1. Identify EXACTLY what caused the error
2. Explain the error in beginner-friendly terms
3. Show the corrected code snippet
4. Explain WHY it was wrong and what the fix does
5. Add tips to avoid similar errors

Error context:
${context || 'No error provided'}`;

    case 'fix':
      return `You are an expert COBOL programmer. Fix the COBOL code based on the compilation error.

RULES:
1. Output ONLY the corrected complete COBOL program inside a \`\`\`cobol code block
2. Fix ALL errors, not just the first one
3. Preserve the original program's intent
4. Add a brief comment at the top explaining what was fixed
5. Ensure proper COBOL syntax: column alignment, period placement, division structure

Error message:
${context || 'No error message provided'}`;

    case 'generate':
      return `You are an expert COBOL programmer. Generate complete, working COBOL programs.

RULES:
1. Output the COBOL code inside a \`\`\`cobol code block
2. Always include: IDENTIFICATION DIVISION, DATA DIVISION (if needed), PROCEDURE DIVISION
3. Use proper free-format or fixed-format COBOL (default: free-format with -free flag)
4. Use meaningful variable names with correct PIC clauses
5. Always end with STOP RUN
6. Add inline comments explaining key sections
7. Make it educational - include DATA DIVISION variable examples when relevant

Context: ${context ? 'User has existing code to extend' : 'Creating new program from scratch'}`;

    case 'convert':
      return `You are an expert in both COBOL and Python. Convert COBOL to equivalent Python.

RULES:
1. Output the Python code inside a \`\`\`python code block
2. Map COBOL constructs to idiomatic Python
3. Explain key mappings: WORKING-STORAGE → variables, PERFORM → function calls, etc.
4. Handle COBOL-specific types: PIC 9(5)V99 → Decimal, PIC X(30) → str (max 30)
5. Note any behavioral differences between COBOL and Python versions

COBOL Code:
${context || 'No COBOL code provided'}`;

    case 'summarize':
      return `You are an expert COBOL analyst. Summarize what a COBOL program does in one clear paragraph.

RULES:
1. Describe the program's PURPOSE in business terms
2. List the main inputs and outputs
3. Describe the key business logic/algorithm
4. Note any important data structures or external files
5. Keep it to ONE paragraph (4-6 sentences)
6. Write for a non-COBOL audience (e.g. a business analyst)

Program:
${context || 'No program provided'}`;

    case 'pic-explain':
      return `You are an expert COBOL data specialist. Explain COBOL PICTURE (PIC) clauses in detail.

RULES:
1. Explain what each character/symbol in the PIC clause means
2. State the total storage size in bytes/characters
3. Give an example value the field can hold
4. Mention any format considerations (signed, decimal, etc.)
5. Be concise but complete`;

    default:
      return `You are a helpful COBOL programming assistant. Help with COBOL code questions, syntax, debugging, and best practices.`;
  }
}

function generateFallbackResponse(prompt, context, cellType, feature) {
  const noKeyMsg = 'Add GROQ_API_KEY to backend/.env to enable AI features.';

  switch (feature) {
    case 'explain':
    case 'explain-error':
    case 'summarize':
    case 'pic-explain':
      return {
        code: `AI Assistant is currently unavailable.\n\n${noKeyMsg}`,
        suggestion: `AI Assistant is currently unavailable. ${noKeyMsg}`,
        explanation: noKeyMsg,
        feature
      };

    case 'fix':
    case 'generate':
      return {
        code: `       IDENTIFICATION DIVISION.
       PROGRAM-ID. Placeholder.
       PROCEDURE DIVISION.
           DISPLAY 'AI Assistant unavailable'.
           DISPLAY '${noKeyMsg}'.
           STOP RUN.`,
        suggestion: `AI unavailable. ${noKeyMsg}`,
        explanation: noKeyMsg,
        feature
      };

    case 'convert':
      return {
        code: `# Python equivalent\n# AI Assistant unavailable\n# ${noKeyMsg}\nprint("AI unavailable")`,
        suggestion: `AI unavailable. ${noKeyMsg}`,
        explanation: noKeyMsg,
        feature
      };

    default:
      return {
        code: '',
        suggestion: `AI unavailable. ${noKeyMsg}`,
        explanation: noKeyMsg,
        feature
      };
  }
}

module.exports = { getAIAssistance };
