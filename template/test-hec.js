#!/usr/bin/env node

/**
 * Test script for Splunk HEC integration
 * 
 * This script tests the HEC client functionality without requiring
 * the full server to be running.
 * 
 * Usage:
 *   node test-hec.js
 *   SPLUNK_HEC_ENABLED=true SPLUNK_HEC_TOKEN=your-token node test-hec.js
 */

require('dotenv').config();

// Mock fetch if not available (Node.js < 18)
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

// HEC configuration
const HEC_CONFIG = {
  enabled: process.env.SPLUNK_HEC_ENABLED === 'true',
  url: process.env.SPLUNK_HEC_URL || process.env.SPLUNKD_URL + '/services/collector',
  token: process.env.SPLUNK_HEC_TOKEN || process.env.SPLUNKD_TOKEN,
  index: process.env.SPLUNK_HEC_INDEX || 'main',
  source: process.env.SPLUNK_HEC_SOURCE || 'dashpub',
  sourcetype: process.env.SPLUNK_HEC_SOURCETYPE || 'dashpub:app:logs',
  host: process.env.SPLUNK_HEC_HOST || require('os').hostname(),
  batchSize: parseInt(process.env.SPLUNK_HEC_BATCH_SIZE) || 100,
  batchTimeout: parseInt(process.env.SPLUNK_HEC_BATCH_TIMEOUT) || 5000,
  maxRetries: parseInt(process.env.SPLUNK_HEC_MAX_RETRIES) || 3,
  retryDelay: parseInt(process.env.SPLUNK_HEC_RETRY_DELAY) || 1000
};

// Simple HEC client for testing
class TestHECClient {
  constructor(config) {
    this.config = config;
    this.batch = [];
    this.batchTimer = null;
    this.isConnected = false;
    this.lastError = null;
    this.stats = {
      sent: 0,
      failed: 0,
      retries: 0
    };
  }

