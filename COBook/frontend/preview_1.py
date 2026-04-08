import re
import os
from datetime import datetime

def parse_cobol(code):
    """Enhanced COBOL parser that handles both fixed and free format"""
    divisions = {}
    current = None
    is_free_format = False
    
    # Check if this is free format COBOL
    if ">>SOURCE FORMAT FREE" in code.upper():
        is_free_format = True
    
    lines = [l.rstrip() for l in code.splitlines() if l.strip()]
    
    for line in lines:
        # Skip SOURCE FORMAT directives
        if line.strip().startswith('>>'):
            continue
            
        # Skip comment lines
        if line.strip().startswith('*') or line.strip().startswith('*>'):
            continue
            
        # Match division headers (more flexible - with or without period)
        m = re.match(r"\s*(\w+)\s+DIVISION\s*\.?", line, re.I)
        if m:
            current = m.group(1).upper()
            divisions[current] = []
        elif current:
            divisions[current].append(line.strip())
    
    return divisions, is_free_format


def extract_statements(proc_lines, is_free_format=False):
    """Extract statements from procedure division - handles both formats"""
    stmts = []
    buffer = ""
    
    # COBOL statement keywords that start a new statement
    statement_starters = [
        'DISPLAY', 'ACCEPT', 'MOVE', 'ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE',
        'COMPUTE', 'IF', 'ELSE', 'END-IF', 'EVALUATE', 'WHEN', 'PERFORM',
        'CALL', 'GO TO', 'GOTO', 'STOP', 'EXIT', 'READ', 'WRITE', 'OPEN',
        'CLOSE', 'STRING', 'UNSTRING', 'INSPECT', 'INITIALIZE', 'SET',
        'CONTINUE', 'GOBACK', 'RETURN', 'SEARCH', 'START', 'DELETE',
        'REWRITE', 'RELEASE', 'SORT', 'MERGE'
    ]
    
    for l in proc_lines:
        stripped = l.strip()
        
        # Skip empty lines and comments
        if not stripped or stripped.startswith('*') or stripped.startswith('*>'):
            continue
        
        # Check if this is a paragraph/section name (word followed by period on its own)
        if re.match(r'^[\w-]+\.$', stripped):
            # Save any buffered statement before the paragraph
            if buffer:
                stmts.append(buffer.strip())
                buffer = ""
            continue
        
        if is_free_format:
            # In free format, each line is typically a statement
            # Check if this line starts a new statement
            is_new_stmt = False
            upper_stripped = stripped.upper()
            
            for starter in statement_starters:
                if upper_stripped.startswith(starter):
                    is_new_stmt = True
                    break
            
            if is_new_stmt:
                # Save previous buffer if exists
                if buffer:
                    stmts.append(buffer.strip())
                # Start new statement
                buffer = stripped
            else:
                # Continue previous statement (might be a continuation)
                if buffer:
                    buffer += " " + stripped
                else:
                    buffer = stripped
        else:
            # Fixed format - use periods
            buffer += " " + stripped if buffer else stripped
            
            # If statement ends with period, add it to statements list
            if stripped.endswith('.'):
                # Remove trailing period
                stmt = buffer[:-1].strip()
                if stmt:
                    stmts.append(stmt)
                buffer = ""
    
    # Add any remaining buffer
    if buffer:
        stmts.append(buffer.strip())
    
    return stmts


