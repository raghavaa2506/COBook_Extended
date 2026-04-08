>>SOURCE FORMAT FREE

IDENTIFICATION DIVISION.
PROGRAM-ID. USERINPUT-DEMO.

DATA DIVISION.
WORKING-STORAGE SECTION.

*> Predefined variables
01 COMPANY-NAME   PIC X(20) VALUE "IIT Tirupati".
01 CURRENT-YEAR   PIC 9(4)  VALUE 2026.

*> User input variables
01 USER-NAME      PIC X(30).
01 USER-AGE       PIC 99.

*> Computed variable
01 BIRTH-YEAR     PIC 9(4).

PROCEDURE DIVISION.
MAIN-PARA.

    DISPLAY "Enter your name: "
    ACCEPT USER-NAME

    DISPLAY "Enter your age: "
    ACCEPT USER-AGE

    COMPUTE BIRTH-YEAR = CURRENT-YEAR - USER-AGE

    DISPLAY "-----------------------------"
    DISPLAY "Welcome, " USER-NAME
    DISPLAY "Organization: " COMPANY-NAME
    DISPLAY "You were born in: " BIRTH-YEAR
    DISPLAY "-----------------------------"

    STOP RUN.
