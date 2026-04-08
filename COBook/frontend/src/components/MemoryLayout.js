import React from 'react';

const MemoryLayout = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-gray-500 text-center py-8">
        No memory layout information available. Please compile the code first.
      </div>
    );
  }
  
  return (
    <div className="border border-gray-200 rounded-md p-4">
      <div className="space-y-4">
        {data.map((group, groupIndex) => (
          <div key={groupIndex} className="border border-gray-300 rounded-md p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">
                Level {group.level} Variables
              </h3>
              <span className="text-xs text-gray-500">
                Size: {group.size} bytes
              </span>
            </div>
            
            <div className="space-y-2">
              {group.variables.map((variable, varIndex) => (
                <div key={varIndex} className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">
                        {variable.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        Offset: {variable.offset}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-gray-600">
                        PIC {variable.pic}
                      </span>
                      <span className="text-xs text-gray-500">
                        Size: {variable.size} bytes
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        variable.type === 'numeric' ? 'bg-blue-100 text-blue-800' :
                        variable.type === 'alphanumeric' ? 'bg-green-100 text-green-800' :
                        variable.type === 'numeric-decimal' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {variable.type}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MemoryLayout;
