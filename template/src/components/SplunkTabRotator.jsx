import React, { useEffect, useRef, useState } from 'react';

/**
 * SplunkTabRotator - Advanced tab rotation component for Splunk Dashboard framework
 * This component integrates directly with the Splunk Dashboard framework to provide
 * automatic tab rotation for dashboards with multiple tabs.
 */
const SplunkTabRotator = ({ 
  definition, 
  enabled = true, 
  rotationInterval = 15000,
  showControls = true 
}) => {
  const intervalRef = useRef(null);
  const [currentTabIndex, setCurrentTabIndex] = useState(0);
  const [isRotating, setIsRotating] = useState(false);
  const [tabs, setTabs] = useState([]);
  const [isDashboardLoaded, setIsDashboardLoaded] = useState(false);
  const dashboardRef = useRef(null);

  // Check if dashboard has multiple tabs
  const hasMultipleTabs = definition?.layout?.tabs?.items?.length > 1;

  // Initialize tabs when definition changes
  useEffect(() => {
    if (hasMultipleTabs) {
      const tabItems = definition.layout.tabs.items;
      setTabs(tabItems);
      console.log(`📋 SplunkTabRotator: Found ${tabItems.length} tabs:`, tabItems.map(t => t.label));
    }
  }, [definition, hasMultipleTabs]);

  // Monitor dashboard loading
  useEffect(() => {
    if (!hasMultipleTabs || !enabled) {
      return;
    }

    const checkDashboardLoaded = () => {
      // Look for Splunk Dashboard framework elements
      const dashboardElement = document.querySelector('[data-testid="dashboard"]') || 
                             document.querySelector('.dashboard') ||
                             document.querySelector('[class*="dashboard"]') ||
                             document.querySelector('[class*="splunk"]');
      
      if (dashboardElement) {
        setIsDashboardLoaded(true);
        dashboardRef.current = dashboardElement;
        console.log('✅ SplunkTabRotator: Dashboard loaded, ready for tab rotation');
      } else {
        // Retry after a short delay
        setTimeout(checkDashboardLoaded, 1000);
      }
    };

    checkDashboardLoaded();
  }, [hasMultipleTabs, enabled]);

  // Tab switching logic
  const switchToTab = (tabIndex) => {
    if (!isDashboardLoaded || !dashboardRef.current || tabIndex >= tabs.length) {
      return;
    }

    try {
      const targetTab = tabs[tabIndex];
      console.log(`🔄 SplunkTabRotator: Attempting to switch to tab ${tabIndex + 1}: ${targetTab.label}`);

      // Method 1: Look for tab elements and click them
      const tabElements = dashboardRef.current.querySelectorAll(`
        [role="tab"], 
        .tab, 
        [class*="tab"], 
        [data-tab], 
        button[aria-controls*="tab"],
        .nav-tabs a,
        .nav-tabs button
      `);

      if (tabElements.length > 0 && tabIndex < tabElements.length) {
        const targetElement = tabElements[tabIndex];
        if (targetElement && typeof targetElement.click === 'function') {
          targetElement.click();
          console.log(`✅ SplunkTabRotator: Successfully clicked tab element ${tabIndex + 1}`);
          return;
        }
      }

      // Method 2: Try to find tab by label
      const tabByLabel = Array.from(tabElements).find(el => 
        el.textContent?.trim().toLowerCase() === targetTab.label.toLowerCase() ||
        el.getAttribute('aria-label')?.toLowerCase() === targetTab.label.toLowerCase()
      );

      if (tabByLabel && typeof tabByLabel.click === 'function') {
        tabByLabel.click();
        console.log(`✅ SplunkTabRotator: Successfully clicked tab by label: ${targetTab.label}`);
        return;
      }

      // Method 3: Dispatch custom event for Splunk Dashboard framework
      const switchEvent = new CustomEvent('switchtotab', {
        detail: { 
          tabIndex, 
          tabId: targetTab.layoutId,
          tabLabel: targetTab.label
        }
      });
      document.dispatchEvent(switchEvent);
      console.log(`📡 SplunkTabRotator: Dispatched switchtotab event for tab ${tabIndex + 1}`);

      // Method 4: Try to trigger via Splunk Dashboard framework API
      if (window.splunkjs && window.splunkjs.mvc) {
        try {
          const dashboardComponent = window.splunkjs.mvc.Components.get('dashboard');
          if (dashboardComponent && dashboardComponent.switchToTab) {
            dashboardComponent.switchToTab(tabIndex);
            console.log(`✅ SplunkTabRotator: Used Splunk API to switch to tab ${tabIndex + 1}`);
            return;
          }
        } catch (apiError) {
          console.log('ℹ️ SplunkTabRotator: Splunk API method not available');
        }
      }

      // Method 5: Try to find and trigger tab change via data attributes
      const tabTrigger = document.querySelector(`[data-tab-index="${tabIndex}"]`) ||
                        document.querySelector(`[data-layout-id="${targetTab.layoutId}"]`);
      
      if (tabTrigger && typeof tabTrigger.click === 'function') {
        tabTrigger.click();
        console.log(`✅ SplunkTabRotator: Successfully clicked tab trigger for ${targetTab.label}`);
        return;
      }

      console.warn(`⚠️ SplunkTabRotator: Could not switch to tab ${tabIndex + 1} (${targetTab.label})`);

    } catch (error) {
      console.error('❌ SplunkTabRotator: Error switching tabs:', error);
    }
  };

  // Start/stop rotation
  const startRotation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setIsRotating(true);
    setCurrentTabIndex(0);

    intervalRef.current = setInterval(() => {
      setCurrentTabIndex(prevIndex => {
        const nextIndex = (prevIndex + 1) % tabs.length;
        switchToTab(nextIndex);
        return nextIndex;
      });
    }, rotationInterval);

    console.log(`🚀 SplunkTabRotator: Started rotation every ${rotationInterval}ms`);
  };

  const stopRotation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRotating(false);
    console.log('⏹️ SplunkTabRotator: Stopped rotation');
  };

  // Initialize rotation when dashboard is loaded and enabled
  useEffect(() => {
    if (hasMultipleTabs && enabled && isDashboardLoaded && tabs.length > 0) {
      startRotation();
    }

    return () => {
      stopRotation();
    };
  }, [hasMultipleTabs, enabled, isDashboardLoaded, tabs.length, rotationInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRotation();
    };
  }, []);

  // Don't render anything if no multiple tabs or disabled
  if (!hasMultipleTabs || !enabled) {
    return null;
  }

  return (
    <div className="splunk-tab-rotator" style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      zIndex: 1000,
      background: 'rgba(0, 0, 0, 0.85)',
      color: 'white',
      padding: '10px 15px',
      borderRadius: '6px',
      fontSize: '13px',
      fontFamily: 'Arial, sans-serif',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.2)'
    }}>
      <div className="rotator-status" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ fontSize: '16px' }}>
          {isRotating ? '🔄' : '⏸️'}
        </span>
        <span style={{ fontWeight: 'bold' }}>
          Tab {currentTabIndex + 1}/{tabs.length}
        </span>
      </div>
      
      <div className="rotator-info" style={{ color: '#ccc' }}>
        {tabs[currentTabIndex]?.label}
      </div>

      {showControls && (
        <div className="rotator-controls" style={{ display: 'flex', gap: '5px' }}>
          <button
            onClick={isRotating ? stopRotation : startRotation}
            style={{
              background: isRotating ? '#e74c3c' : '#27ae60',
              border: 'none',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 'bold'
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
              padding: '4px 8px',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 'bold'
            }}
            onMouseOver={(e) => e.target.style.opacity = '0.8'}
            onMouseOut={(e) => e.target.style.opacity = '1'}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default SplunkTabRotator;