def classify(stmt):
    """Enhanced classification with more statement types"""
    s = stmt.upper()
    
    # I/O Operations
    if s.startswith("DISPLAY"):
        return "io"
    if s.startswith("ACCEPT"):
        return "input"
    if s.startswith(("READ", "WRITE", "OPEN", "CLOSE")):
        return "io"
    
    # Control Flow
    if s.startswith("IF"):
        return "decision"
    if s.startswith(("EVALUATE", "WHEN", "ELSE")):
        return "decision"
    if s.startswith(("PERFORM", "CALL", "GO TO", "GOTO")):
        return "call"
    
    # Computation
    if s.startswith(("MOVE", "ADD", "SUBTRACT", "MULTIPLY", "DIVIDE", "COMPUTE")):
        return "compute"
    if s.startswith(("INITIALIZE", "SET")):
        return "compute"
    
    # Program Control
    if "STOP RUN" in s or "EXIT PROGRAM" in s or s.startswith("GOBACK"):
        return "end"
    
    # String Operations
    if s.startswith(("STRING", "UNSTRING", "INSPECT")):
        return "compute"
    
    return "normal"


def extract_variables(data_lines):
    """Enhanced variable extraction with better pattern matching"""
    variables = []
    
    # Pattern for level 01-77 variables - more flexible
    # Handles both with and without periods at end
    var_pattern = re.compile(
        r'^\s*(\d{2})\s+([\w-]+)\s+PIC\s+([\w()]+)\s*(?:VALUE\s+(.+?))?\.?\s*$',
        re.I
    )
    
    for l in data_lines:
        match = var_pattern.match(l)
        if match:
            level = match.group(1)
            var_name = match.group(2)
            pic_type = match.group(3)
            init_value = match.group(4)
            
            # Only include level 01 and 77 for main variables
            if level in ['01', '77']:
                if init_value:
                    # Clean up the value
                    init_value = init_value.strip()
                    # Remove quotes and trailing period
                    init_value = init_value.rstrip('.')
                    if (init_value.startswith('"') and init_value.endswith('"')) or \
                       (init_value.startswith("'") and init_value.endswith("'")):
                        init_value = init_value[1:-1]
                else:
                    init_value = "N/A"
                
                variables.append({
                    "name": var_name,
                    "type": pic_type,
                    "value": init_value
                })
    
    return variables


def extract_program_info(divs):
    """Extract program identification information"""
    info = {
        "program_id": "Unknown",
        "author": "Not specified",
        "date_written": "Not specified"
    }
    
    if "IDENTIFICATION" in divs:
        for line in divs["IDENTIFICATION"]:
            if "PROGRAM-ID" in line.upper():
                match = re.search(r'PROGRAM-ID\.\s+([\w-]+)', line, re.I)
                if match:
                    info["program_id"] = match.group(1)
            elif "AUTHOR" in line.upper():
                match = re.search(r'AUTHOR\.\s+(.+)', line, re.I)
                if match:
                    info["author"] = match.group(1).strip().rstrip('.')
            elif "DATE-WRITTEN" in line.upper():
                match = re.search(r'DATE-WRITTEN\.\s+(.+)', line, re.I)
                if match:
                    info["date_written"] = match.group(1).strip().rstrip('.')
    
    return info


def analyze_complexity(stmts):
    """Analyze program complexity metrics"""
    complexity = {
        "total_statements": len(stmts),
        "io_operations": 0,
        "computations": 0,
        "decisions": 0,
        "loops": 0,
        "calls": 0
    }
    
    for stmt in stmts:
        kind = classify(stmt)
        if kind == "io" or kind == "input":
            complexity["io_operations"] += 1
        elif kind == "compute":
            complexity["computations"] += 1
        elif kind == "decision":
            complexity["decisions"] += 1
        elif kind == "call":
            complexity["calls"] += 1
            if "PERFORM" in stmt.upper() and "TIMES" in stmt.upper():
                complexity["loops"] += 1
    
    return complexity


