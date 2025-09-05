/**
 * Tab Rotation Configuration Utility
 * Handles environment variable parsing for tab rotation settings
 */

/**
 * Get the tab rotation interval from config or fallback to environment variables
 * @param {Object} config - Configuration object from API
 * @param {number} defaultInterval - Default interval in milliseconds (default: 15000)
 * @returns {number} Rotation interval in milliseconds
 */
export const getTabRotationInterval = (config = null, defaultInterval = 15000) => {
  // Try to get from config first (runtime configuration)
  if (config?.tabRotation?.interval) {
    const configValue = config.tabRotation.interval;
    
    // Validate the config value
    if (typeof configValue === 'number' && configValue > 0) {
      // Ensure minimum interval of 1 second
      if (configValue < 1000) {
        console.warn(
          `⚠️ Tab rotation interval from config too low: ${configValue}ms. ` +
          `Using minimum: 1000ms`
        );
        return 1000;
      }
      
      // Warn if interval is very long (more than 5 minutes)
      if (configValue > 300000) {
        console.warn(
          `⚠️ Tab rotation interval from config very long: ${configValue}ms (${configValue / 1000}s). ` +
          `Consider using a shorter interval for better user experience.`
        );
      }
      
      console.log(`✅ Tab rotation interval from config: ${configValue}ms (${configValue / 1000}s)`);
      return configValue;
    }
  }
  
  // Fallback to environment variable (build-time configuration)
  const envValue = process.env.REACT_APP_TAB_ROTATION_INTERVAL;
  
  if (!envValue) {
    return defaultInterval;
  }
  
  const parsedValue = parseInt(envValue, 10);
  
  // Validate the parsed value
  if (isNaN(parsedValue) || parsedValue <= 0) {
    console.warn(
      `⚠️ Invalid REACT_APP_TAB_ROTATION_INTERVAL value: "${envValue}". ` +
      `Using default: ${defaultInterval}ms`
    );
    return defaultInterval;
  }
  
  // Ensure minimum interval of 1 second
  if (parsedValue < 1000) {
    console.warn(
      `⚠️ REACT_APP_TAB_ROTATION_INTERVAL value too low: ${parsedValue}ms. ` +
      `Using minimum: 1000ms`
    );
    return 1000;
  }
  
  // Warn if interval is very long (more than 5 minutes)
  if (parsedValue > 300000) {
    console.warn(
      `⚠️ REACT_APP_TAB_ROTATION_INTERVAL value very long: ${parsedValue}ms (${parsedValue / 1000}s). ` +
      `Consider using a shorter interval for better user experience.`
    );
  }
  
  console.log(`✅ Tab rotation interval from env: ${parsedValue}ms (${parsedValue / 1000}s)`);
  return parsedValue;
};

/**
 * Get tab rotation configuration object
 * @param {Object} options - Configuration options
 * @param {Object} options.config - Configuration object from API
 * @param {boolean} options.enabled - Whether rotation is enabled (default: true)
 * @param {number} options.defaultInterval - Default interval in milliseconds (default: 15000)
 * @param {boolean} options.showControls - Whether to show control panel (default: true)
 * @returns {Object} Configuration object
 */
export const getTabRotationConfig = (options = {}) => {
  const {
    config = null,
    enabled = true,
    defaultInterval = 15000,
    showControls = true
  } = options;
  
  // Get enabled state from config if available
  const isEnabled = config?.tabRotation?.enabled !== undefined 
    ? config.tabRotation.enabled 
    : enabled;
  
  return {
    enabled: isEnabled,
    rotationInterval: getTabRotationInterval(config, defaultInterval),
    showControls
  };
};

/**
 * Format interval for display
 * @param {number} interval - Interval in milliseconds
 * @returns {string} Formatted interval string
 */
export const formatInterval = (interval) => {
  const seconds = Math.round(interval / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.round(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  
  const hours = Math.round(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};
