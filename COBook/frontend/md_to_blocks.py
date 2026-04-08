from groq import Groq

client = Groq()

with open("visualization.md") as f:
    md = f.read()

prompt = f"""
You are a UI generator.

Convert the following Markdown (which describes COBOL program visualization)
into a SINGLE self-contained HTML file with embedded CSS.

Rules:
- Use modern card-based layout
- Each section becomes a visual block
- Divisions → cards
- Flowchart → vertical step blocks
- Dataflow → side-by-side panels
- Memory layout → table
- Execution trace → timeline
- No markdown in output
- Output only valid HTML+CSS
- Make it look like a real application dashboard

Markdown input:
{md}
"""

resp = client.chat.completions.create(
    model="llama-3.3-70b-versatile",
    messages=[{"role": "user", "content": prompt}],
    temperature=0.2,
)

html = resp.choices[0].message.content

with open("blocks.html", "w") as f:
    f.write(html)

print("blocks.html generated")
