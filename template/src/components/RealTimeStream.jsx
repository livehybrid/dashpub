import React, { useState, useEffect, useRef, useCallback } from 'react';

// Real-time data streaming component with WebSocket and Server-Sent Events support
function RealTimeStream({ 
  url, 
  type = 'websocket', // 'websocket' or 'sse'
  onData = () => {},
  onError = () => {},
  onConnect = () => {},
  onDisconnect = () => {},
  autoReconnect = true,
  reconnectInterval = 5000,
  maxReconnectAttempts = 5,
  enabled = true,
  children 
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  const wsRef = useRef(null);
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  // WebSocket connection handling
  const connectWebSocket = useCallback(() => {
    if (!url || !enabled) return;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setConnectionStatus('connected');
        setError(null);
        setReconnectAttempts(0);
        reconnectAttemptsRef.current = 0;
        onConnect();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          onData(data);
        } catch (parseError) {
          console.warn('Failed to parse WebSocket message:', parseError);
          onData(event.data); // Pass raw data if parsing fails
        }
      };

      ws.onerror = (event) => {
        const errorMessage = 'WebSocket connection error';
        setError(errorMessage);
        setConnectionStatus('error');
        onError(errorMessage);
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        setConnectionStatus('disconnected');
        onDisconnect();
        
        // Auto-reconnect logic
        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = reconnectInterval * Math.pow(2, reconnectAttemptsRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            setReconnectAttempts(reconnectAttemptsRef.current);
            connectWebSocket();
          }, delay);
        }
      };
    } catch (error) {
      setError(`Failed to create WebSocket: ${error.message}`);
      onError(error.message);
    }
  }, [url, enabled, autoReconnect, reconnectInterval, maxReconnectAttempts, onConnect, onData, onError, onDisconnect]);

  // Server-Sent Events connection handling
  const connectSSE = useCallback(() => {
    if (!url || !enabled) return;

    try {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setConnectionStatus('connected');
        setError(null);
        setReconnectAttempts(0);
        reconnectAttemptsRef.current = 0;
        onConnect();
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          onData(data);
        } catch (parseError) {
          console.warn('Failed to parse SSE message:', parseError);
          onData(event.data); // Pass raw data if parsing fails
        }
      };

      eventSource.onerror = (event) => {
        const errorMessage = 'SSE connection error';
        setError(errorMessage);
        setConnectionStatus('error');
        onError(errorMessage);
        
        // SSE automatically reconnects, but we can track attempts
        if (eventSource.readyState === EventSource.CLOSED) {
          setIsConnected(false);
          setConnectionStatus('disconnected');
          onDisconnect();
        }
      };

      // Custom event handlers
      eventSource.addEventListener('dashboard-update', (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          onData(data);
        } catch (parseError) {
          console.warn('Failed to parse dashboard-update event:', parseError);
        }
      });

      eventSource.addEventListener('search-complete', (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          onData(data);
        } catch (parseError) {
          console.warn('Failed to parse search-complete event:', parseError);
        }
      });

    } catch (error) {
      setError(`Failed to create EventSource: ${error.message}`);
      onError(error.message);
    }
  }, [url, enabled, onConnect, onData, onError, onDisconnect]);

  // Connection management
  const connect = useCallback(() => {
    if (type === 'websocket') {
      connectWebSocket();
    } else if (type === 'sse') {
      connectSSE();
    }
  }, [type, connectWebSocket, connectSSE]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsConnected(false);
    setConnectionStatus('disconnected');
    setError(null);
  }, []);

  const sendMessage = useCallback((message) => {
    if (type === 'websocket' && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, [type]);

  // Connection status indicator
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return '#28a745';
      case 'connecting':
        return '#ffc107';
      case 'error':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Error';
      default:
        return 'Disconnected';
    }
  };

  // Lifecycle management
  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Render connection status
  const renderStatusIndicator = () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      backgroundColor: '#f8f9fa',
      borderRadius: '6px',
      fontSize: '14px',
      fontFamily: 'monospace'
    }}>
      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: getStatusColor(),
        animation: connectionStatus === 'connecting' ? 'pulse 1.5s infinite' : 'none'
      }} />
      <span>{getStatusText()}</span>
      {type === 'websocket' && (
        <span style={{ color: '#6c757d' }}>
          ({reconnectAttempts}/{maxReconnectAttempts})
        </span>
      )}
    </div>
  );

  // Render error message
  const renderError = () => {
    if (!error) return null;

    return (
      <div style={{
        padding: '12px',
        backgroundColor: '#f8d7da',
        border: '1px solid #f5c6cb',
        borderRadius: '6px',
        color: '#721c24',
        fontSize: '14px',
        marginTop: '8px'
      }}>
        <strong>Connection Error:</strong> {error}
        {autoReconnect && reconnectAttempts < maxReconnectAttempts && (
          <div style={{ marginTop: '8px', fontSize: '12px' }}>
            Attempting to reconnect... ({reconnectAttempts}/{maxReconnectAttempts})
          </div>
        )}
      </div>
    );
  };

  // Render last message info
  const renderLastMessage = () => {
    if (!lastMessage) return null;

    return (
      <div style={{
        padding: '8px',
        backgroundColor: '#e9ecef',
        borderRadius: '4px',
        fontSize: '12px',
        color: '#495057',
        marginTop: '8px',
        fontFamily: 'monospace'
      }}>
        <strong>Last Update:</strong> {new Date().toLocaleTimeString()}
      </div>
    );
  };

  return (
    <div style={{ padding: '16px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h3 style={{ margin: 0, fontSize: '18px' }}>
          Real-time Data Stream ({type.toUpperCase()})
        </h3>
        {renderStatusIndicator()}
      </div>

      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '16px'
      }}>
        <button
          onClick={connect}
          disabled={isConnected}
          style={{
            padding: '8px 16px',
            backgroundColor: isConnected ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isConnected ? 'not-allowed' : 'pointer',
            fontSize: '14px'
          }}
        >
          Connect
        </button>
        
        <button
          onClick={disconnect}
          disabled={!isConnected}
          style={{
            padding: '8px 16px',
            backgroundColor: !isConnected ? '#6c757d' : '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: !isConnected ? 'not-allowed' : 'pointer',
            fontSize: '14px'
          }}
        >
          Disconnect
        </button>
      </div>

      {renderError()}
      {renderLastMessage()}

      {/* Render children with connection context */}
      {children && (
        <div style={{ marginTop: '16px' }}>
          {React.cloneElement(children, {
            isConnected,
            connectionStatus,
            sendMessage,
            lastMessage,
            error
          })}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default RealTimeStream;
