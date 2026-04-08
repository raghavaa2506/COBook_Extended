import re

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
            --primary: #4f46e5;
            --secondary: #7c3aed;
            --accent: #ec4899;
            --light: #f8fafc;
            --lighter: #ffffff;
            --dark: #1e293b;
            --card-bg: rgba(255, 255, 255, 0.9);
            --border: rgba(148, 163, 184, 0.2);
            --shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
            --shadow-hover: 0 20px 40px rgba(0, 0, 0, 0.1);
        }}

        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}

        body {{
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 50%, #f5f3ff 100%);
            color: var(--dark);
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
            color: #64748b;
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
            box-shadow: var(--shadow);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            animation: fadeInUp 0.8s ease-out forwards;
            opacity: 0;
            position: relative;
            overflow: hidden;
        }}

        .card::before {{
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, var(--primary), var(--secondary), var(--accent));
            transform: scaleX(0);
            transform-origin: left;
            transition: transform 0.5s ease;
        }}

        .card:hover::before {{
            transform: scaleX(1);
        }}

        .card:hover {{
            transform: translateY(-5px);
            box-shadow: var(--shadow-hover);
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
            color: white;
        }}

        .card-title {{
            font-size: 1.25rem;
            font-weight: 600;
        }}

        .division-card {{
            grid-column: span 3;
            display: flex;
            flex-direction: column;
        }}

        .division-pills {{
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
            box-shadow: 0 4px 15px rgba(79, 70, 229, 0.2);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            cursor: pointer;
            position: relative;
            overflow: hidden;
        }}

        .division-pill::after {{
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 5px;
            height: 5px;
            background: rgba(255, 255, 255, 0.5);
            opacity: 0;
            border-radius: 100%;
            transform: scale(1, 1) translate(-50%);
            transform-origin: 50% 50%;
        }}

        .division-pill:hover::after {{
            animation: ripple 1s ease-out;
        }}

        @keyframes ripple {{
            0% {{
                transform: scale(0, 0);
                opacity: 1;
            }}
            20% {{
                transform: scale(25, 25);
                opacity: 1;
            }}
            100% {{
                opacity: 0;
                transform: scale(40, 40);
            }}
        }}

        .division-pill:hover {{
            transform: scale(1.05);
            box-shadow: 0 6px 20px rgba(79, 70, 229, 0.4);
        }}

        .flowchart-card {{
            grid-column: span 2;
        }}

        .flowchart-container {{
            position: relative;
            padding: 1rem 0;
        }}

        .flowchart-steps {{
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            position: relative;
        }}

        .flowchart-steps::before {{
            content: '';
            position: absolute;
            left: 30px;
            top: 30px;
            bottom: 30px;
            width: 2px;
            background: linear-gradient(to bottom, var(--primary), var(--secondary));
            z-index: 1;
        }}

        .flow-step {{
            display: flex;
            align-items: center;
            position: relative;
            z-index: 2;
            animation: slideInRight 0.5s ease-out forwards;
            opacity: 0;
        }}

        .flow-step:nth-child(1) {{ animation-delay: 0.1s; }}
        .flow-step:nth-child(2) {{ animation-delay: 0.2s; }}
        .flow-step:nth-child(3) {{ animation-delay: 0.3s; }}
        .flow-step:nth-child(4) {{ animation-delay: 0.4s; }}
        .flow-step:nth-child(5) {{ animation-delay: 0.5s; }}
        .flow-step:nth-child(6) {{ animation-delay: 0.6s; }}
        .flow-step:nth-child(7) {{ animation-delay: 0.7s; }}
        .flow-step:nth-child(8) {{ animation-delay: 0.8s; }}

        @keyframes slideInRight {{
            from {{
                opacity: 0;
                transform: translateX(-20px);
            }}
            to {{
                opacity: 1;
                transform: translateX(0);
            }}
        }}

        .flow-icon {{
            width: 60px;
            height: 60px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 1rem;
            font-size: 1.5rem;
            color: white;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
            position: relative;
            transition: transform 0.3s ease;
        }}

        .flow-icon:hover {{
            transform: scale(1.1);
        }}

        .flow-icon::after {{
            content: '';
            position: absolute;
            top: -5px;
            left: -5px;
            right: -5px;
            bottom: -5px;
            border-radius: 50%;
            border: 2px solid rgba(255, 255, 255, 0.5);
            opacity: 0;
            animation: pulse 2s infinite;
        }}

        @keyframes pulse {{
            0% {{
                transform: scale(0.9);
                opacity: 0.7;
            }}
            50% {{
                transform: scale(1.1);
                opacity: 0.3;
            }}
            100% {{
                transform: scale(0.9);
                opacity: 0.7;
            }}
        }}

        .flow-content {{
            flex: 1;
            background: rgba(255, 255, 255, 0.7);
            padding: 1rem;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }}

        .flow-content:hover {{
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }}

        .flow-step-type {{
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 0.25rem;
        }}

        .flow-step-text {{
            font-size: 0.9rem;
        }}

        .dataflow-card {{
            grid-column: span 1;
        }}

        .dataflow-container {{
            position: relative;
        }}

        .dataflow-items {{
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }}

        .dataflow-item {{
            display: flex;
            align-items: center;
            padding: 1rem;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.7);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            animation: fadeIn 0.5s ease-out forwards;
            opacity: 0;
            position: relative;
            overflow: hidden;
        }}

        .dataflow-item:nth-child(1) {{ animation-delay: 0.1s; }}
        .dataflow-item:nth-child(2) {{ animation-delay: 0.2s; }}
        .dataflow-item:nth-child(3) {{ animation-delay: 0.3s; }}
        .dataflow-item:nth-child(4) {{ animation-delay: 0.4s; }}
        .dataflow-item:nth-child(5) {{ animation-delay: 0.5s; }}

        @keyframes fadeIn {{
            from {{
                opacity: 0;
                transform: translateY(10px);
            }}
            to {{
                opacity: 1;
                transform: translateY(0);
            }}
        }}

        .dataflow-item::before {{
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
            transition: left 0.5s ease;
        }}

        .dataflow-item:hover::before {{
            left: 100%;
        }}

        .dataflow-item:hover {{
            transform: translateX(5px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }}

        .dataflow-icon {{
            width: 50px;
            height: 50px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 1rem;
            font-size: 1.5rem;
            color: white;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }}

        .dataflow-content {{
            flex: 1;
        }}

        .dataflow-title {{
            font-weight: 600;
            margin-bottom: 0.25rem;
            font-size: 1rem;
        }}

        .dataflow-desc {{
            font-size: 0.9rem;
            color: #64748b;
        }}

        .memory-table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 0.5rem;
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
            background-color: rgba(79, 70, 229, 0.05);
        }}

        .memory-table tr {{
            transition: background-color 0.2s ease;
            animation: fadeIn 0.5s ease-out forwards;
            opacity: 0;
        }}

        .memory-table tr:nth-child(1) {{ animation-delay: 0.1s; }}
        .memory-table tr:nth-child(2) {{ animation-delay: 0.2s; }}
        .memory-table tr:nth-child(3) {{ animation-delay: 0.3s; }}
        .memory-table tr:nth-child(4) {{ animation-delay: 0.4s; }}
        .memory-table tr:nth-child(5) {{ animation-delay: 0.5s; }}

        .memory-table tr:hover {{
            background-color: rgba(79, 70, 229, 0.05);
        }}

        .memory-table td {{
            position: relative;
        }}

        .memory-table td::after {{
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            width: 0;
            height: 2px;
            background-color: var(--primary);
            transition: width 0.3s ease;
        }}

        .memory-table tr:hover td::after {{
            width: 100%;
        }}

        .execution-timeline {{
            position: relative;
            padding-left: 2rem;
            max-height: 400px;
            overflow-y: auto;
        }}

        .execution-timeline::-webkit-scrollbar {{
            width: 6px;
        }}

        .execution-timeline::-webkit-scrollbar-track {{
            background: rgba(0, 0, 0, 0.05);
            border-radius: 3px;
        }}

        .execution-timeline::-webkit-scrollbar-thumb {{
            background: var(--primary);
            border-radius: 3px;
        }}

        .execution-timeline::before {{
            content: '';
            position: absolute;
            left: 0.5rem;
            top: 0;
            bottom: 0;
            width: 2px;
            background: linear-gradient(to bottom, var(--primary), var(--secondary));
        }}

        .timeline-item {{
            position: relative;
            margin-bottom: 1.5rem;
            padding-bottom: 0.5rem;
            animation: slideInLeft 0.5s ease-out forwards;
            opacity: 0;
        }}

        .timeline-item:nth-child(1) {{ animation-delay: 0.1s; }}
        .timeline-item:nth-child(2) {{ animation-delay: 0.2s; }}
        .timeline-item:nth-child(3) {{ animation-delay: 0.3s; }}
        .timeline-item:nth-child(4) {{ animation-delay: 0.4s; }}
        .timeline-item:nth-child(5) {{ animation-delay: 0.5s; }}
        .timeline-item:nth-child(6) {{ animation-delay: 0.6s; }}
        .timeline-item:nth-child(7) {{ animation-delay: 0.7s; }}
        .timeline-item:nth-child(8) {{ animation-delay: 0.8s; }}

        @keyframes slideInLeft {{
            from {{
                opacity: 0;
                transform: translateX(20px);
            }}
            to {{
                opacity: 1;
                transform: translateX(0);
            }}
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
            box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
        }}

        .timeline-step {{
            font-weight: 600;
            margin-bottom: 0.25rem;
            color: var(--primary);
        }}

        .timeline-content {{
            background: rgba(255, 255, 255, 0.7);
            padding: 0.75rem;
            border-radius: 8px;
            font-family: monospace;
            font-size: 0.9rem;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }}

        .timeline-content:hover {{
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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
                <div class="flowchart-container">
                    <div class="flowchart-steps">
                        {flowchart_steps}
                    </div>
                </div>
            </div>

            <div class="card dataflow-card">
                <div class="card-header">
                    <div class="card-icon call">
                        <i class="fas fa-exchange-alt"></i>
                    </div>
                    <h2 class="card-title">Data Flow</h2>
                </div>
                <div class="dataflow-container">
                    <div class="dataflow-items">
                        {dataflow_items}
                    </div>
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

    # Generate flowchart steps with better visualization
    flowchart_steps = ""
    for i, stmt in enumerate(stmts):
        kind = classify(stmt)
        step_content = stmt[:50] + "..." if len(stmt) > 50 else stmt
        
        # Choose icon based on statement type
        icon_map = {
            "io": "fa-print",
            "input": "fa-keyboard",
            "decision": "fa-code-branch",
            "compute": "fa-calculator",
            "call": "fa-play-circle",
            "end": "fa-stop-circle",
            "normal": "fa-code"
        }
        
        icon = icon_map.get(kind, "fa-code")
        
        # Choose label based on statement type
        label_map = {
            "io": "Output",
            "input": "Input",
            "decision": "Decision",
            "compute": "Computation",
            "call": "Procedure Call",
            "end": "End",
            "normal": "Statement"
        }
        
        label = label_map.get(kind, "Statement")
        
        flowchart_steps += f"""
        <div class="flow-step">
            <div class="flow-icon {kind}">
                <i class="fas {icon}"></i>
            </div>
            <div class="flow-content">
                <div class="flow-step-type">{label}</div>
                <div class="flow-step-text">{step_content}</div>
            </div>
        </div>
        """

    # Generate dataflow items with better visualization
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
        elif kind == "decision":
            if_match = re.search(r'IF\s+(.+?)\s+', stmt.upper())
            if if_match:
                condition = if_match.group(1).strip()
                dataflow_items += f"""
                <div class="dataflow-item">
                    <div class="dataflow-icon decision">
                        <i class="fas fa-code-branch"></i>
                    </div>
                    <div class="dataflow-content">
                        <div class="dataflow-title">Decision</div>
                        <div class="dataflow-desc">If {condition}</div>
                    </div>
                </div>
                """
        elif kind == "call":
            perform_match = re.search(r'PERFORM\s+(.+)', stmt.upper())
            if perform_match:
                procedure = perform_match.group(1).strip()
                dataflow_items += f"""
                <div class="dataflow-item">
                    <div class="dataflow-icon call">
                        <i class="fas fa-play-circle"></i>
                    </div>
                    <div class="dataflow-content">
                        <div class="dataflow-title">Procedure Call</div>
                        <div class="dataflow-desc">Perform {procedure}</div>
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

    # Generate timeline items with better visualization
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
    with open("program.cob") as f:
        code = f.read()

    html = generate_html_visualization(code)
    with open("preview.html", "w") as f:
        f.write(html)

    print("preview.html generated")
