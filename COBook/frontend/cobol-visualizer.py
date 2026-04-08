##just a comment
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


def generate_division_structure(divs):
    out = ["## Division Structure\n"]
    for d in divs:
        out.append(f"- {d} DIVISION")
        for l in divs[d]:
            out.append(f"  - {l}")
    return "\n".join(out)


# ---------- Enhanced Visualization Utilities ----------

def wrap(text, n=28):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        if len(cur) + len(w) > n:
            lines.append(cur)
            cur = w
        else:
            cur += (" " if cur else "") + w
    if cur:
        lines.append(cur)
    return "<br/>".join(lines)


def classify(stmt):
    s = stmt.upper()
    if s.startswith("DISPLAY"):
        return "io"
    if s.startswith("IF"):
        return "decision"
    if s.startswith("PERFORM"):
        return "call"
    if s.startswith(("MOVE", "ADD", "SUBTRACT", "MULTIPLY", "DIVIDE")):
        return "compute"
    if "STOP RUN" in s:
        return "end"
    return "normal"


def generate_flowchart(stmts):
    out = [
        "```mermaid",
        "flowchart TD",
        "classDef io fill:#E3F2FD,stroke:#1E88E5,stroke-width:1.5px;",
        "classDef decision fill:#FFF3E0,stroke:#FB8C00,stroke-width:1.5px;",
        "classDef compute fill:#E8F5E9,stroke:#43A047,stroke-width:1.5px;",
        "classDef call fill:#F3E5F5,stroke:#8E24AA,stroke-width:1.5px;",
        "classDef normal fill:#ECEFF1,stroke:#455A64;",
        "classDef end fill:#FFEBEE,stroke:#C62828,stroke-width:2px;",
        "A([Start]):::normal"
    ]

    prev = "A"
    for i, s in enumerate(stmts):
        kind = classify(s)
        node = f"N{i}"
        label = wrap(s.replace('"', "'"))

        if kind == "decision":
            out.append(f'{node}{{"{label}"}}:::decision')
        elif kind == "io":
            out.append(f'{node}["{label}"]:::io')
        elif kind == "compute":
            out.append(f'{node}["{label}"]:::compute')
        elif kind == "call":
            out.append(f'{node}["{label}"]:::call')
        elif kind == "end":
            out.append(f'{node}(["{label}"]):::end')
        else:
            out.append(f'{node}["{label}"]:::normal')

        out.append(f"{prev} --> {node}")
        prev = node

    out.append(f"{prev} --> Z([End])")
    out.append("```")
    return "\n".join(out)


def generate_dataflow(stmts):
    out = [
        "```mermaid",
        "flowchart LR",
        "classDef data fill:#FFFDE7,stroke:#F9A825;",
        "classDef io fill:#E3F2FD,stroke:#1E88E5;"
    ]

    for i, s in enumerate(stmts):
        if "DISPLAY" in s.upper():
            msg = re.findall(r"'(.*?)'", s)
            if msg:
                out.append(f'M{i}["{wrap(msg[0])}"]:::data --> D{i}([DISPLAY]):::io')

    out.append("```")
    return "\n".join(out)


def generate_memory_layout(divs):
    mem = ["## Memory Layout\n"]
    if "DATA" not in divs:
        mem.append("No DATA DIVISION → No variables allocated.")
    else:
        for l in divs["DATA"]:
            mem.append(f"- {l}")
    return "\n".join(mem)


def generate_execution_trace(stmts):
    out = ["## Execution Trace\n"]
    for i, s in enumerate(stmts, 1):
        out.append(f"{i}. Execute `{s}`")
    return "\n".join(out)


def visualize(code):
    divs = parse_cobol(code)
    proc = divs.get("PROCEDURE", [])
    stmts = extract_statements(proc)

    return "\n\n".join([
        generate_division_structure(divs),
        "## Flowchart\n" + generate_flowchart(stmts),
        "## Dataflow\n" + generate_dataflow(stmts),
        generate_memory_layout(divs),
        generate_execution_trace(stmts)
    ])


if __name__ == "__main__":
    with open("program.cob") as f:
        code = f.read()

    result = visualize(code)
    with open("visualization.md", "w") as f:
        f.write(result)
