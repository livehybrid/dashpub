import React, { useState, useEffect } from 'react';
import Loading from './Loading';

// Dashboard-specific loading component with search progress tracking
function DashboardLoading({ 
  searchStatus = 'idle', 
  searchProgress = 0,
  datasourceName = '',
  estimatedTime = null,
  onRetry = null,
  error = null
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);

  const steps = [
    { name: 'Connecting to Splunk', duration: 2000 },
    { name: 'Executing search query', duration: 5000 },
    { name: 'Processing results', duration: 3000 },
    { name: 'Rendering dashboard', duration: 2000 }
  ];

  useEffect(() => {
    if (searchStatus === 'searching') {
      const interval = setInterval(() => {
        setStepProgress(prev => {
          if (prev >= 100) {
            setCurrentStep(prevStep => Math.min(prevStep + 1, steps.length - 1));
            return 0;
          }
          return prev + 2;
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [searchStatus, steps.length]);

  const getStatusMessage = () => {
    switch (searchStatus) {
      case 'connecting':
        return 'Establishing connection to Splunk...';
      case 'searching':
        return `Executing search: ${datasourceName || 'Unknown datasource'}`;
      case 'processing':
        return 'Processing search results...';
      case 'rendering':
        return 'Rendering dashboard visualizations...';
      case 'error':
        return 'Search failed. Please try again.';
      case 'complete':
        return 'Dashboard loaded successfully!';
      default:
        return 'Preparing dashboard...';
    }
  };

  const getVariant = () => {
    switch (searchStatus) {
      case 'error':
        return 'error';
      case 'complete':
        return 'success';
      default:
        return 'primary';
    }
  };

  const getProgress = () => {
    if (searchStatus === 'error') return null;
    if (searchStatus === 'complete') return 100;
    
    const baseProgress = (currentStep / steps.length) * 100;
    const stepProgressPercent = (stepProgress / 100) * (100 / steps.length);
    return Math.min(100, baseProgress + stepProgressPercent);
  };

  const renderStepIndicator = () => {
    if (searchStatus !== 'searching') return null;

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginTop: '20px',
        width: '300px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          marginBottom: '8px',
          fontSize: '12px',
          color: '#666'
        }}>
          <span>Step {currentStep + 1} of {steps.length}</span>
          <span>{Math.round(getProgress())}%</span>
        </div>
        
        <div style={{
          width: '100%',
          height: '4px',
          backgroundColor: '#f0f0f0',
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${getProgress()}%`,
            height: '100%',
            backgroundColor: '#007bff',
            transition: 'width 0.3s ease',
            borderRadius: '2px'
          }} />
        </div>
        
        <div style={{
          marginTop: '8px',
          fontSize: '14px',
          color: '#007bff',
          fontWeight: '500'
        }}>
          {steps[currentStep]?.name}
        </div>
      </div>
    );
  };

  const renderErrorDetails = () => {
    if (searchStatus !== 'error' || !error) return null;

    return (
      <div style={{
        marginTop: '20px',
        padding: '16px',
        backgroundColor: '#f8d7da',
        border: '1px solid #f5c6cb',
        borderRadius: '8px',
        maxWidth: '400px',
        textAlign: 'left'
      }}>
        <div style={{
          fontSize: '14px',
          color: '#721c24',
          marginBottom: '8px',
          fontWeight: '500'
        }}>
          Error Details:
        </div>
        <div style={{
          fontSize: '12px',
          color: '#721c24',
          fontFamily: 'monospace',
          wordBreak: 'break-word'
        }}>
          {error.message || error.toString()}
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              marginTop: '12px',
              padding: '8px 16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
          >
            Retry Search
          </button>
        )}
      </div>
    );
  };

  const renderEstimatedTime = () => {
    if (!estimatedTime || searchStatus === 'complete') return null;

    return (
      <div style={{
        marginTop: '16px',
        fontSize: '14px',
        color: '#666',
        fontStyle: 'italic'
      }}>
        Estimated time remaining: {estimatedTime}
      </div>
    );
  };

  return (
    <Loading
      type={searchStatus === 'error' ? 'error' : 'default'}
      message={getStatusMessage()}
      progress={getProgress()}
      variant={getVariant()}
      size="large"
    >
      {renderStepIndicator()}
      {renderErrorDetails()}
      {renderEstimatedTime()}
    </Loading>
  );
}

export default DashboardLoading;