  // Test connection
  async testConnection() {
    console.log('🔍 Testing HEC connection...');
    console.log(`   URL: ${this.config.url}`);
    console.log(`   Token: ${this.config.token ? '***' + this.config.token.slice(-4) : 'NOT SET'}`);
    console.log(`   Index: ${this.config.index}`);
    console.log(`   Source: ${this.config.source}`);
    console.log(`   Sourcetype: ${this.config.sourcetype}`);
    console.log(`   Host: ${this.config.host}`);

    if (!this.config.enabled) {
      console.log('⚠️ HEC is disabled. Set SPLUNK_HEC_ENABLED=true to enable.');
      return false;
    }

    if (!this.config.token) {
      console.log('❌ HEC token is required. Set SPLUNK_HEC_TOKEN.');
      return false;
    }

    try {
      const testEvent = {
        event: {
          message: 'HEC connection test from test script',
          level: 'INFO',
          timestamp: new Date().toISOString(),
          test: true
        },
        index: this.config.index,
        source: this.config.source,
        sourcetype: this.config.sourcetype,
        host: this.config.host,
        time: Math.floor(Date.now() / 1000)
      };

      const response = await fetch(this.config.url, {
        method: 'POST',
        headers: {
          'Authorization': `Splunk ${this.config.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testEvent)
      });

      if (response.ok) {
        this.isConnected = true;
        this.lastError = null;
        console.log('✅ HEC connection test successful!');
        return true;
      } else {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }
    } catch (error) {
      this.isConnected = false;
      this.lastError = error.message;
      console.log(`❌ HEC connection test failed: ${error.message}`);
      return false;
    }
  }

  // Send single event
  async sendEvent(level, message, meta = {}) {
    if (!this.config.enabled || !this.isConnected) {
      console.log(`⚠️ Skipping log send - HEC ${this.config.enabled ? 'not connected' : 'disabled'}`);
      return false;
    }

    const event = {
      event: {
        message,
        level: level.toUpperCase(),
        timestamp: new Date().toISOString(),
        ...meta
      },
      index: this.config.index,
      source: this.config.source,
      sourcetype: this.config.sourcetype,
      host: this.config.host,
      time: Math.floor(Date.now() / 1000)
    };

    try {
      const response = await fetch(this.config.url, {
        method: 'POST',
        headers: {
          'Authorization': `Splunk ${this.config.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });

      if (response.ok) {
        this.stats.sent++;
        console.log(`📤 Sent ${level.toUpperCase()} log: ${message}`);
        return true;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      this.stats.failed++;
      console.log(`❌ Failed to send ${level} log: ${error.message}`);
      return false;
    }
  }

  // Send batch of events
  async sendBatch(events) {
    if (!this.config.enabled || !this.isConnected) {
      console.log(`⚠️ Skipping batch send - HEC ${this.config.enabled ? 'not connected' : 'disabled'}`);
      return false;
    }

    const batch = events.map(event => ({
      event: {
        message: event.message,
        level: event.level.toUpperCase(),
        timestamp: event.timestamp || new Date().toISOString(),
        ...event
      },
      index: this.config.index,
      source: this.config.source,
      sourcetype: this.config.sourcetype,
      host: this.config.host,
      time: Math.floor(Date.now() / 1000)
    }));

    try {
      const response = await fetch(this.config.url, {
        method: 'POST',
        headers: {
          'Authorization': `Splunk ${this.config.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(batch)
      });

      if (response.ok) {
        this.stats.sent += batch.length;
        console.log(`📦 Sent batch of ${batch.length} events successfully`);
        return true;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      this.stats.failed += batch.length;
      console.log(`❌ Failed to send batch: ${error.message}`);
      return false;
    }
  }

  // Get statistics
  getStats() {
    return {
      ...this.stats,
      connected: this.isConnected,
      lastError: this.lastError,
      config: {
        enabled: this.config.enabled,
        url: this.config.url,
        index: this.config.index,
        source: this.config.source,
        sourcetype: this.config.sourcetype,
        host: this.config.host
      }
    };
  }
}

// Main test function
async function runTests() {
  console.log('🧪 Splunk HEC Integration Test');
  console.log('================================\n');

  const hecClient = new TestHECClient(HEC_CONFIG);

  // Test 1: Connection test
  console.log('📋 Test 1: Connection Test');
  const connected = await hecClient.testConnection();
  console.log('');

  if (!connected) {
    console.log('❌ Cannot proceed with tests - HEC connection failed');
    console.log('\n💡 Troubleshooting tips:');
    console.log('   - Check SPLUNK_HEC_ENABLED is set to true');
    console.log('   - Verify SPLUNK_HEC_TOKEN is correct');
    console.log('   - Ensure SPLUNK_HEC_URL is accessible');
    console.log('   - Check Splunk HEC is enabled and configured');
    process.exit(1);
  }

  // Test 2: Single event send
  console.log('📋 Test 2: Single Event Send');
  await hecClient.sendEvent('INFO', 'Test info message from test script', {
    test: true,
    timestamp: new Date().toISOString(),
    script: 'test-hec.js'
  });
  console.log('');

  // Test 3: Multiple event types
  console.log('📋 Test 3: Multiple Event Types');
  const events = [
    { level: 'INFO', message: 'Application started', meta: { component: 'server', test: true } },
    { level: 'WARN', message: 'High memory usage detected', meta: { memory: '85%', test: true } },
    { level: 'ERROR', message: 'Database connection failed', meta: { retry: 3, test: true } },
    { level: 'DEBUG', message: 'Processing user request', meta: { userId: '12345', test: true } }
  ];

  for (const event of events) {
    await hecClient.sendEvent(event.level, event.message, event.meta);
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between sends
  }
  console.log('');

  // Test 4: Batch send
  console.log('📋 Test 4: Batch Send');
  const batchEvents = Array.from({ length: 5 }, (_, i) => ({
    level: 'INFO',
    message: `Batch test message ${i + 1}`,
    meta: { batch: true, index: i, test: true }
  }));

  await hecClient.sendBatch(batchEvents);
  console.log('');

  // Test 5: Performance test
  console.log('📋 Test 5: Performance Test');
  const startTime = Date.now();
  const performanceEvents = Array.from({ length: 10 }, (_, i) => ({
    level: 'INFO',
    message: `Performance test message ${i + 1}`,
    meta: { performance: true, index: i, test: true }
  }));

  await hecClient.sendBatch(performanceEvents);
  const endTime = Date.now();
  console.log(`⏱️ Performance test completed in ${endTime - startTime}ms`);
  console.log('');

  // Final statistics
  console.log('📊 Test Results Summary');
  console.log('========================');
  const stats = hecClient.getStats();
  console.log(`✅ Events sent successfully: ${stats.sent}`);
  console.log(`❌ Events failed: ${stats.failed}`);
  console.log(`🔄 Retry attempts: ${stats.retries}`);
  console.log(`🔗 HEC connected: ${stats.connected ? 'Yes' : 'No'}`);
  console.log(`⚙️ HEC enabled: ${stats.config.enabled ? 'Yes' : 'No'}`);
  console.log(`📊 Target index: ${stats.config.index}`);
  console.log(`🏷️ Sourcetype: ${stats.config.sourcetype}`);
  console.log(`🖥️ Host: ${stats.config.host}`);

  if (stats.failed > 0) {
    console.log(`\n⚠️ Some events failed to send. Check HEC configuration and network connectivity.`);
    process.exit(1);
  } else {
    console.log(`\n🎉 All tests passed successfully!`);
    console.log(`\n💡 Next steps:`);
    console.log(`   - Check your Splunk instance for the test logs`);
    console.log(`   - Search for: index=${stats.config.index} sourcetype="${stats.config.sourcetype}"`);
    console.log(`   - Verify log parsing and indexing is working correctly`);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { TestHECClient, HEC_CONFIG };
