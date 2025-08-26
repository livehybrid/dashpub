// Mock module for react-resize-detector to resolve ESM import issues
// This provides a basic implementation that satisfies the import requirements

import React from 'react';

// Create a basic mock component
const ReactResizeDetector = ({ children, onResize, ...props }) => {
  React.useEffect(() => {
    // Simulate resize detection
    if (onResize) {
      onResize(800, 600);
    }
  }, [onResize]);

  return children || null;
};

// Export as both default and named exports
export default ReactResizeDetector;
export { ReactResizeDetector };

// Also export as CommonJS for compatibility
module.exports = ReactResizeDetector;
module.exports.default = ReactResizeDetector;
module.exports.ReactResizeDetector = ReactResizeDetector;
