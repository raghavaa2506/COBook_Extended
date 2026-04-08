## Division Structure

- IDENTIFICATION DIVISION
  - PROGRAM-ID. CALC.
- DATA DIVISION
  - WORKING-STORAGE SECTION.
  - 01 A      PIC 9(3).
  - 01 B      PIC 9(3).
  - 01 CH     PIC X.
  - 01 RES    PIC 9(4).
- PROCEDURE DIVISION
  - DISPLAY "Enter first number: ".
  - ACCEPT A.
  - DISPLAY "Enter second number: ".
  - ACCEPT B.
  - DISPLAY "Enter operation (+ or -): ".
  - ACCEPT CH.
  - IF CH = "+"
  - COMPUTE RES = A + B
  - ELSE
  - COMPUTE RES = A - B
  - END-IF.
  - DISPLAY "Result: " RES.
  - STOP RUN.

## Flowchart
```mermaid
flowchart TD
classDef io fill:#E3F2FD,stroke:#1E88E5,stroke-width:1.5px;
classDef decision fill:#FFF3E0,stroke:#FB8C00,stroke-width:1.5px;
classDef compute fill:#E8F5E9,stroke:#43A047,stroke-width:1.5px;
classDef call fill:#F3E5F5,stroke:#8E24AA,stroke-width:1.5px;
classDef normal fill:#ECEFF1,stroke:#455A64;
classDef end fill:#FFEBEE,stroke:#C62828,stroke-width:2px;
A([Start]):::normal
N0["DISPLAY 'Enter first number:<br/>'"]:::io
A --> N0
N1["ACCEPT A"]:::normal
N0 --> N1
N2["DISPLAY 'Enter second number:<br/>'"]:::io
N1 --> N2
N3["ACCEPT B"]:::normal
N2 --> N3
N4["DISPLAY 'Enter operation (+<br/>or -): '"]:::io
N3 --> N4
N5["ACCEPT CH"]:::normal
N4 --> N5
N6["END-IF"]:::normal
N5 --> N6
N7["DISPLAY 'Result: ' RES"]:::io
N6 --> N7
N8(["STOP RUN"]):::end
N7 --> N8
N8 --> Z([End])
```

## Dataflow
```mermaid
flowchart LR
classDef data fill:#FFFDE7,stroke:#F9A825;
classDef io fill:#E3F2FD,stroke:#1E88E5;
```

## Memory Layout

- WORKING-STORAGE SECTION.
- 01 A      PIC 9(3).
- 01 B      PIC 9(3).
- 01 CH     PIC X.
- 01 RES    PIC 9(4).

## Execution Trace

1. Execute `DISPLAY "Enter first number: "`
2. Execute `ACCEPT A`
3. Execute `DISPLAY "Enter second number: "`
4. Execute `ACCEPT B`
5. Execute `DISPLAY "Enter operation (+ or -): "`
6. Execute `ACCEPT CH`
7. Execute `END-IF`
8. Execute `DISPLAY "Result: " RES`
9. Execute `STOP RUN`