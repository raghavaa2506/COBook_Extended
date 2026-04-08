// backend/cobol-runner.js (complete rewrite with proper I/O handling)
const { exec, spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const TEMP_DIR = path.join(__dirname, 'temp');
const ACTIVE_PROGRAMS = new Map();

let fileCounter = 1;

async function ensureTempDir() {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
    console.log('✓ Temp directory ready:', TEMP_DIR);
  } catch (error) {
    console.error('Error creating temp directory:', error);
  }
}

ensureTempDir();

async function cleanupOldFiles() {
  try {
    const files = await fs.readdir(TEMP_DIR);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file);
      try {
        const stats = await fs.stat(filePath);
        if (now - stats.mtimeMs > oneHour) {
          await fs.unlink(filePath).catch(() => {});
        }
      } catch (err) {}
    }
  } catch (error) {}
}

setInterval(cleanupOldFiles, 30 * 60 * 1000);

function generateShortId() {
  const timestamp = Date.now().toString(36);
  const counter = (fileCounter++).toString(36).padStart(2, '0');
  if (fileCounter > 1000) fileCounter = 1;
  return `p${timestamp.slice(-5)}${counter}`.substring(0, 8);
}

async function execCobol(code, onInputNeeded = null, sessionId = null) {
  const startTime = Date.now();
  const id = generateShortId();
  const sourceFile = path.join(TEMP_DIR, `${id}.cob`);
  const executableFile = path.join(TEMP_DIR, `${id}`);
  const programSessionId = sessionId || uuidv4();

  try {
    await fs.writeFile(sourceFile, code, 'utf8');
    console.log(`\n📝 Compiling program: ${id}`);

    const compileResult = await new Promise((resolve, reject) => {
      const compileCmd = `cobc -x -free -std=cobol2014 -o "${executableFile}" "${sourceFile}" 2>&1`;

      exec(compileCmd, {
        maxBuffer: 10 * 1024 * 1024,
        timeout: 60000,
        cwd: TEMP_DIR
      }, (error, stdout, stderr) => {
        const output = stdout + stderr;

        if (error) {
          console.log('❌ Compilation failed');
          resolve({ success: false, output: output || error.message });
        } else {
          console.log('✅ Compilation successful');
          resolve({ success: true, output: output });
        }
      });
    });

    if (!compileResult.success) {
      await fs.unlink(sourceFile).catch(() => {});
      let errorMsg = compileResult.output;

      if (errorMsg.includes('error:')) {
        const lines = errorMsg.split('\n').filter(line => {
          const trimmed = line.trim();
          return trimmed.includes('error:') || trimmed.includes('warning:') ||
                 (trimmed.length > 0 && !trimmed.startsWith('cobc:'));
        });
        errorMsg = lines.join('\n');
      }

      errorMsg = errorMsg.replace(new RegExp(sourceFile, 'g'), 'program.cob');

      return {
        output: '',
        error: errorMsg,
        executionTime: Date.now() - startTime,
        needsInput: false,
        sessionId: null
      };
    }

    console.log('▶️  Executing program...');

    const needsUserInput = code.toUpperCase().includes('ACCEPT');

    const execResult = await new Promise((resolve, reject) => {
      const childProcess = spawn(executableFile, [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, COB_SET_DEBUG: '0' },
        cwd: TEMP_DIR
      });

      let stdout = '';
      let stderr = '';
      let killed = false;
      let inputPrompted = false;
      let outputTimer = null;

      // Don't set stdin to end - keep it open for input
      childProcess.stdin.setDefaultEncoding('utf8');

      childProcess.stdout.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        console.log('📤 Output:', text.trim());

        if (needsUserInput && !inputPrompted && !killed) {
          if (outputTimer) clearTimeout(outputTimer);
          
          outputTimer = setTimeout(() => {
            if (!inputPrompted && !killed) {
              inputPrompted = true;
              console.log('⌨️  Program waiting for input');

              if (onInputNeeded) {
                onInputNeeded(programSessionId, stdout);
                ACTIVE_PROGRAMS.set(programSessionId, {
                  process: childProcess,
                  resolve,
                  stdout,
                  stderr,
                  sourceFile,
                  executableFile,
                  killed: false
                });
              }
            }
          }, 500);
        }

        if (stdout.length > 1024 * 1024 && !killed) {
          killed = true;
          childProcess.kill();
          resolve({
            success: false,
            output: stdout + '\n\n[Output truncated - exceeded 1MB limit]',
            needsInput: false,
            sessionId: null
          });
        }
      });

      childProcess.stderr.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        console.log('📤 Error:', text.trim());
      });

      childProcess.on('close', (code) => {
        if (outputTimer) clearTimeout(outputTimer);
        console.log(`🔚 Process closed with code: ${code}`);
        
        if (!killed && !ACTIVE_PROGRAMS.has(programSessionId)) {
          if (code === 0) {
            console.log('✅ Execution successful');
            resolve({
              success: true,
              output: stdout,
              stderr: stderr,
              needsInput: false,
              sessionId: null
            });
          } else {
            console.log(`❌ Execution failed with code ${code}`);
            resolve({
              success: false,
              output: stderr || `Process exited with code ${code}\n${stdout}`,
              needsInput: false,
              sessionId: null
            });
          }
        }
      });

      childProcess.on('error', (error) => {
        if (outputTimer) clearTimeout(outputTimer);
        console.log('❌ Process error:', error.message);
        
        if (!killed && !ACTIVE_PROGRAMS.has(programSessionId)) {
          resolve({
            success: false,
            output: error.message,
            needsInput: false,
            sessionId: null
          });
        }
      });

      // Set a global timeout
      setTimeout(() => {
        if (!killed && !ACTIVE_PROGRAMS.has(programSessionId)) {
          killed = true;
          childProcess.kill();
          resolve({
            success: false,
            output: 'Program execution timeout (30 seconds)\n\nLast output:\n' + stdout,
            needsInput: false,
            sessionId: null
          });
        }
      }, 30000);
    });

    if (!ACTIVE_PROGRAMS.has(programSessionId)) {
      const executionTime = Date.now() - startTime;

      try {
        await fs.unlink(sourceFile).catch(() => {});
        await fs.unlink(executableFile).catch(() => {});
        console.log('🧹 Cleanup completed');
      } catch (cleanupError) {
        console.error('⚠️  Cleanup warning:', cleanupError.message);
      }

      console.log(`⏱️  Total time: ${executionTime}ms\n`);

      return {
        output: execResult.output || 'Program executed successfully',
        error: execResult.success ? null : execResult.output,
        executionTime,
        needsInput: false,
        sessionId: null
      };
    }

    return {
      output: stdout || '',
      error: null,
      executionTime: Date.now() - startTime,
      needsInput: true,
      sessionId: programSessionId
    };

  } catch (error) {
    console.error('❌ Runtime error:', error);

    try {
      await fs.unlink(sourceFile).catch(() => {});
      await fs.unlink(executableFile).catch(() => {});
    } catch (cleanupError) {}

    return {
      output: '',
      error: `Runtime error: ${error.message}`,
      executionTime: Date.now() - startTime,
      needsInput: false,
      sessionId: null
    };
  }
}

