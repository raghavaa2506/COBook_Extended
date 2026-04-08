// API utility functions for COBook frontend

const API_BASE_URL = 'http://localhost:5000/api';

// Execute COBOL code
export const executeCobol = async (code, cellId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, cellId }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error executing COBOL code:', error);
    throw error;
  }
};

// Get AI assistance
export const getAIAssistance = async (prompt, context = '', cellType = 'code', feature = 'generate') => {
  try {
    const response = await fetch(`${API_BASE_URL}/ai-assist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, context, cellType, feature }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting AI assistance:', error);
    throw error;
  }
};

// Generate flowchart visualization
export const generateFlowchart = async (code) => {
  try {
    const response = await fetch(`${API_BASE_URL}/visualization/flowchart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error generating flowchart:', error);
    throw error;
  }
};

// Generate data flow visualization
export const generateDataFlow = async (code) => {
  try {
    const response = await fetch(`${API_BASE_URL}/visualization/dataflow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error generating data flow:', error);
    throw error;
  }
};

// Generate memory layout visualization
export const generateMemoryLayout = async (code) => {
  try {
    const response = await fetch(`${API_BASE_URL}/visualization/memory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error generating memory layout:', error);
    throw error;
  }
};

// Generate division structure visualization
export const generateDivisionStructure = async (code) => {
  try {
    const response = await fetch(`${API_BASE_URL}/visualization/structure`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error generating division structure:', error);
    throw error;
  }
};

// Generate execution trace visualization
export const generateExecutionTrace = async (code) => {
  try {
    const response = await fetch(`${API_BASE_URL}/visualization/trace`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error generating execution trace:', error);
    throw error;
  }
};

// Save notebook
export const saveNotebook = async (notebook) => {
  try {
    const response = await fetch(`${API_BASE_URL}/notebooks/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notebook),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error saving notebook:', error);
    throw error;
  }
};

// Load notebook
export const loadNotebook = async (notebookId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/notebooks/${notebookId}`);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error loading notebook:', error);
    throw error;
  }
};

// Check API health
export const checkAPIHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking API health:', error);
    throw error;
  }
};
