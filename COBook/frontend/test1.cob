       IDENTIFICATION DIVISION.
       PROGRAM-ID. FIBO.

       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01 N   PIC 9(3).
       01 A   PIC 9(5) VALUE 0.
       01 B   PIC 9(5) VALUE 1.
       01 C   PIC 9(5).
       01 I   PIC 9(3).

       PROCEDURE DIVISION.
       MAIN-PROCEDURE.
           DISPLAY "How many terms? (Max 999): ".
           ACCEPT N

           IF N <= 0
               DISPLAY "Please enter a positive number."
               STOP RUN
           END-IF

           DISPLAY "Fibonacci sequence:"
           DISPLAY "Term 1: " A
           IF N > 1
               DISPLAY "Term 2: " B
           END-IF

           PERFORM VARYING I FROM 3 BY 1 UNTIL I > N
               COMPUTE C = A + B
               DISPLAY "Term " I ": " C
               MOVE B TO A
               MOVE C TO B
           END-PERFORM

           STOP RUN.
