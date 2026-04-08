import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, RotateCcw } from 'lucide-react';

const ExecutionAnimation = ({ data }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [variables, setVariables] = useState({});
  
  useEffect(() => {
    if (isPlaying && data && currentStep < data.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStep(currentStep + 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (isPlaying && currentStep >= data.length - 1) {
      setIsPlaying(false);
    }
  }, [isPlaying, currentStep, data]);
  
  const handlePlay = () => {
    setIsPlaying(!isPlaying);
  };
  
  const handleStepForward = () => {
    if (data && currentStep < data.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const handleReset = () => {
    setCurrentStep(0);
    setIsPlaying(false);
    setVariables({});
  };
  
  const updateVariable = (name, value) => {
    setVariables(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  if (!data || data.length === 0) {
    return (
      <div className="text-gray-500 text-center py-8">
        No execution trace available. Please compile the code first.
      </div>
    );
  }
  
  const currentStatement = data[currentStep];
  
  return (
    <div className="border border-gray-200 rounded-md p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePlay}
            className="p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          
          <button
            onClick={handleStepForward}
            disabled={currentStep >= data.length - 1}
            className="p-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SkipForward className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleReset}
            className="p-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
        
        <div className="text-sm text-gray-600">
          Step {currentStep + 1} of {data.length}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Current Statement</h3>
          <div className="bg-gray-100 p-3 rounded-md">
            <div className="text-xs text-gray-500 mb-1">
              {currentStatement.section} - {currentStatement.paragraph}
            </div>
            <div className="font-mono text-sm text-gray-900">
              {currentStatement.statement}
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Variables</h3>
          <div className="bg-gray-100 p-3 rounded-md h-32 overflow-auto">
            {Object.keys(variables).length === 0 ? (
              <div className="text-sm text-gray-500">No variables yet</div>
            ) : (
              <div className="space-y-1">
                {Object.entries(variables).map(([name, value]) => (
                  <div key={name} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{name}</span>
                    <span className="text-sm text-gray-700">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutionAnimation;
