import React from 'react';

// Enhanced Loading component with multiple states and progress indicators
function Loading({ 
  type = 'default', 
  message = 'Loading Splunk Dashboard...', 
  progress = null, 
  showSpinner = true,
  size = 'medium',
  variant = 'primary'
}) {
  const getSpinnerSize = () => {
    switch (size) {
      case 'small': return '16px';
      case 'large': return '32px';
      default: return '24px';
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return { color: '#666', borderColor: '#ddd' };
      case 'success':
        return { color: '#28a745', borderColor: '#28a745' };
      case 'warning':
        return { color: '#ffc107', borderColor: '#ffc107' };
      case 'error':
        return { color: '#dc3545', borderColor: '#dc3545' };
      default:
        return { color: '#007bff', borderColor: '#007bff' };
    }
  };

  const renderSpinner = () => {
    if (!showSpinner) return null;
    
    return (
      <div 
        style={{
          width: getSpinnerSize(),
          height: getSpinnerSize(),
          border: `2px solid ${getVariantStyles().borderColor}`,
          borderTop: `2px solid transparent`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '16px'
        }}
      />
    );
  };

  const renderProgress = () => {
    if (progress === null) return null;
    
    return (
      <div style={{ 
        width: '200px', 
        backgroundColor: '#f0f0f0', 
        borderRadius: '10px', 
        margin: '16px 0',
        overflow: 'hidden'
      }}>
        <div 
          style={{
            width: `${Math.min(100, Math.max(0, progress))}%`,
            height: '8px',
            backgroundColor: getVariantStyles().color,
            transition: 'width 0.3s ease',
            borderRadius: '10px'
          }}
        />
      </div>
    );
  };

  const getTypeMessage = () => {
    switch (type) {
      case 'searching':
        return 'Executing Splunk search...';
      case 'processing':
        return 'Processing search results...';
      case 'rendering':
        return 'Rendering dashboard...';
      case 'connecting':
        return 'Connecting to Splunk...';
      case 'error':
        return 'An error occurred. Retrying...';
      default:
        return message;
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontSize: '18px',
      color: getVariantStyles().color,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {renderSpinner()}
      
      <div style={{ 
        textAlign: 'center',
        marginBottom: '8px'
      }}>
        {getTypeMessage()}
      </div>
      
      {renderProgress()}
      
      {type === 'error' && (
        <div style={{
          fontSize: '14px',
          color: '#666',
          marginTop: '8px'
        }}>
          Please check your connection and try again
        </div>
      )}
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default Loading;
