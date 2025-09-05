import React, { useEffect, useRef, useState, useMemo } from 'react';
import { getTabRotationInterval, formatInterval } from '../utils/tabRotationConfig';
import { useConfig } from '../contexts/ConfigContext';

/**
 * SplunkTabRotatorAdvanced - Advanced tab rotation component that works directly with Splunk Dashboard framework
 * This component uses multiple strategies to detect and switch tabs in the Splunk Dashboard framework
 */
const SplunkTabRotatorAdvanced = ({ 
  definition, 
  enabled = true, 
  rotationInterval = null, // Will be set from config
  showControls = true 
}) => {
  const { config } = useConfig();
  const intervalRef = useRef(null);
  const [currentTabIndex, setCurrentTabIndex] = useState(0);
  const [isRotating, setIsRotating] = useState(false);
  const [tabs, setTabs] = useState([]);
  const [isDashboardLoaded, setIsDashboardLoaded] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [rotationStatus, setRotationStatus] = useState('initializing');
  const dashboardRef = useRef(null);
  const tabElementsRef = useRef([]);
  const collapseTimerRef = useRef(null);

  // Get rotation interval from config or use fallback (memoized to prevent constant recalculation)
  const effectiveRotationInterval = useMemo(() => {
    return rotationInterval || getTabRotationInterval(config);
  }, [rotationInterval, config?.tabRotation?.interval]);
  
  const effectiveEnabled = useMemo(() => {
    return config?.tabRotation?.enabled !== undefined 
      ? config.tabRotation.enabled && enabled 
      : enabled;
  }, [config?.tabRotation?.enabled, enabled]);

  // Check if dashboard has multiple tabs
  const hasMultipleTabs = definition?.layout?.tabs?.items?.length > 1;

  // Initialize tabs when definition changes
  useEffect(() => {
    if (hasMultipleTabs) {
      const tabItems = definition.layout.tabs.items;
      setTabs(tabItems);
      console.log(`📋 SplunkTabRotatorAdvanced: Found ${tabItems.length} tabs:`, tabItems.map(t => t.label));
    }
  }, [definition, hasMultipleTabs]);

  // Advanced tab detection and switching
  const detectAndSwitchTabs = () => {
    if (!hasMultipleTabs || !enabled) {
      return;
    }

    // Multiple strategies to find tab elements
    const strategies = [
      // Strategy 1: Look for standard tab elements
      () => document.querySelectorAll('[role="tab"], .tab, [class*="tab"]'),
      
      // Strategy 2: Look for Splunk-specific tab elements
      () => document.querySelectorAll('[data-testid*="tab"], [aria-controls*="tab"]'),
      
      // Strategy 3: Look for navigation elements
      () => document.querySelectorAll('.nav-tabs a, .nav-tabs button, .nav-link'),
      
      // Strategy 4: Look for elements with tab-related classes
      () => document.querySelectorAll('[class*="tab"], [class*="Tab"]'),
      
      // Strategy 5: Look for elements with tab-related data attributes
      () => document.querySelectorAll('[data-tab], [data-tab-index], [data-layout-id]'),
      
      // Strategy 6: Look for clickable elements that might be tabs
      () => document.querySelectorAll('button[onclick*="tab"], a[href*="tab"]'),
      
      // Strategy 7: Look for elements with specific Splunk dashboard classes
      () => document.querySelectorAll('[class*="splunk"], [class*="dashboard"] [role="button"]')
    ];

    let foundTabs = [];
    
    for (const strategy of strategies) {
      try {
        const elements = strategy();
        if (elements.length >= tabs.length) {
          foundTabs = Array.from(elements);
          console.log(`✅ SplunkTabRotatorAdvanced: Found ${foundTabs.length} tab elements using strategy`);
          break;
        }
      } catch (error) {
        console.log(`⚠️ SplunkTabRotatorAdvanced: Strategy failed:`, error.message);
      }
    }

    if (foundTabs.length === 0) {
      console.warn('⚠️ SplunkTabRotatorAdvanced: No tab elements found, trying alternative approach');
      
      // Alternative approach: Look for any clickable elements that might be tabs
      const allClickableElements = document.querySelectorAll('button, a, [role="button"], [onclick]');
      const potentialTabs = Array.from(allClickableElements).filter(el => {
        const text = el.textContent?.toLowerCase() || '';
        const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || '';
        return tabs.some(tab => 
          text.includes(tab.label.toLowerCase()) || 
          ariaLabel.includes(tab.label.toLowerCase())
        );
      });
      
      if (potentialTabs.length > 0) {
        foundTabs = potentialTabs;
        console.log(`✅ SplunkTabRotatorAdvanced: Found ${foundTabs.length} potential tab elements by label matching`);
      }
    }

    tabElementsRef.current = foundTabs;
    return foundTabs;
  };

  // Switch to specific tab
  const switchToTab = (tabIndex) => {
    if (tabIndex >= tabs.length) {
      return;
    }

    const targetTab = tabs[tabIndex];
    console.log(`🔄 SplunkTabRotatorAdvanced: Attempting to switch to tab ${tabIndex + 1}: ${targetTab.label}`);

    // Try multiple methods to switch tabs
    const switchMethods = [
      // Method 1: Direct click on tab element
      () => {
        const tabElements = tabElementsRef.current;
        if (tabElements.length > 0 && tabIndex < tabElements.length) {
          const targetElement = tabElements[tabIndex];
          if (targetElement && typeof targetElement.click === 'function') {
            targetElement.click();
            return true;
          }
        }
        return false;
      },

      // Method 2: Click by label matching
      () => {
        const tabElements = tabElementsRef.current;
        const targetElement = tabElements.find(el => {
          const text = el.textContent?.trim().toLowerCase() || '';
          const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || '';
          return text === targetTab.label.toLowerCase() || 
                 ariaLabel === targetTab.label.toLowerCase();
        });
        
        if (targetElement && typeof targetElement.click === 'function') {
          targetElement.click();
          return true;
        }
        return false;
      },

      // Method 3: Dispatch custom event
      () => {
        const switchEvent = new CustomEvent('switchtotab', {
          detail: { 
            tabIndex, 
            tabId: targetTab.layoutId,
            tabLabel: targetTab.label
          }
        });
        document.dispatchEvent(switchEvent);
        return true;
      },

      // Method 4: Try Splunk Dashboard framework API
      () => {
        try {
          if (window.splunkjs && window.splunkjs.mvc) {
            const dashboardComponent = window.splunkjs.mvc.Components.get('dashboard');
            if (dashboardComponent && dashboardComponent.switchToTab) {
              dashboardComponent.switchToTab(tabIndex);
              return true;
            }
          }
        } catch (error) {
          console.log('ℹ️ SplunkTabRotatorAdvanced: Splunk API method not available');
        }
        return false;
      },

      // Method 5: Try to trigger via data attributes
      () => {
        const tabTrigger = document.querySelector(`[data-tab-index="${tabIndex}"]`) ||
                          document.querySelector(`[data-layout-id="${targetTab.layoutId}"]`);
        
        if (tabTrigger && typeof tabTrigger.click === 'function') {
          tabTrigger.click();
          return true;
        }
        return false;
      },

      // Method 6: Try to find and click by position
      () => {
        const tabElements = tabElementsRef.current;
        if (tabElements.length > 0) {
          // Try clicking the first few elements to see if any switch tabs
          const elementsToTry = tabElements.slice(0, Math.min(5, tabElements.length));
          for (let i = 0; i < elementsToTry.length; i++) {
            try {
              elementsToTry[i].click();
              // Wait a bit to see if it worked
              setTimeout(() => {
                console.log(`🔄 SplunkTabRotatorAdvanced: Tried clicking element ${i + 1}`);
              }, 100);
            } catch (error) {
              console.log(`⚠️ SplunkTabRotatorAdvanced: Error clicking element ${i + 1}:`, error);
            }
          }
          return true;
        }
        return false;
      }
    ];

    let success = false;
    for (let i = 0; i < switchMethods.length; i++) {
      try {
        if (switchMethods[i]()) {
          console.log(`✅ SplunkTabRotatorAdvanced: Successfully switched to tab ${tabIndex + 1} using method ${i + 1}`);
          success = true;
          break;
        }
      } catch (error) {
        console.log(`⚠️ SplunkTabRotatorAdvanced: Method ${i + 1} failed:`, error.message);
      }
    }

    if (!success) {
      console.warn(`⚠️ SplunkTabRotatorAdvanced: Could not switch to tab ${tabIndex + 1} (${targetTab.label})`);
    }

    return success;
  };

  // Monitor dashboard loading and detect tabs
  useEffect(() => {
    if (!hasMultipleTabs || !enabled) {
      return;
    }

    const checkDashboardLoaded = () => {
      // Look for Splunk Dashboard framework elements
      const dashboardElement = document.querySelector('[data-testid="dashboard"]') || 
                             document.querySelector('.dashboard') ||
                             document.querySelector('[class*="dashboard"]') ||
                             document.querySelector('[class*="splunk"]') ||
                             document.body;

      if (dashboardElement) {
        setIsDashboardLoaded(true);
        dashboardRef.current = dashboardElement;
        
        // Detect tabs
        const foundTabs = detectAndSwitchTabs();
        if (foundTabs.length > 0) {
          setRotationStatus('ready');
          console.log('✅ SplunkTabRotatorAdvanced: Dashboard loaded and tabs detected');
        } else {
          setRotationStatus('tabs-not-found');
          console.log('⚠️ SplunkTabRotatorAdvanced: Dashboard loaded but tabs not detected');
        }
      } else {
        // Retry after a short delay
        setTimeout(checkDashboardLoaded, 1000);
      }
    };

    checkDashboardLoaded();
  }, [hasMultipleTabs, enabled, tabs]);

  // Start/stop rotation
  const startRotation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setIsRotating(true);
    setCurrentTabIndex(0);
    setRotationStatus('rotating');

    intervalRef.current = setInterval(() => {
      setCurrentTabIndex(prevIndex => {
        const nextIndex = (prevIndex + 1) % tabs.length;
        switchToTab(nextIndex);
        return nextIndex;
      });
    }, effectiveRotationInterval);

    console.log(`🚀 SplunkTabRotatorAdvanced: Started rotation every ${effectiveRotationInterval}ms`);
  };

  const stopRotation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRotating(false);
    setRotationStatus('paused');
    console.log('⏹️ SplunkTabRotatorAdvanced: Stopped rotation');
  };

  // Initialize rotation when dashboard is loaded and enabled
  useEffect(() => {
    if (hasMultipleTabs && effectiveEnabled && isDashboardLoaded && tabs.length > 0) {
      // Wait a bit for the dashboard to fully render
      setTimeout(() => {
        startRotation();
      }, 2000);
    }

    return () => {
      stopRotation();
    };
  }, [hasMultipleTabs, effectiveEnabled, isDashboardLoaded, tabs.length, effectiveRotationInterval]);

  // Auto-collapse after 3 seconds
  useEffect(() => {
    if (hasMultipleTabs && isDashboardLoaded && !isHovered) {
      // Clear existing timer
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current);
      }
      
      // Set new timer to collapse after 3 seconds
      collapseTimerRef.current = setTimeout(() => {
        setIsCollapsed(true);
      }, 3000);
    }
    
    return () => {
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current);
      }
    };
  }, [hasMultipleTabs, isDashboardLoaded, isHovered]);

  // Handle hover events
  const handleMouseEnter = () => {
    setIsHovered(true);
    setIsCollapsed(false);
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    // Restart the collapse timer
    if (hasMultipleTabs && isDashboardLoaded) {
      collapseTimerRef.current = setTimeout(() => {
        setIsCollapsed(true);
      }, 3000);
    }
  };

  const handleClick = () => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setIsHovered(true);
      // Clear any existing timer
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current);
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRotation();
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current);
      }
    };
  }, []);

  // Don't render anything if no multiple tabs or disabled
  if (!hasMultipleTabs || !effectiveEnabled) {
    return null;
  }

  const getStatusColor = () => {
    switch (rotationStatus) {
      case 'ready': return '#27ae60';
      case 'rotating': return '#3498db';
      case 'paused': return '#f39c12';
      case 'tabs-not-found': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getStatusText = () => {
    switch (rotationStatus) {
      case 'ready': return 'Ready';
      case 'rotating': return 'Rotating';
      case 'paused': return 'Paused';
      case 'tabs-not-found': return 'Tabs Not Found';
      default: return 'Initializing';
    }
  };

  return (
    <div 
      className="splunk-tab-rotator-advanced" 
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        padding: isCollapsed ? '8px' : '12px 16px',
        borderRadius: '8px',
        fontSize: '13px',
        fontFamily: 'Arial, sans-serif',
        display: 'flex',
        alignItems: 'center',
        gap: isCollapsed ? '0' : '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        minWidth: isCollapsed ? 'auto' : '300px',
        transition: 'all 0.3s ease',
        cursor: isCollapsed ? 'pointer' : 'default'
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      title={isCollapsed ? `Tab Rotator - ${getStatusText()} - Tab ${currentTabIndex + 1}/${tabs.length}: ${tabs[currentTabIndex]?.label}` : undefined}
    >
      {/* Status indicator - always visible */}
      <div className="rotator-status" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: isCollapsed ? '0' : '8px',
        minWidth: isCollapsed ? 'auto' : 'auto'
      }}>
        <div style={{
          width: isCollapsed ? '16px' : '12px',
          height: isCollapsed ? '16px' : '12px',
          borderRadius: '50%',
          backgroundColor: getStatusColor(),
          animation: rotationStatus === 'rotating' ? 'pulse 1s infinite' : 'none',
          transition: 'all 0.3s ease'
        }} />
        {!isCollapsed && (
          <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
            {getStatusText()}
          </span>
        )}
      </div>
      
      {/* Collapsible content */}
      {!isCollapsed && (
        <>
          <div className="rotator-info" style={{ 
            color: '#ccc',
            display: 'flex',
            gap: '8px',
            flexDirection: 'column',
            alignItems: 'flex-start'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Tab {currentTabIndex + 1}/{tabs.length}:</span>
              <span style={{ fontWeight: 'bold' }}>
                {tabs[currentTabIndex]?.label}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#999' }}>
              Interval: {formatInterval(effectiveRotationInterval)}
            </div>
          </div>

          {showControls && (
            <div className="rotator-controls" style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={isRotating ? stopRotation : startRotation}
                style={{
                  background: isRotating ? '#e74c3c' : '#27ae60',
                  border: 'none',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => e.target.style.opacity = '0.8'}
                onMouseOut={(e) => e.target.style.opacity = '1'}
              >
                {isRotating ? 'Pause' : 'Start'}
              </button>
              
              <button
                onClick={() => {
                  const nextIndex = (currentTabIndex + 1) % tabs.length;
                  setCurrentTabIndex(nextIndex);
                  switchToTab(nextIndex);
                }}
                style={{
                  background: '#3498db',
                  border: 'none',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => e.target.style.opacity = '0.8'}
                onMouseOut={(e) => e.target.style.opacity = '1'}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default SplunkTabRotatorAdvanced;