def generate_html_visualization(code):
    """Generate comprehensive HTML visualization"""
    divs, is_free_format = parse_cobol(code)
    proc = divs.get("PROCEDURE", [])
    stmts = extract_statements(proc, is_free_format)
    
    # Extract program information
    prog_info = extract_program_info(divs)
    
    # Extract variables
    variables = []
    if "DATA" in divs:
        variables = extract_variables(divs["DATA"])
    
    # Analyze complexity
    complexity = analyze_complexity(stmts)
    
    # Format indicator
    format_badge = "FREE FORMAT" if is_free_format else "FIXED FORMAT"
    
    # Create HTML template with escaped curly braces
    html_template = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>COBOL Program Visualization - {program_id}</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {{
            --primary: #6366f1;
            --secondary: #8b5cf6;
            --accent: #ec4899;
            --dark: #1e293b;
            --darker: #0f172a;
            --light: #f1f5f9;
            --card-bg: rgba(30, 41, 59, 0.7);
            --border: rgba(148, 163, 184, 0.1);
        }}
        
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, var(--darker) 0%, var(--dark) 100%);
            color: var(--light);
            min-height: 100vh;
            padding: 2rem;
            line-height: 1.6;
        }}
        
        .container {{
            max-width: 1600px;
            margin: 0 auto;
        }}
        
        header {{
            text-align: center;
            margin-bottom: 2rem;
            animation: fadeInDown 0.8s ease-out;
        }}
        
        h1 {{
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
            background: linear-gradient(to right, var(--primary), var(--secondary), var(--accent));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }}
        
        .subtitle {{
            color: #94a3b8;
            font-size: 1.1rem;
        }}
        
        .format-badge {{
            display: inline-block;
            background: linear-gradient(135deg, #10b981, #047857);
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            margin-top: 0.5rem;
        }}
        
        .program-header {{
            background: var(--card-bg);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            padding: 1.5rem;
            border: 1px solid var(--border);
            margin-bottom: 2rem;
            display: flex;
            justify-content: space-around;
            flex-wrap: wrap;
            gap: 1rem;
        }}
        
        .program-info-item {{
            text-align: center;
        }}
        
        .program-info-label {{
            color: #94a3b8;
            font-size: 0.9rem;
            margin-bottom: 0.25rem;
        }}
        
        .program-info-value {{
            font-size: 1.1rem;
            font-weight: 600;
            color: var(--primary);
        }}
        
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }}
        
        .stat-card {{
            background: var(--card-bg);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            padding: 1.25rem;
            border: 1px solid var(--border);
            text-align: center;
            transition: transform 0.3s ease;
        }}
        
        .stat-card:hover {{
            transform: translateY(-3px);
        }}
        
        .stat-number {{
            font-size: 2rem;
            font-weight: 700;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }}
        
        .stat-label {{
            color: #94a3b8;
            font-size: 0.9rem;
            margin-top: 0.5rem;
        }}
        
        .dashboard {{
            display: grid;
            grid-template-columns: repeat(12, 1fr);
            gap: 1.5rem;
            margin-bottom: 2rem;
        }}
        
        .card {{
            background: var(--card-bg);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            padding: 1.5rem;
            border: 1px solid var(--border);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            animation: fadeInUp 0.8s ease-out forwards;
            opacity: 0;
        }}
        
        .card:hover {{
            transform: translateY(-5px);
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
        }}
        
        .card-header {{
            display: flex;
            align-items: center;
            margin-bottom: 1.5rem;
            padding-bottom: 0.75rem;
            border-bottom: 1px solid var(--border);
        }}
        
        .card-icon {{
            width: 40px;
            height: 40px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 1rem;
            font-size: 1.2rem;
        }}
        
        .card-title {{
            font-size: 1.25rem;
            font-weight: 600;
        }}
        
        .col-12 {{ grid-column: span 12; }}
        .col-8 {{ grid-column: span 8; }}
        .col-6 {{ grid-column: span 6; }}
        .col-4 {{ grid-column: span 4; }}
        
        .division-pills {{
            display: flex;
            gap: 1rem;
            overflow-x: auto;
            padding-bottom: 0.5rem;
            flex-wrap: wrap;
        }}
        
        .division-pill {{
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 50px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            white-space: nowrap;
            box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
            transition: transform 0.2s ease;
        }}
        
        .division-pill:hover {{
            transform: scale(1.05);
        }}
        
        .flowchart-steps {{
            display: flex;
            flex-direction: column;
            gap: 1rem;
            max-height: 600px;
            overflow-y: auto;
            padding-right: 0.5rem;
        }}
        
        .flowchart-steps::-webkit-scrollbar {{
            width: 8px;
        }}
        
        .flowchart-steps::-webkit-scrollbar-track {{
            background: rgba(15, 23, 42, 0.5);
            border-radius: 4px;
        }}
        
        .flowchart-steps::-webkit-scrollbar-thumb {{
            background: var(--primary);
            border-radius: 4px;
        }}
        
        .flow-step {{
            display: flex;
            align-items: center;
            padding: 0.75rem 1rem;
            border-radius: 8px;
            position: relative;
            background: rgba(15, 23, 42, 0.3);
        }}
        
        .flow-step::after {{
            content: '';
            position: absolute;
            bottom: -1rem;
            left: 50%;
            transform: translateX(-50%);
            width: 2px;
            height: 1rem;
            background: var(--border);
        }}
        
        .flow-step:last-child::after {{
            display: none;
        }}
        
        .step-number {{
            width: 35px;
            height: 35px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 1rem;
            font-weight: 600;
            font-size: 0.9rem;
            flex-shrink: 0;
        }}
        
        .step-content {{
            flex: 1;
            word-break: break-word;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
        }}
        
        .dataflow-items {{
            max-height: 400px;
            overflow-y: auto;
            padding-right: 0.5rem;
        }}
        
        .dataflow-item {{
            display: flex;
            align-items: center;
            margin-bottom: 1rem;
            padding: 0.75rem;
            border-radius: 8px;
            background: rgba(15, 23, 42, 0.5);
        }}
        
        .dataflow-icon {{
            width: 40px;
            height: 40px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 1rem;
            flex-shrink: 0;
        }}
        
        .dataflow-content {{
            flex: 1;
        }}
        
        .dataflow-title {{
            font-weight: 600;
            margin-bottom: 0.25rem;
        }}
        
        .dataflow-desc {{
            font-size: 0.9rem;
            color: #94a3b8;
            word-break: break-word;
        }}
        
        .memory-table {{
            width: 100%;
            border-collapse: collapse;
        }}
        
        .memory-table th,
        .memory-table td {{
            padding: 0.75rem;
            text-align: left;
            border-bottom: 1px solid var(--border);
        }}
        
        .memory-table th {{
            font-weight: 600;
            color: var(--primary);
            background: rgba(99, 102, 241, 0.1);
        }}
        
        .memory-table tr:hover {{
            background: rgba(99, 102, 241, 0.1);
        }}
        
        .memory-table td {{
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
        }}
        
        .execution-timeline {{
            position: relative;
            padding-left: 2rem;
            max-height: 500px;
            overflow-y: auto;
        }}
        
        .execution-timeline::before {{
            content: '';
            position: absolute;
            left: 0.5rem;
            top: 0;
            bottom: 0;
            width: 2px;
            background: var(--border);
        }}
        
        .timeline-item {{
            position: relative;
            margin-bottom: 1.5rem;
            padding-bottom: 0.5rem;
        }}
        
        .timeline-item::before {{
            content: '';
            position: absolute;
            left: -1.75rem;
            top: 0.5rem;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: var(--primary);
            box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.2);
        }}
        
        .timeline-step {{
            font-weight: 600;
            margin-bottom: 0.25rem;
            color: var(--primary);
        }}
        
        .timeline-content {{
            background: rgba(15, 23, 42, 0.5);
            padding: 0.75rem;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
            word-break: break-word;
        }}
        
        .empty-state {{
            color: #94a3b8;
            font-style: italic;
            text-align: center;
            padding: 2rem;
        }}
        
        .io {{ background: linear-gradient(135deg, #3b82f6, #1d4ed8); }}
        .input {{ background: linear-gradient(135deg, #10b981, #047857); }}
        .decision {{ background: linear-gradient(135deg, #f59e0b, #d97706); }}
        .compute {{ background: linear-gradient(135deg, #8b5cf6, #6d28d9); }}
        .call {{ background: linear-gradient(135deg, #06b6d4, #0891b2); }}
        .end {{ background: linear-gradient(135deg, #ef4444, #dc2626); }}
        .normal {{ background: linear-gradient(135deg, #64748b, #475569); }}
        
        @keyframes fadeInDown {{
            from {{
                opacity: 0;
                transform: translateY(-20px);
            }}
            to {{
                opacity: 1;
                transform: translateY(0);
            }}
        }}
        
        @keyframes fadeInUp {{
            from {{
                opacity: 0;
                transform: translateY(20px);
            }}
            to {{
                opacity: 1;
                transform: translateY(0);
            }}
        }}
        
        .card:nth-child(1) {{ animation-delay: 0.1s; }}
        .card:nth-child(2) {{ animation-delay: 0.2s; }}
        .card:nth-child(3) {{ animation-delay: 0.3s; }}
        .card:nth-child(4) {{ animation-delay: 0.4s; }}
        .card:nth-child(5) {{ animation-delay: 0.5s; }}
        .card:nth-child(6) {{ animation-delay: 0.6s; }}
        
        @media (max-width: 1200px) {{
            .col-8, .col-6, .col-4 {{
                grid-column: span 12;
            }}
        }}
        
        @media (max-width: 768px) {{
            body {{
                padding: 1rem;
            }}
            
            h1 {{
                font-size: 1.8rem;
            }}
            
            .program-header {{
                flex-direction: column;
            }}
            
            .stats-grid {{
                grid-template-columns: repeat(2, 1fr);
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>COBOL Program Visualization</h1>
            <p class="subtitle">Interactive analysis of program structure and execution flow</p>
            <div class="format-badge">{format_badge}</div>
        </header>
        
        <div class="program-header">
            <div class="program-info-item">
                <div class="program-info-label">Program ID</div>
                <div class="program-info-value">{program_id}</div>
            </div>
            <div class="program-info-item">
                <div class="program-info-label">Author</div>
                <div class="program-info-value">{author}</div>
            </div>
            <div class="program-info-item">
                <div class="program-info-label">Date Written</div>
                <div class="program-info-value">{date_written}</div>
            </div>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">{total_statements}</div>
                <div class="stat-label">Total Statements</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{io_operations}</div>
                <div class="stat-label">I/O Operations</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{computations}</div>
                <div class="stat-label">Computations</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{decisions}</div>
                <div class="stat-label">Decisions</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{calls}</div>
                <div class="stat-label">Calls/Performs</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{num_variables}</div>
                <div class="stat-label">Variables</div>
            </div>
        </div>
        
        <div class="dashboard">
            <div class="card col-12">
                <div class="card-header">
                    <div class="card-icon io">
                        <i class="fas fa-layer-group"></i>
                    </div>
                    <h2 class="card-title">Division Structure</h2>
                </div>
                <div class="division-pills">
                    {division_pills}
                </div>
            </div>
            
            <div class="card col-8">
                <div class="card-header">
                    <div class="card-icon compute">
                        <i class="fas fa-sitemap"></i>
                    </div>
                    <h2 class="card-title">Program Flow</h2>
                </div>
                <div class="flowchart-steps">
                    {flowchart_steps}
                </div>
            </div>
            
            <div class="card col-4">
                <div class="card-header">
                    <div class="card-icon call">
                        <i class="fas fa-exchange-alt"></i>
                    </div>
                    <h2 class="card-title">Data Flow</h2>
                </div>
                <div class="dataflow-items">
                    {dataflow_items}
                </div>
            </div>
            
            <div class="card col-6">
                <div class="card-header">
                    <div class="card-icon input">
                        <i class="fas fa-memory"></i>
                    </div>
                    <h2 class="card-title">Memory Layout</h2>
                </div>
                <div style="overflow-x: auto;">
                    <table class="memory-table">
                        <thead>
                            <tr>
                                <th>Variable</th>
                                <th>Type</th>
                                <th>Initial Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {memory_rows}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="card col-6">
                <div class="card-header">
                    <div class="card-icon decision">
                        <i class="fas fa-history"></i>
                    </div>
                    <h2 class="card-title">Execution Trace</h2>
                </div>
                <div class="execution-timeline">
                    {timeline_items}
                </div>
            </div>
        </div>
    </div>
</body>
</html>
    """
    
    # Generate division pills
    division_pills = ""
    division_icons = {
        "IDENTIFICATION": "fa-id-card",
        "ENVIRONMENT": "fa-globe",
        "DATA": "fa-database",
        "PROCEDURE": "fa-cogs"
    }
    
    if divs:
        for div_name in divs.keys():
            icon = division_icons.get(div_name, "fa-code")
            division_pills += f'<div class="division-pill"><i class="fas {icon}"></i> {div_name} DIVISION</div>'
    else:
        division_pills = '<div class="empty-state">No divisions detected</div>'
    
    # Generate flowchart steps
    flowchart_steps = ""
    if stmts:
        for i, stmt in enumerate(stmts):
            kind = classify(stmt)
            # Truncate long statements
            step_content = stmt[:80] + "..." if len(stmt) > 80 else stmt
            flowchart_steps += f"""
            <div class="flow-step">
                <div class="step-number {kind}">{i+1}</div>
                <div class="step-content">{step_content}</div>
            </div>
            """
    else:
        flowchart_steps = '<div class="empty-state">No executable statements found</div>'
    
    # Generate dataflow items
    dataflow_items = ""
    dataflow_count = 0
    for i, stmt in enumerate(stmts):
        kind = classify(stmt)
        
        if kind == "io":
            # Extract both single and double quoted strings
            msg = re.findall(r'"([^"]*)"', stmt)
            if not msg:
                msg = re.findall(r"'([^']*)'", stmt)
            if msg:
                dataflow_items += f"""
                <div class="dataflow-item">
                    <div class="dataflow-icon io">
                        <i class="fas fa-print"></i>
                    </div>
                    <div class="dataflow-content">
                        <div class="dataflow-title">Output</div>
                        <div class="dataflow-desc">{msg[0]}</div>
                    </div>
                </div>
                """
                dataflow_count += 1
        elif kind == "input":
            var_match = re.search(r'ACCEPT\s+([\w-]+)', stmt, re.I)
            if var_match:
                var_name = var_match.group(1)
                dataflow_items += f"""
                <div class="dataflow-item">
                    <div class="dataflow-icon input">
                        <i class="fas fa-keyboard"></i>
                    </div>
                    <div class="dataflow-content">
                        <div class="dataflow-title">Input</div>
                        <div class="dataflow-desc">Accept value into {var_name}</div>
                    </div>
                </div>
                """
                dataflow_count += 1
        elif kind == "compute":
            # Handle COMPUTE statements
            compute_match = re.search(r'COMPUTE\s+(.+?)\s*=\s*(.+)', stmt, re.I)
            if compute_match:
                target = compute_match.group(1).strip()
                expression = compute_match.group(2).strip()
                dataflow_items += f"""
                <div class="dataflow-item">
                    <div class="dataflow-icon compute">
                        <i class="fas fa-calculator"></i>
                    </div>
                    <div class="dataflow-content">
                        <div class="dataflow-title">Computation</div>
                        <div class="dataflow-desc">{target} = {expression}</div>
                    </div>
                </div>
                """
                dataflow_count += 1
            # Handle MOVE statements
            elif stmt.upper().startswith("MOVE"):
                move_match = re.search(r'MOVE\s+(.+?)\s+TO\s+(.+)', stmt, re.I)
                if move_match:
                    source = move_match.group(1).strip()
                    target = move_match.group(2).strip()
                    dataflow_items += f"""
                    <div class="dataflow-item">
                        <div class="dataflow-icon compute">
                            <i class="fas fa-arrows-alt-h"></i>
                        </div>
                        <div class="dataflow-content">
                            <div class="dataflow-title">Data Movement</div>
                            <div class="dataflow-desc">{source} → {target}</div>
                        </div>
                    </div>
                    """
                    dataflow_count += 1
    
    if not dataflow_items:
        dataflow_items = '<div class="empty-state">No data flow operations detected</div>'
    
    # Generate memory table rows
    memory_rows = ""
    if variables:
        for var in variables:
            memory_rows += f"""
            <tr>
                <td>{var['name']}</td>
                <td>{var['type']}</td>
                <td>{var['value']}</td>
            </tr>
            """
    else:
        memory_rows = '<tr><td colspan="3"><div class="empty-state">No variables defined</div></td></tr>'
    
    # Generate timeline items
    timeline_items = ""
    if stmts:
        for i, stmt in enumerate(stmts):
            kind = classify(stmt)
            timeline_items += f"""
            <div class="timeline-item">
                <div class="timeline-step">Step {i+1} - {kind.upper()}</div>
                <div class="timeline-content">{stmt}</div>
            </div>
            """
    else:
        timeline_items = '<div class="empty-state">No executable statements found</div>'
    
    # Fill the template
    return html_template.format(
        program_id=prog_info["program_id"],
        author=prog_info["author"],
        date_written=prog_info["date_written"],
        format_badge=format_badge,
        total_statements=complexity["total_statements"],
        io_operations=complexity["io_operations"],
        computations=complexity["computations"],
        decisions=complexity["decisions"],
        calls=complexity["calls"],
        num_variables=len(variables),
        division_pills=division_pills,
        flowchart_steps=flowchart_steps,
        dataflow_items=dataflow_items,
        memory_rows=memory_rows,
        timeline_items=timeline_items
    )


def main():
    """Main function to read COBOL file and generate HTML visualization"""
    
    # Get the current directory
    current_dir = os.path.dirname(os.path.abspath(__file__)) if os.path.dirname(os.path.abspath(__file__)) else os.getcwd()
    
    # Input and output file paths
    input_file = os.path.join(current_dir, "program.cob")
    output_file = os.path.join(current_dir, "visualization.html")
    
    print("="*60)
    print("COBOL PROGRAM VISUALIZER")
    print("Supports both FIXED and FREE format COBOL")
    print("="*60)
    print(f"Reading from: {input_file}")
    
    # Check if input file exists
    if not os.path.exists(input_file):
        print(f"\n❌ ERROR: File 'program.cob' not found in {current_dir}")
        print("\nPlease create a file named 'program.cob' in the same directory")
        print("as this script and put your COBOL code in it.")
        return
    
    try:
        # Read the COBOL file
        with open(input_file, 'r', encoding='utf-8') as f:
            cobol_code = f.read()
        
        print(f"✓ Successfully read {len(cobol_code)} characters from program.cob")
        
        # Check format
        if ">>SOURCE FORMAT FREE" in cobol_code.upper():
            print("📝 Detected: FREE FORMAT COBOL")
        else:
            print("📝 Detected: FIXED FORMAT COBOL")
        
        # Generate visualization
        print("⏳ Generating visualization...")
        html_content = generate_html_visualization(cobol_code)
        
        # Write the HTML file
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        print(f"✓ Successfully generated visualization!")
        print(f"\n📄 Output saved to: {output_file}")
        print(f"\n🌐 To view the visualization:")
        print(f"   Open {output_file} in your web browser")
        print("\n" + "="*60)
        print("✨ VISUALIZATION COMPLETE!")
        print("="*60)
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