async function provideInput(sessionId, input) {
  const program = ACTIVE_PROGRAMS.get(sessionId);

  if (!program) {
    console.log('❌ No program found for session:', sessionId);
    return {
      success: false,
      error: 'No program waiting for input with this session ID'
    };
  }

  if (program.process.killed || program.killed) {
    console.log('❌ Program already killed');
    ACTIVE_PROGRAMS.delete(sessionId);
    return {
      success: false,
      error: 'Program has already terminated'
    };
  }

  if (!program.process.stdin.writable) {
    console.log('❌ Stdin not writable');
    ACTIVE_PROGRAMS.delete(sessionId);
    return {
      success: false,
      error: 'Cannot write to program (stdin closed)'
    };
  }

  console.log(`📤 Sending input to program: "${input}"`);
  
  return new Promise((resolvePromise) => {
    let stdout = program.stdout;
    let stderr = program.stderr;
    let resolved = false;
    let outputTimer = null;
    const initialStdoutLength = stdout.length;
    let newOutputReceived = false;

    // Write the input with newline
    try {
      program.process.stdin.write(input + '\n');
      console.log('✓ Input written to stdin');
    } catch (error) {
      console.log('❌ Failed to write input:', error.message);
      ACTIVE_PROGRAMS.delete(sessionId);
      return resolvePromise({
        success: false,
        error: `Failed to write input: ${error.message}`
      });
    }

    // Handle new stdout data
    const stdoutHandler = (data) => {
      const text = data.toString();
      stdout += text;
      newOutputReceived = true;
      console.log('📥 New output after input:', text.trim());
      
      if (outputTimer) clearTimeout(outputTimer);
      
      // Wait for output to stop
      outputTimer = setTimeout(() => {
        if (!resolved && newOutputReceived) {
          console.log('⌨️  Checking if more input needed...');
          
          // Update stored data
          program.stdout = stdout;
          program.stderr = stderr;
          
          // Check if we should prompt for more input
          // If there's new output but the process is still running, likely needs more input
          if (!program.process.killed) {
            console.log('⌨️  Program appears to need more input');
            resolved = true;
            
            resolvePromise({
              success: true,
              output: stdout,
              stderr: stderr,
              needsInput: true,
              sessionId: sessionId
            });
          }
        }
      }, 600);
    };

    const stderrHandler = (data) => {
      stderr += data.toString();
      console.log('📥 New stderr:', data.toString().trim());
    };

    const closeHandler = async (code) => {
      if (outputTimer) clearTimeout(outputTimer);
      console.log(`🔚 Process closed after input with code: ${code}`);
      
      if (!resolved) {
        resolved = true;
        ACTIVE_PROGRAMS.delete(sessionId);

        // Cleanup files
        try {
          await fs.unlink(program.sourceFile).catch(() => {});
          await fs.unlink(program.executableFile).catch(() => {});
          console.log('🧹 Cleanup completed after input');
        } catch (cleanupError) {
          console.log('⚠️  Cleanup warning:', cleanupError.message);
        }

        if (code === 0) {
          console.log('✅ Execution successful after input');
          resolvePromise({
            success: true,
            output: stdout,
            stderr: stderr,
            needsInput: false,
            sessionId: null
          });
        } else {
          console.log(`❌ Execution failed with code ${code} after input`);
          const errorMsg = stderr || `Program terminated with exit code ${code}`;
          resolvePromise({
            success: false,
            error: errorMsg,
            output: stdout,
            stderr: stderr,
            needsInput: false,
            sessionId: null
          });
        }
      }
    };

    const errorHandler = (error) => {
      if (outputTimer) clearTimeout(outputTimer);
      console.log('❌ Process error after input:', error.message);
      
      if (!resolved) {
        resolved = true;
        ACTIVE_PROGRAMS.delete(sessionId);

        resolvePromise({
          success: false,
          error: error.message,
          output: stdout,
          needsInput: false,
          sessionId: null
        });
      }
    };

    // Attach handlers
    program.process.stdout.on('data', stdoutHandler);
    program.process.stderr.on('data', stderrHandler);
    program.process.once('close', closeHandler);
    program.process.once('error', errorHandler);

    // Safety timeout
    setTimeout(() => {
      if (!resolved) {
        if (outputTimer) clearTimeout(outputTimer);
        console.log('⏱️  Timeout waiting for response after input');
        
        resolved = true;
        
        // Check if we got any new output
        if (newOutputReceived) {
          // Got output but timed out - program might be done
          ACTIVE_PROGRAMS.delete(sessionId);
          resolvePromise({
            success: true,
            output: stdout,
            stderr: stderr,
            needsInput: false,
            sessionId: null
          });
        } else {
          // No output at all - error
          ACTIVE_PROGRAMS.delete(sessionId);
          resolvePromise({
            success: false,
            error: 'Timeout: No response from program after providing input',
            output: stdout,
            needsInput: false,
            sessionId: null
          });
        }
      }
    }, 5000); // 5 second timeout for response
  });
}

async function testCobolCompiler() {
  const testCode = `       IDENTIFICATION DIVISION.
       PROGRAM-ID. Test.
       PROCEDURE DIVISION.
           DISPLAY 'COBOL Compiler Test OK'.
           STOP RUN.`;

  console.log('🧪 Testing COBOL compiler...');
  const result = await execCobol(testCode);

  if (result.error) {
    console.error('❌ COBOL compiler test failed:', result.error);
    console.error('⚠️  Make sure GnuCOBOL is installed: sudo apt install gnucobol');
  } else {
    console.log('✅ COBOL compiler test passed');
  }
}

testCobolCompiler();

module.exports = { execCobol, provideInput };
