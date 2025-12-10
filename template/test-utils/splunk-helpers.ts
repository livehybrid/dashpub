/**
 * Splunk configuration and helper utilities for E2E tests
 * 
 * These helpers encapsulate Splunk-specific behavior and configuration
 * reading from environment variables (populated from GitHub Secrets in CI)
 */

export interface SplunkConfig {
  host: string;
  port: string;
  token: string;
  url?: string; // Full URL if available
}

/**
 * Get Splunk configuration from environment variables
 * 
 * Supports two formats:
 * 1. SPLUNKD_HOST, SPLUNKD_PORT, SPLUNKD_TOKEN (as specified in requirements)
 * 2. SPLUNKD_URL, SPLUNKD_TOKEN (legacy format used in the codebase)
 * 
 * @returns SplunkConfig object with connection details
 * @throws Error if required environment variables are missing
 */
export function getSplunkConfig(): SplunkConfig {
  // Try new format first (SPLUNKD_HOST, SPLUNKD_PORT, SPLUNKD_TOKEN)
  const host = process.env.SPLUNKD_HOST;
  const port = process.env.SPLUNKD_PORT;
  const token = process.env.SPLUNKD_TOKEN;
  
  // Try legacy format (SPLUNKD_URL, SPLUNKD_TOKEN)
  const url = process.env.SPLUNKD_URL;
  
  // Validate required fields
  if (!token) {
    throw new Error(
      'SPLUNKD_TOKEN environment variable is required. ' +
      'Please set it in GitHub Secrets for CI or in your local environment.'
    );
  }
  
  // If we have host and port, construct URL
  if (host && port) {
    // Determine protocol (default to https for port 8089)
    const protocol = port === '8089' ? 'https' : 'http';
    const fullUrl = `${protocol}://${host}:${port}`;
    
    return {
      host,
      port,
      token,
      url: fullUrl,
    };
  }
  
  // If we have URL, parse it
  if (url) {
    try {
      const urlObj = new URL(url);
      return {
        host: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? '8089' : '8080'),
        token,
        url,
      };
    } catch (error) {
      throw new Error(
        `Invalid SPLUNKD_URL format: ${url}. ` +
        'Expected format: https://hostname:port or http://hostname:port'
      );
    }
  }
  
  // Neither format is available
  throw new Error(
    'Splunk configuration is missing. Please provide either:\n' +
    '  - SPLUNKD_HOST, SPLUNKD_PORT, and SPLUNKD_TOKEN, or\n' +
    '  - SPLUNKD_URL and SPLUNKD_TOKEN\n\n' +
    'Set these in GitHub Secrets for CI or in your local environment.'
  );
}

/**
 * Validate that Splunk configuration is present and well-formed
 * 
 * @returns true if configuration is valid, throws Error otherwise
 */
export function validateSplunkConfig(): boolean {
  try {
    const config = getSplunkConfig();
    
    // Additional validation
    if (!config.host || !config.port || !config.token) {
      throw new Error('Splunk configuration is incomplete');
    }
    
    return true;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error validating Splunk configuration');
  }
}

/**
 * Test Splunk connectivity (optional helper)
 * 
 * This can be used to verify Splunk is reachable before running expensive tests
 * 
 * @param config Optional SplunkConfig (will fetch if not provided)
 * @returns Promise<boolean> true if connected, false otherwise
 */
export async function testSplunkConnectivity(config?: SplunkConfig): Promise<boolean> {
  try {
    const splunkConfig = config || getSplunkConfig();
    const testUrl = `${splunkConfig.url}/services/server/info`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${splunkConfig.token}`,
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.warn('Splunk connectivity test failed:', error);
    return false;
  }
}

