import React, { Suspense } from 'react';
import styled from 'styled-components';

// Lazy load WaitSpinner for better performance
const WaitSpinner = React.lazy(() => import('@splunk/react-ui/WaitSpinner'));

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-size: 18px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
`;

const LoadingMessage = styled.div`
  text-align: center;
  margin-top: 16px;
  color: ${(props) => props.theme?.textColor || '#333'};
`;

// Enhanced Loading component using Splunk UI WaitSpinner
function Loading({ 
  type = 'default', 
  message = 'Loading Splunk Dashboard...', 
  size = 'medium'
}) {
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

  // Map size prop to WaitSpinner size prop
  const spinnerSize = size === 'small' ? 'small' : size === 'large' ? 'large' : 'medium';

  return (
    <LoadingContainer>
      <Suspense fallback={<div>Loading...</div>}>
        <WaitSpinner size={spinnerSize} />
      </Suspense>
      <LoadingMessage>
        {getTypeMessage()}
      </LoadingMessage>
    </LoadingContainer>
  );
}

export default Loading;
