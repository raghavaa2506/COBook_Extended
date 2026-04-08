import re
from urllib import request
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
import re

app = Flask(__name__)
CORS(app)

def parse_cobol(code):
    divisions = {}
    current = None
    lines = [l.rstrip() for l in code.splitlines() if l.strip()]

    for line in lines:
        m = re.match(r"\s*(\w+)\s+DIVISION\.", line, re.I)
        if m:
            current = m.group(1).upper()
            divisions[current] = []
        elif current:
            divisions[current].append(line.strip())

    return divisions


def extract_statements(proc_lines):
    stmts = []
    for l in proc_lines:
        if l.endswith('.'):
            stmts.append(l.replace('.', '').strip())
    return stmts


def classify(stmt):
    s = stmt.upper()
    if s.startswith("DISPLAY"):
        return "io"
    if s.startswith("IF"):
        return "decision"
    if s.startswith("PERFORM"):
        return "call"
    if s.startswith(("MOVE", "ADD", "SUBTRACT", "MULTIPLY", "DIVIDE", "COMPUTE")):
        return "compute"
    if "STOP RUN" in s:
        return "end"
    if s.startswith("ACCEPT"):
        return "input"
    return "normal"

# Add this new endpoint to your Flask app
@app.route('/api/visualize', methods=['POST', 'OPTIONS'])
def visualize_code():
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        # Get JSON data from request body
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        code = data.get('code', '')
        
        if not code:
            return jsonify({'success': False, 'error': 'No code provided'}), 400
        
        # Generate the HTML visualization
        html = generate_html_visualization(code)
        
        return jsonify({
            'success': True,
            'html': html
        })
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in visualize_code: {error_details}")
        return jsonify({
            'success': False, 
            'error': str(e),
            'details': error_details
        }), 500


def generate_html_visualization(code):
    divs = parse_cobol(code)
    proc = divs.get("PROCEDURE", [])
    stmts = extract_statements(proc)
    
    # Extract variables from DATA division
    variables = []
    if "DATA" in divs:
        var_pattern = re.compile(r'^\s*01\s+(\w+)\s+PIC\s+([^\s.]+)(?:\s+VALUE\s+([^\s.]+))?', re.I)
        for l in divs["DATA"]:
            match = var_pattern.match(l)
            if match:
                var_name = match.group(1)
                pic_type = match.group(2)
                init_value = match.group(3) if match.group(3) else "N/A"
                variables.append({"name": var_name, "type": pic_type, "value": init_value})
    
    # Create HTML template with escaped curly braces
    html_template = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>COBOL Program Visualization</title>
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
            max-width: 1400px;
            margin: 0 auto;
        }}
        
        header {{
            text-align: center;
            margin-bottom: 3rem;
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
        
        .dashboard {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
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
        
        .division-card {{
            grid-column: span 3;
            display: flex;
            gap: 1rem;
            overflow-x: auto;
            padding-bottom: 0.5rem;
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
        
        .flowchart-card {{
            grid-column: span 2;
        }}
        
        .flowchart-steps {{
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }}
        
        .flow-step {{
            display: flex;
            align-items: center;
            padding: 0.75rem 1rem;
            border-radius: 8px;
            position: relative;
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
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 1rem;
            font-weight: 600;
            font-size: 0.9rem;
        }}
        
        .step-content {{
            flex: 1;
        }}
        
        .dataflow-card {{
            grid-column: span 1;
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
        }}
        
        .memory-table tr:hover {{
            background: rgba(99, 102, 241, 0.1);
        }}
        
        .execution-timeline {{
            position: relative;
            padding-left: 2rem;
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
        }}
        
        .timeline-step {{
            font-weight: 600;
            margin-bottom: 0.25rem;
        }}
        
        .timeline-content {{
            background: rgba(15, 23, 42, 0.5);
            padding: 0.75rem;
            border-radius: 8px;
            font-family: monospace;
            font-size: 0.9rem;
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
        
        @media (max-width: 768px) {{
            .dashboard {{
                grid-template-columns: 1fr;
            }}
            
            .division-card,
            .flowchart-card,
            .dataflow-card {{
                grid-column: span 1;
            }}
            
            body {{
                padding: 1rem;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>COBOL Program Visualization</h1>
            <p class="subtitle">Interactive analysis of program structure and execution flow</p>
        </header>
        
        <div class="dashboard">
            <div class="card division-card">
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
            
            <div class="card flowchart-card">
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
            
            <div class="card dataflow-card">
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
            
            <div class="card">
                <div class="card-header">
                    <div class="card-icon input">
                        <i class="fas fa-memory"></i>
                    </div>
                    <h2 class="card-title">Memory Layout</h2>
                </div>
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
            
            <div class="card">
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
    
    for div_name in divs.keys():
        icon = division_icons.get(div_name, "fa-code")
        division_pills += f'<div class="division-pill"><i class="fas {icon}"></i> {div_name} DIVISION</div>'
    
    # Generate flowchart steps
    flowchart_steps = ""
    for i, stmt in enumerate(stmts):
        kind = classify(stmt)
        step_content = stmt[:50] + "..." if len(stmt) > 50 else stmt
        flowchart_steps += f"""
        <div class="flow-step">
            <div class="step-number {kind}">{i+1}</div>
            <div class="step-content">{step_content}</div>
        </div>
        """
    
    # Generate dataflow items
    dataflow_items = ""
    for i, stmt in enumerate(stmts):
        kind = classify(stmt)
        if kind == "io":
            msg = re.findall(r"'(.*?)'", stmt)
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
        elif kind == "input":
            var_match = re.search(r'ACCEPT\s+(\w+)', stmt.upper())
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
        elif kind == "compute":
            compute_match = re.search(r'COMPUTE\s+(.+?)\s*=\s*(.+)', stmt.upper())
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
    
    # Generate memory table rows
    memory_rows = ""
    for var in variables:
        memory_rows += f"""
        <tr>
            <td>{var['name']}</td>
            <td>{var['type']}</td>
            <td>{var['value']}</td>
        </tr>
        """
    
    if not memory_rows:
        memory_rows = '<tr><td colspan="3">No variables defined</td></tr>'
    
    # Generate timeline items
    timeline_items = ""
    for i, stmt in enumerate(stmts):
        kind = classify(stmt)
        timeline_items += f"""
        <div class="timeline-item">
            <div class="timeline-step">Step {i+1}</div>
            <div class="timeline-content">{stmt}</div>
        </div>
        """
    
    # Fill the template
    return html_template.format(
        division_pills=division_pills,
        flowchart_steps=flowchart_steps,
        dataflow_items=dataflow_items,
        memory_rows=memory_rows,
        timeline_items=timeline_items
    )


if __name__ == "__main__":
    app.run(debug=True, port=5001, host='0.0.0.0')

    with open("program.cob") as f:
        code = f.read()

    html = generate_html_visualization(code)
    with open("preview.html", "w") as f:
        f.write(html)

    print("preview.html generated")
