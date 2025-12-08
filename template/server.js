const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');

// Load environment variables from .env file
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Enhanced logging with rotation, retention, and Splunk HEC support
const LOG_ROTATION_CONFIG = {
  maxSize: process.env.LOG_MAX_SIZE || '10m', // Max file size before rotation
  maxFiles: process.env.LOG_MAX_FILES || 5,   // Number of rotated files to keep
  logDir: process.env.LOG_DIR || './logs',    // Directory for log files
  retentionDays: process.env.LOG_RETENTION_DAYS || 30 // Days to keep logs
};

// Splunk HEC configuration
const SPLUNK_HEC_CONFIG = {
  enabled: process.env.SPLUNK_HEC_ENABLED === 'true',
  url: process.env.SPLUNK_HEC_URL || process.env.SPLUNKD_URL + '/services/collector',
  token: process.env.SPLUNK_HEC_TOKEN || process.env.SPLUNKD_TOKEN,
  index: process.env.SPLUNK_HEC_INDEX || 'main',
  source: process.env.SPLUNK_HEC_SOURCE || 'dashpub',
  sourcetype: process.env.SPLUNK_HEC_SOURCETYPE || 'dashpub:app:logs',
  host: process.env.SPLUNK_HEC_HOST || require('os').hostname(),
  batchSize: parseInt(process.env.SPLUNK_HEC_BATCH_SIZE) || 100,
  batchTimeout: parseInt(process.env.SPLUNK_HEC_BATCH_TIMEOUT) || 5000, // 5 seconds
  maxRetries: parseInt(process.env.SPLUNK_HEC_MAX_RETRIES) || 3,
  retryDelay: parseInt(process.env.SPLUNK_HEC_RETRY_DELAY) || 1000 // 1 second
};

// Ensure log directory exists
if (!fs.existsSync(LOG_ROTATION_CONFIG.logDir)) {
  fs.mkdirSync(LOG_ROTATION_CONFIG.logDir, { recursive: true });
}

// Parse size string (e.g., '10m', '1g') to bytes
function parseSize(sizeStr) {
  const units = { 'b': 1, 'k': 1024, 'm': 1024*1024, 'g': 1024*1024*1024 };
  const match = sizeStr.toLowerCase().match(/^(\d+(?:\.\d+)?)([bkmg])?$/);
  if (!match) return 10 * 1024 * 1024; // Default to 10MB
  
  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';
  return Math.floor(value * units[unit]);
}

// Enhanced logger with file rotation
class RotatingLogger {
  constructor() {
    this.currentLogFile = path.join(LOG_ROTATION_CONFIG.logDir, 'app.log');
    this.maxSizeBytes = parseSize(LOG_ROTATION_CONFIG.maxSize);
    this.maxFiles = parseInt(LOG_ROTATION_CONFIG.maxFiles);
    this.retentionDays = parseInt(LOG_ROTATION_CONFIG.retentionDays);
    
    // Initialize log file if it doesn't exist
    if (!fs.existsSync(this.currentLogFile)) {
      fs.writeFileSync(this.currentLogFile, '');
    }
    
    // Clean up old logs on startup
    this.cleanupOldLogs();
  }

  // Write log entry to file
  writeLog(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...meta
    };

    const logLine = JSON.stringify(logEntry) + '\n';
    
    try {
      // Check if current log file needs rotation
      const stats = fs.statSync(this.currentLogFile);
      if (stats.size + logLine.length > this.maxSizeBytes) {
        this.rotateLog();
      }
      
      // Append to current log file
      fs.appendFileSync(this.currentLogFile, logLine);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  // Rotate log file
  rotateLog() {
    try {
      // Remove oldest log file if we've reached max files
      const oldestLog = path.join(LOG_ROTATION_CONFIG.logDir, `app.${this.maxFiles}.log`);
      if (fs.existsSync(oldestLog)) {
        fs.unlinkSync(oldestLog);
      }

      // Shift existing log files
      for (let i = this.maxFiles - 1; i >= 1; i--) {
        const oldFile = path.join(LOG_ROTATION_CONFIG.logDir, `app.${i}.log`);
        const newFile = path.join(LOG_ROTATION_CONFIG.logDir, `app.${i + 1}.log`);
        if (fs.existsSync(oldFile)) {
          fs.renameSync(oldFile, newFile);
        }
      }

      // Rename current log file
      const rotatedFile = path.join(LOG_ROTATION_CONFIG.logDir, 'app.1.log');
      fs.renameSync(this.currentLogFile, rotatedFile);

      // Create new current log file
      fs.writeFileSync(this.currentLogFile, '');
      
      console.log(`Log rotated: ${this.currentLogFile} -> ${rotatedFile}`);
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  // Clean up old log files based on retention policy
  cleanupOldLogs() {
    try {
      const files = fs.readdirSync(LOG_ROTATION_CONFIG.logDir);
      const cutoffTime = Date.now() - (this.retentionDays * 24 * 60 * 60 * 1000);
      
      files.forEach(file => {
        if (file.startsWith('app.') && file.endsWith('.log')) {
          const filePath = path.join(LOG_ROTATION_CONFIG.logDir, file);
          const stats = fs.statSync(filePath);
          
          if (stats.mtime.getTime() < cutoffTime) {
            fs.unlinkSync(filePath);
            console.log(`Removed old log file: ${file}`);
          }
        }
      });
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }

  // Log methods
  info(message, meta = {}) {
    this.writeLog('info', message, meta);
    console.log(`[INFO] ${message}`, meta);
  }

  error(message, meta = {}) {
    this.writeLog('error', message, meta);
    console.error(`[ERROR] ${message}`, meta);
  }

  warn(message, meta = {}) {
    this.writeLog('warn', message, meta);
    console.warn(`[WARN] ${message}`, meta);
  }

  debug(message, meta = {}) {
    this.writeLog('debug', message, meta);
    console.log(`[DEBUG] ${message}`, meta);
  }

  // Get log statistics
  getStats() {
    try {
      const files = fs.readdirSync(LOG_ROTATION_CONFIG.logDir);
      const stats = {
        totalFiles: files.length,
        currentSize: 0,
        totalSize: 0,
        oldestFile: null,
        newestFile: null
      };

      files.forEach(file => {
        if (file.endsWith('.log')) {
          const filePath = path.join(LOG_ROTATION_CONFIG.logDir, file);
          const fileStats = fs.statSync(filePath);
          
          stats.totalSize += fileStats.size;
          if (file === 'app.log') {
            stats.currentSize = fileStats.size;
          }
          
          if (!stats.oldestFile || fileStats.mtime < stats.oldestFile) {
            stats.oldestFile = fileStats.mtime;
          }
          if (!stats.newestFile || fileStats.mtime > stats.newestFile) {
            stats.newestFile = fileStats.mtime;
          }
        }
      });

      return stats;
    } catch (error) {
      return { error: error.message };
    }
  }
}

// Initialize rotating logger
const rotatingLogger = new RotatingLogger();

// Splunk HEC client for sending logs to Splunk
class SplunkHECClient {
  constructor(config) {
    this.config = config;
    this.batch = [];
    this.batchTimer = null;
    this.isConnected = false;
    this.retryCount = 0;
    this.lastError = null;
    
    // Test connection on startup if enabled
    if (this.config.enabled) {
      this.testConnection();
    }
  }

  // Test HEC connection
  async testConnection() {
    try {
      const response = await fetch(this.config.url, {
        method: 'POST',
        headers: {
          'Authorization': `Splunk ${this.config.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event: {
            message: 'HEC connection test',
            level: 'INFO',
            timestamp: new Date().toISOString()
          },
          index: this.config.index,
          source: this.config.source,
          sourcetype: this.config.sourcetype,
          host: this.config.host
        })
      });

      if (response.ok) {
        this.isConnected = true;
        this.lastError = null;
        console.log('✅ Splunk HEC connection established successfully');
      } else {
        this.isConnected = false;
        this.lastError = `HTTP ${response.status}: ${response.statusText}`;
        console.warn('⚠️ Splunk HEC connection failed:', this.lastError);
      }
    } catch (error) {
      this.isConnected = false;
      this.lastError = error.message;
      console.warn('⚠️ Splunk HEC connection error:', error.message);
    }
  }

  // Add log entry to batch
  addToBatch(logEntry) {
    if (!this.config.enabled) return;

    const hecEvent = {
      event: {
        message: logEntry.message,
        level: logEntry.level,
        timestamp: logEntry.timestamp,
        ...logEntry
      },
      index: this.config.index,
      source: this.config.source,
      sourcetype: this.config.sourcetype,
      host: this.config.host,
      time: new Date(logEntry.timestamp).getTime() / 1000 // Unix timestamp
    };

    this.batch.push(hecEvent);

    // Send batch if it reaches the size limit
    if (this.batch.length >= this.config.batchSize) {
      this.sendBatch();
    } else if (!this.batchTimer) {
      // Set timer to send batch after timeout
      this.batchTimer = setTimeout(() => {
        this.sendBatch();
      }, this.config.batchTimeout);
    }
  }

  // Send batch to Splunk HEC
  async sendBatch() {
    if (this.batch.length === 0) return;

    // Clear timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    const batchToSend = [...this.batch];
    this.batch = [];

    try {
      const response = await fetch(this.config.url, {
        method: 'POST',
        headers: {
          'Authorization': `Splunk ${this.config.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(batchToSend)
      });

      if (response.ok) {
        this.isConnected = true;
        this.lastError = null;
        this.retryCount = 0;
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`📤 Sent ${batchToSend.length} log entries to Splunk HEC`);
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      this.lastError = error.message;
      this.isConnected = false;
      
      // Retry logic
      if (this.retryCount < this.config.maxRetries) {
        this.retryCount++;
        console.warn(`⚠️ HEC send failed, retrying ${this.retryCount}/${this.config.maxRetries}:`, error.message);
        
        // Add back to batch for retry
        this.batch.unshift(...batchToSend);
        
        // Exponential backoff
        const delay = this.config.retryDelay * Math.pow(2, this.retryCount - 1);
        setTimeout(() => {
          this.sendBatch();
        }, delay);
      } else {
        console.error('❌ HEC send failed after max retries:', error.message);
        this.retryCount = 0;
      }
    }
  }

  // Force send remaining batch
  async flush() {
    if (this.batch.length > 0) {
      await this.sendBatch();
    }
  }

  // Get HEC status
  getStatus() {
    return {
      enabled: this.config.enabled,
      connected: this.isConnected,
      lastError: this.lastError,
      batchSize: this.batch.length,
      retryCount: this.retryCount,
      config: {
        url: this.config.url,
        index: this.config.index,
        source: this.config.source,
        sourcetype: this.config.sourcetype,
        host: this.config.host
      }
    };
  }
}

// Initialize Splunk HEC client
const hecClient = new SplunkHECClient(SPLUNK_HEC_CONFIG);

// Enhanced logger that uses console, file, and Splunk HEC
const logger = {
  info: (message, meta = {}) => {
    rotatingLogger.info(message, meta);
    hecClient.addToBatch({ message, level: 'INFO', ...meta });
  },
  error: (message, meta = {}) => {
    rotatingLogger.error(message, meta);
    hecClient.addToBatch({ message, level: 'ERROR', ...meta });
  },
  warn: (message, meta = {}) => {
    rotatingLogger.warn(message, meta);
    hecClient.addToBatch({ message, level: 'WARN', ...meta });
  },
  debug: (message, meta = {}) => {
    rotatingLogger.debug(message, meta);
    hecClient.addToBatch({ message, level: 'DEBUG', ...meta });
  }
};

// In-memory cache for search results
const searchCache = new Map();
const CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Saved searches storage (in-memory for now, could be persisted to file/database)
const savedSearches = new Map();

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes default
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // Increased default for dashboard reloads
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
};

// Rate limiting storage
const rateLimitStore = new Map();

// Rate limiting middleware
function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_CONFIG.windowMs;
  
  // Get or create rate limit entry for this IP
  if (!rateLimitStore.has(ip)) {
    rateLimitStore.set(ip, []);
  }
  
  const requests = rateLimitStore.get(ip);
  
  // Remove old requests outside the window
  while (requests.length > 0 && requests[0] < windowStart) {
    requests.shift();
  }
  
  // Check if limit exceeded
  if (requests.length >= RATE_LIMIT_CONFIG.maxRequests) {
    logger.warn('Rate limit exceeded', { ip, requests: requests.length, limit: RATE_LIMIT_CONFIG.maxRequests });
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: RATE_LIMIT_CONFIG.message,
      retryAfter: Math.ceil((requests[0] + RATE_LIMIT_CONFIG.windowMs - now) / 1000),
      limit: RATE_LIMIT_CONFIG.maxRequests,
      window: Math.ceil(RATE_LIMIT_CONFIG.windowMs / 1000 / 60) + ' minutes'
    });
  }
  
  // Add current request
  requests.push(now);
  
  // Set rate limit headers
  res.set({
    'X-RateLimit-Limit': RATE_LIMIT_CONFIG.maxRequests,
    'X-RateLimit-Remaining': RATE_LIMIT_CONFIG.maxRequests - requests.length,
    'X-RateLimit-Reset': new Date(requests[0] + RATE_LIMIT_CONFIG.windowMs).toISOString()
  });
  
  next();
}

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2
};

// Cache cleanup function
function cleanupCache() {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [key, value] of searchCache.entries()) {
    if (now > value.expiresAt) {
      searchCache.delete(key);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    logger.info(`Cache cleanup completed`, { cleanedCount, remainingEntries: searchCache.size });
  }
}

// Rate limit cleanup function
function cleanupRateLimits() {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_CONFIG.windowMs;
  let cleanedCount = 0;
  
  for (const [ip, requests] of rateLimitStore.entries()) {
    // Remove old requests
    while (requests.length > 0 && requests[0] < windowStart) {
      requests.shift();
    }
    
    // Remove IP if no recent requests
    if (requests.length === 0) {
      rateLimitStore.delete(ip);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    logger.info(`Rate limit cleanup completed`, { cleanedCount, remainingIPs: rateLimitStore.size });
  }
}

// Start cleanup intervals
setInterval(cleanupCache, CACHE_CLEANUP_INTERVAL);
setInterval(cleanupRateLimits, RATE_LIMIT_CONFIG.windowMs);

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'dist')));

// Serve screenshots directory if screenshots are enabled
if (process.env.NEXT_PUBLIC_DASHPUBSCREENSHOTS) {
  const screenshotDir = process.env.NEXT_PUBLIC_DASHPUBSCREENSHOTDIR || 'screenshots';
  const screenshotPath = path.join(__dirname, screenshotDir);
  
  // Create screenshots directory if it doesn't exist
  if (!fs.existsSync(screenshotPath)) {
    fs.mkdirSync(screenshotPath, { recursive: true });
    logger.info(`Created screenshots directory: ${screenshotPath}`);
  }
  
  app.use(`/${screenshotDir}`, express.static(screenshotPath));
  logger.info(`Serving screenshots from: ${screenshotPath} at /${screenshotDir}`);
}

// Request timing middleware
app.use((req, res, next) => {
  req.startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    logger.info(`${req.method} ${req.path}`, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent')
    });
  });
  next();
});

// Load datasources configuration
const datasourcesPath = path.join(__dirname, 'src/pages/api/data/_datasources.json');
let DATASOURCES = {};

try {
  const datasourcesContent = fs.readFileSync(datasourcesPath, 'utf8');
  DATASOURCES = JSON.parse(datasourcesContent);
  logger.info('Datasources configuration loaded successfully', { count: Object.keys(DATASOURCES).length });
} catch (error) {
  logger.error('Error loading datasources configuration', { error: error.message, stack: error.stack });
}

// Helper functions for Splunk integration
const qualifiedSearchString = (query) => (query.trim().startsWith('|') ? query : `search ${query}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Retry function with exponential backoff
async function retryWithBackoff(operation, maxRetries = RETRY_CONFIG.maxRetries) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt),
        RETRY_CONFIG.maxDelay
      );
      
      logger.warn(`Retry attempt failed`, { 
        attempt: attempt + 1, 
        maxRetries, 
        delay, 
        error: error.message 
      });
      await sleep(delay);
    }
  }
  
  throw lastError;
}

// Create HTTPS agent for Splunk connections if needed
const https = require('https');
const agent = process.env.SPLUNKD_URL && process.env.SPLUNKD_URL.startsWith('https')
  ? new https.Agent({
      rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0'
    })
  : undefined;

// Health check endpoint (no rate limiting)
app.get('/health', async (req, res) => {
  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: process.memoryUsage(),
        pid: process.pid
      },
      services: {
        splunk: {
          url: process.env.SPLUNKD_URL,
          app: process.env.DASHPUB_APP,
          status: 'configured'
        },
        datasources: {
          count: Object.keys(DATASOURCES).length,
          status: 'loaded'
        }
      },
      cache: {
        size: searchCache.size,
        status: 'active'
      },
      rateLimit: {
        activeIPs: rateLimitStore.size,
        config: {
          maxRequests: RATE_LIMIT_CONFIG.maxRequests,
          windowMs: RATE_LIMIT_CONFIG.windowMs / 1000 / 60 + ' minutes'
        }
      },
      savedSearches: {
        count: savedSearches.size,
        status: 'active'
      },
      logging: {
        status: 'active',
        config: {
          maxSize: LOG_ROTATION_CONFIG.maxSize,
          maxFiles: LOG_ROTATION_CONFIG.maxFiles,
          retentionDays: LOG_ROTATION_CONFIG.retentionDays
        },
        stats: rotatingLogger.getStats(),
        hec: hecClient.getStatus()
      }
    };

    // Test Splunk connectivity
    try {
      const testResponse = await enhancedFetch(`${process.env.SPLUNKD_URL}/services/server/info`, {
        headers: {
          Authorization: process.env.SPLUNKD_TOKEN
            ? `Bearer ${process.env.SPLUNKD_TOKEN}`
            : `Basic ${Buffer.from([process.env.SPLUNKD_USER || 'admin', process.env.SPLUNKD_PASSWORD || ''].join(':')).toString('base64')}`,
        },
        agent: agent,
      });
      
      if (testResponse.ok) {
        healthStatus.services.splunk.status = 'connected';
        healthStatus.services.splunk.responseTime = Date.now() - req.startTime;
      } else {
        healthStatus.services.splunk.status = 'error';
        healthStatus.services.splunk.error = `HTTP ${testResponse.status}`;
      }
    } catch (error) {
      healthStatus.services.splunk.status = 'error';
      healthStatus.services.splunk.error = error.message;
    }

    res.json(healthStatus);
  } catch (error) {
    logger.error('Health check failed', { error: error.message, stack: error.stack });
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Enhanced fetch wrapper with better error handling
async function enhancedFetch(url, options = {}) {
  try {
    const response = await fetch(url, options);
    
    // Log response details for debugging
    logger.debug('HTTP response received', {
      url,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      method: options.method || 'GET'
    });
    
    return response;
  } catch (error) {
    // Enhanced error logging for fetch failures
    const errorDetails = {
      url,
      method: options.method || 'GET',
      errorType: error.name,
      errorMessage: error.message,
      errorCode: error.code,
      errorStack: error.stack,
      timestamp: new Date().toISOString()
    };
    
    // Add request details if available
    if (options.headers) {
      errorDetails.requestHeaders = Object.fromEntries(
        Object.entries(options.headers).filter(([key]) => 
          !key.toLowerCase().includes('authorization') && 
          !key.toLowerCase().includes('password')
        )
      );
    }
    
    if (options.body) {
      errorDetails.hasBody = true;
      errorDetails.bodyType = typeof options.body;
    }
    
    logger.error('Fetch request failed', errorDetails);
    throw error;
  }
}

// Global variable to store the current Splunk user
let CURRENT_SPLUNK_USER = process.env.SPLUNKD_USER || 'nobody';

// Function to fetch current Splunk user
async function fetchSplunkUser() {
  try {
    const AUTH_HEADER = process.env.SPLUNKD_TOKEN
      ? `Bearer ${process.env.SPLUNKD_TOKEN}`
      : `Basic ${Buffer.from([process.env.SPLUNKD_USER || 'admin', process.env.SPLUNKD_PASSWORD || ''].join(':')).toString('base64')}`;

    const response = await enhancedFetch(`${process.env.SPLUNKD_URL}/services/authentication/current-context?output_mode=json`, {
      headers: {
        Authorization: AUTH_HEADER
      },
      agent: agent
    });

    if (response.ok) {
      const data = await response.json();
      if (data.entry && data.entry.length > 0) {
        CURRENT_SPLUNK_USER = data.entry[0].content.username;
        logger.info('Successfully fetched Splunk user', { user: CURRENT_SPLUNK_USER });
      }
    } else {
      logger.warn('Failed to fetch Splunk user, using default', { status: response.status });
    }
  } catch (error) {
    logger.warn('Error fetching Splunk user, using default', { error: error.message });
  }
}

// Fetch user on startup
fetchSplunkUser();

// Function to execute Splunk search
async function executeSplunkSearch(datasource) {
  const { search } = datasource;
  const app = datasource.app || process.env.DASHPUB_APP || 'search';
  let query = search.query;
  const refresh = Math.max(parseInt(process.env.MIN_REFRESH_TIME, 10) || 60, search.refresh || 60);
  
  logger.info('Executing Splunk search', { datasourceId: datasource.id, query, app, refresh });
  const searchStartTime = Date.now();
  
  // Build service prefix and auth header
  const SERVICE_PREFIX = `servicesNS/${encodeURIComponent(CURRENT_SPLUNK_USER)}/${encodeURIComponent(app)}`;
  const AUTH_HEADER = process.env.SPLUNKD_TOKEN
    ? `Bearer ${process.env.SPLUNKD_TOKEN}`
    : `Basic ${Buffer.from([process.env.SPLUNKD_USER || 'admin', process.env.SPLUNKD_PASSWORD || ''].join(':')).toString('base64')}`;

  // Prepare search parameters
  const bodyParams = new URLSearchParams({
    output_mode: 'json',
    earliest_time: (search.queryParameters || {}).earliest || '',
    latest_time: (search.queryParameters || {}).latest || '',
    search: qualifiedSearchString(query),
    reuse_max_seconds_ago: refresh,
    timeout: refresh * 2,
  });

  // Dispatch search job
  logger.info('Dispatching search job to Splunk', { datasourceId: datasource.id });
  const dispatchStartTime = Date.now();
  const searchResponse = await enhancedFetch(`${process.env.SPLUNKD_URL}/${SERVICE_PREFIX}/search/jobs`, {
    method: 'POST',
    headers: {
      Authorization: AUTH_HEADER,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: bodyParams,
    agent: agent,
  });

  if (searchResponse.status > 299) {
    const error = `Failed to dispatch job, Splunk returned HTTP status ${searchResponse.status}`;
    logger.error(error, { datasourceId: datasource.id, status: searchResponse.status });
    throw new Error(error);
  }

  const { sid } = await searchResponse.json();
  const dispatchTime = Date.now() - dispatchStartTime;
  const checkDelay = parseInt(process.env.SEARCH_JOB_DELAY_MS, 10) || 250;
  logger.info('Search job dispatched successfully', { 
    datasourceId: datasource.id, 
    sid, 
    dispatchTime, 
    checkDelay 
  });

  // Wait for job completion
  let complete = false;
  const waitStartTime = Date.now();
  while (!complete) {
    const statusResponse = await enhancedFetch(
      `${process.env.SPLUNKD_URL}/${SERVICE_PREFIX}/search/v2/jobs/${encodeURIComponent(sid)}?output_mode=json`,
      {
        headers: {
          Authorization: AUTH_HEADER,
        },
        agent: agent,
      }
    ).then((r) => r.json());

    const jobStatus = statusResponse.entry[0].content;
    if (jobStatus.isFailed) {
      const error = 'Search job failed';
      logger.error(error, { datasourceId: datasource.id, sid });
      throw new Error(error);
    }
    complete = jobStatus.isDone;
    if (!complete) {
      await sleep(checkDelay);
    }
  }
  
  const waitTime = Date.now() - waitStartTime;
  logger.info('Search job completed, retrieving results', { datasourceId: datasource.id, sid, waitTime });

  // Get search results
  const resultsStartTime = Date.now();
  const resultsParams = new URLSearchParams({
    output_mode: 'json_cols',
    count: 50000,
    offset: 0,
    search: search.postprocess || '',
  });

  const resultsResponse = await enhancedFetch(`${process.env.SPLUNKD_URL}/${SERVICE_PREFIX}/search/v2/jobs/${sid}/results`, {
    method: 'POST',
    headers: {
      Authorization: AUTH_HEADER,
    },
    body: resultsParams,
    agent: agent,
  }).then((r) => r.json());

  const resultsTime = Date.now() - resultsStartTime;
  const totalSearchTime = Date.now() - searchStartTime;
  
  logger.info('Search results retrieved successfully', { 
    datasourceId: datasource.id, 
    recordCount: resultsResponse.columns ? resultsResponse.columns[0].length : 0,
    timing: { dispatch: dispatchTime, wait: waitTime, results: resultsTime, total: totalSearchTime }
  });
  
  return {
    fields: resultsResponse.fields || [],
    columns: resultsResponse.columns || [],
    meta: {
      sid: sid,
      percentComplete: 100,
      status: 'done',
      totalCount: resultsResponse.columns ? resultsResponse.columns[0].length : 0,
      lastUpdated: new Date().toISOString(),
      timing: {
        dispatch: dispatchTime,
        wait: waitTime,
        results: resultsTime,
        total: totalSearchTime
      }
    }
  };
}

// Configuration endpoint for client-side settings
app.get('/api/config', (req, res) => {
  try {
    const baseUrl = process.env.DASHPUB_URL || process.env.NEXT_PUBLIC_URL ? `https://${process.env.NEXT_PUBLIC_URL}` : 'http://localhost';
    const screenshotBaseUrl = process.env.DASHPUB_BASE_SCREENSHOT_URL || process.env.NEXT_PUBLIC_BASE_SCREENSHOT_URL || '';
    
    // Generate home screenshot hash from baseUrl
    const homeScreenshotHash = require('crypto').createHash("sha256").update(baseUrl).digest("hex").substring(0, 32);
    const homeScreenshot = screenshotBaseUrl ? 
      `${screenshotBaseUrl}/screenshots/${homeScreenshotHash}.jpg` : null;
    
    const config = {
      title: process.env.DASHPUB_TITLE || process.env.NEXT_PUBLIC_DASHPUBTITLE || 'Dashboards',
      theme: process.env.DASHPUB_THEME || process.env.NEXT_PUBLIC_HOMETHEME || 'light',
      footer: process.env.DASHPUB_FOOTER || process.env.NEXT_PUBLIC_DASHPUBFOOTER || 'Hosted Splunk Dashboards',
      hostedBy: process.env.DASHPUB_HOSTEDBY_NAME || process.env.NEXT_PUBLIC_DASHPUBHOSTEDBY || '',
      hostedByUrl: process.env.DASHPUB_HOSTEDBY_URL || process.env.NEXT_PUBLIC_DASHPUBHOSTEDURL || '#',
      repo: process.env.DASHPUB_REPO || process.env.NEXT_PUBLIC_DASHPUBREPO || '',
      screenshots: {
        enabled: process.env.DASHPUB_SCREENSHOTS || process.env.NEXT_PUBLIC_DASHPUBSCREENSHOTS  || 'false',
        baseUrl: screenshotBaseUrl,
        dir: process.env.DASHPUB_SCREENSHOTDIR || process.env.NEXT_PUBLIC_DASHPUBSCREENSHOTDIR || 'screenshots',
        ext: process.env.DASHPUB_SCREENSHOTEXT || process.env.NEXT_PUBLIC_DASHPUBSCREENSHOTEXT || 'png'
      },
      baseUrl: baseUrl,
      homeScreenshot: homeScreenshot,
      jwtRequired: process.env.JWT_REQUIRED === 'true',
      timezone: process.env.DASHPUB_TZ || process.env.NEXT_PUBLIC_TZ || 'UTC',
      tabRotation: {
        interval: parseInt(process.env.REACT_APP_TAB_ROTATION_INTERVAL) || 15000,
        enabled: process.env.REACT_APP_TAB_ROTATION_ENABLED !== 'false'
      }
    };

    logger.info('Served client configuration', { 
      title: config.title,
      theme: config.theme,
      screenshotsEnabled: config.screenshots.enabled,
      tabRotationInterval: config.tabRotation.interval,
      tabRotationEnabled: config.tabRotation.enabled
    });

    res.json(config);
  } catch (error) {
    logger.error('Failed to serve client configuration', { error: error.message });
    res.status(500).json({
      error: 'Failed to load configuration',
      details: error.message
    });
  }
});

// Helper function to parse JWT expiry string to milliseconds
function parseJWTExpiry(expiry) {
  if (!expiry) return 24 * 60 * 60 * 1000; // Default 24 hours
  
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 24 * 60 * 60 * 1000; // Default 24 hours if invalid format
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value * 1000; // seconds
    case 'm': return value * 60 * 1000; // minutes
    case 'h': return value * 60 * 60 * 1000; // hours
    case 'd': return value * 24 * 60 * 60 * 1000; // days
    default: return 24 * 60 * 60 * 1000; // Default 24 hours
  }
}

// JWT verification middleware
function verifyJWT(req, res, next) {
  if (process.env.JWT_REQUIRED !== 'true') {
    return next();
  }
  
  const token = req.cookies.jwt_token;
  
  if (!token) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'No authentication token provided'
    });
  }
  
  try {
    const jwt = require('jsonwebtoken');
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    logger.warn('Invalid JWT token', { error: error.message, ip: req.ip });
    return res.status(401).json({
      error: 'Invalid token',
      message: 'Authentication token is invalid or expired'
    });
  }
}

// JWT verification endpoint
app.get('/api/auth/verify', verifyJWT, (req, res) => {
  res.json({
    authenticated: true,
    user: req.user
  });
});

// JWT Login endpoint
app.post('/api/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Check if JWT is required
    if (process.env.JWT_REQUIRED !== 'true') {
      return res.status(400).json({
        error: 'JWT authentication not enabled',
        message: 'JWT authentication is not configured for this instance'
      });
    }
    
    // Validate credentials
    const expectedUsername = process.env.JWT_USERNAME || 'admin';
    const expectedPassword = process.env.JWT_PASSWORD || 'admin';
    
    if (!username || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Username and password are required'
      });
    }
    
    if (username !== expectedUsername || password !== expectedPassword) {
      logger.warn('Invalid login attempt', { username, ip: req.ip });
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Username or password is incorrect'
      });
    }
    
    // Generate JWT token
    const jwt = require('jsonwebtoken');
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const jwtExpiry = process.env.JWT_EXPIRY || '24h';
    
    const token = jwt.sign(
      { 
        username: username,
        iat: Math.floor(Date.now() / 1000)
      }, 
      jwtSecret, 
      { expiresIn: jwtExpiry }
    );
    
    // Calculate maxAge from JWT_EXPIRY
    const maxAgeMs = parseJWTExpiry(jwtExpiry);
    
    // Set HTTP-only cookie
    res.cookie('jwt_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: maxAgeMs
    });
    
    logger.info('User logged in successfully', { 
      username, 
      ip: req.ip, 
      jwtExpiry, 
      cookieMaxAgeMs: maxAgeMs,
      cookieMaxAgeHours: Math.round(maxAgeMs / (60 * 60 * 1000) * 100) / 100
    });
    
    res.json({
      success: true,
      message: 'Login successful',
      user: { username },
      expiresIn: jwtExpiry,
      cookieMaxAge: maxAgeMs
    });
    
  } catch (error) {
    logger.error('Login failed', { error: error.message, stack: error.stack });
    res.status(500).json({
      error: 'Login failed',
      message: 'An error occurred during login'
    });
  }
});

// Dashboard manifest endpoint with pre-computed screenshot hashes
app.get('/api/dashboards/manifest', rateLimit, async (req, res) => {
  try {
    const dashboardManifestPath = path.join(__dirname, 'src/_dashboards.json');
    
    if (!fs.existsSync(dashboardManifestPath)) {
      logger.warn('Dashboard manifest file not found', { path: dashboardManifestPath });
      return res.json({
        dashboards: {},
        metadata: {
          total: 0,
          lastUpdated: new Date().toISOString(),
          version: '1.0.0'
        }
      });
    }
    
    const dashboardManifestContent = fs.readFileSync(dashboardManifestPath, 'utf8');
    const dashboardManifest = JSON.parse(dashboardManifestContent);
    
    // Generate screenshot hashes for each dashboard
    const baseUrl = process.env.NEXT_PUBLIC_URL ? `https://${process.env.NEXT_PUBLIC_URL}` : 'http://localhost';
    const enhancedManifest = {};
    
    for (const [dashboardId, dashboardData] of Object.entries(dashboardManifest)) {
      const adjustedDashboardKey = (dashboardId === "index") ? "" : dashboardId;
      const dashboardURL = `${baseUrl}/${adjustedDashboardKey}`;
      const hash = require('crypto').createHash("sha256").update(dashboardURL).digest("hex").substring(0, 32);
      
      enhancedManifest[dashboardId] = {
        ...dashboardData,
        screenshotHash: hash,
        screenshotUrl: process.env.NEXT_PUBLIC_BASE_SCREENSHOT_URL ? 
          `${process.env.NEXT_PUBLIC_BASE_SCREENSHOT_URL}/screenshots/${hash}.jpg` : null
      };
    }
    
    logger.info('Served enhanced dashboard manifest with screenshot hashes', { 
      total: Object.keys(enhancedManifest).length 
    });
    
    res.json({
      dashboards: enhancedManifest,
      metadata: {
        total: Object.keys(enhancedManifest).length,
        lastUpdated: new Date().toISOString(),
        version: '1.0.0',
        baseUrl: baseUrl,
        screenshotBaseUrl: process.env.NEXT_PUBLIC_BASE_SCREENSHOT_URL
      }
    });
    
  } catch (error) {
    logger.error('Failed to serve dashboard manifest', { error: error.message, stack: error.stack });
    res.status(500).json({
      error: 'Failed to load dashboard manifest',
      details: error.message
    });
  }
});

// Dashboard management endpoints
app.get('/api/dashboards', rateLimit, async (req, res) => {
  try {
    const dashboardManifestPath = path.join(__dirname, 'src/_dashboards.json');
    
    if (!fs.existsSync(dashboardManifestPath)) {
      logger.warn('Dashboard manifest file not found', { path: dashboardManifestPath });
      return res.json({
        dashboards: [],
        metadata: {
          total: 0,
          lastUpdated: new Date().toISOString(),
          version: '1.0.0'
        }
      });
    }
    
    const dashboardManifestContent = fs.readFileSync(dashboardManifestPath, 'utf8');
    const dashboardManifest = JSON.parse(dashboardManifestContent);
    
    // Convert manifest format to expected API format
    const dashboards = Object.keys(dashboardManifest).map(id => ({
      id,
      name: dashboardManifest[id].title,
      description: dashboardManifest[id].description || '',
      path: `/api/dashboards/${id}/definition`,
      url: `/dashboard/${id}`,
      tags: dashboardManifest[id].tags || [],
      lastUpdated: new Date().toISOString(),
      version: '1.0.0'
    }));
    
    logger.info('Retrieved dashboard manifest', { total: dashboards.length });
    res.json({
      dashboards,
      metadata: {
        total: dashboards.length,
        lastUpdated: new Date().toISOString(),
        version: '1.0.0'
      }
    });
    
  } catch (error) {
    logger.error('Failed to retrieve dashboard manifest', { error: error.message, stack: error.stack });
    res.status(500).json({
      error: 'Failed to retrieve dashboard manifest',
      details: error.message
    });
  }
});

// Enhanced dashboard list endpoint with detailed information (MUST come before /:id route)
app.get('/api/dashboards/list', (req, res) => {
  try {
    const dashboardList = [];
    const dashboardDir = path.join(__dirname, 'src/dashboards');
    
    if (!fs.existsSync(dashboardDir)) {
      return res.json({
        dashboards: [],
        metadata: {
          total: 0,
          message: 'No dashboard directory found'
        }
      });
    }
    
    const dashboardFolders = fs.readdirSync(dashboardDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    for (const slug of dashboardFolders) {
      const definitionPath = path.join(dashboardDir, slug, 'definition.json');
      if (fs.existsSync(definitionPath)) {
        try {
          const content = fs.readFileSync(definitionPath, 'utf8');
          const definition = JSON.parse(content);
          const stats = fs.statSync(definitionPath);
          
          dashboardList.push({
            slug,
            title: definition.title || slug,
            description: definition.description || '',
            dataSourceCount: Object.keys(definition.dataSources || {}).length,
            visualizationCount: Object.keys(definition.visualizations || {}).length,
            lastModified: stats.mtime.toISOString(),
            fileSize: stats.size,
            path: `/api/dashboards/${slug}/definition`
          });
        } catch (parseError) {
          logger.warn('Failed to parse dashboard definition', { slug, error: parseError.message });
          dashboardList.push({
            slug,
            title: slug,
            description: 'Invalid dashboard definition',
            error: parseError.message,
            path: `/api/dashboards/${slug}/definition`
          });
        }
      }
    }
    
    logger.info('Served enhanced dashboard list', { 
      total: dashboardList.length,
      dashboards: dashboardList.map(d => d.slug)
    });
    
    res.json({
      dashboards: dashboardList,
      metadata: {
        total: dashboardList.length,
        lastUpdated: new Date().toISOString(),
        servedVia: 'api'
      }
    });
  } catch (error) {
    logger.error('Failed to serve enhanced dashboard list', { error: error.message });
    res.status(500).json({
      error: 'Failed to load dashboard list',
      details: error.message
    });
  }
});

app.get('/api/dashboards/:id', rateLimit, async (req, res) => {
  try {
    const { id } = req.params;
    const dashboardPath = path.join(__dirname, `src/dashboards/${id}/definition.json`);
    
    if (!fs.existsSync(dashboardPath)) {
      logger.warn('Dashboard definition not found', { id, path: dashboardPath });
      return res.status(404).json({
        error: 'Dashboard not found',
        message: `No dashboard with ID '${id}' exists`
      });
    }
    
    const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
    const dashboardDefinition = JSON.parse(dashboardContent);
    
    logger.info('Retrieved dashboard definition', { id, title: dashboardDefinition.title });
    res.json(dashboardDefinition);
    
  } catch (error) {
    logger.error('Failed to retrieve dashboard definition', { id: req.params.id, error: error.message, stack: error.stack });
    res.status(500).json({
      error: 'Failed to retrieve dashboard definition',
      details: error.message
    });
  }
});

// Helper function to convert data to CSV format
function convertToCSV(data) {
  if (!data.fields || !data.columns || data.fields.length === 0) {
    return 'No data available';
  }
  
  // Create CSV header
  const header = data.fields.join(',');
  
  // Create CSV rows
  const rows = [];
  const rowCount = data.columns[0] ? data.columns[0].length : 0;
  
  for (let i = 0; i < rowCount; i++) {
    const row = data.fields.map((field, fieldIndex) => {
      const value = data.columns[fieldIndex] ? data.columns[fieldIndex][i] : '';
      // Escape CSV values (handle commas, quotes, newlines)
      if (value === null || value === undefined) {
        return '';
      }
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    rows.push(row.join(','));
  }
  
  return [header, ...rows].join('\n');
}

// API endpoint for data sources (with rate limiting)
app.get('/api/data/:dsid', rateLimit, async (req, res) => {
  const { dsid } = req.params;
  const searchStartTime = Date.now();
  
  logger.info('Looking up datasource', { dsid });
  
  if (!dsid || !(dsid in DATASOURCES)) {
    logger.warn('Datasource not found', { dsid, availableCount: Object.keys(DATASOURCES).length });
    res.setHeader('cache-control', 's-maxage=3600');
    res.json({ 
      error: 'Datasource not found',
      message: `The requested datasource '${dsid}' does not exist in the system.`,
      availableDatasources: Object.keys(DATASOURCES).slice(0, 10), // Show first 10 available
      totalCount: Object.keys(DATASOURCES).length
    });
    return;
  }
  
  const datasource = DATASOURCES[dsid];
  logger.info('Datasource found', { dsid, query: datasource.search.query, app: datasource.app });
  
  // Check cache first
  const cacheKey = `${dsid}_${JSON.stringify(datasource.search.queryParameters || {})}`;
  const cachedResult = searchCache.get(cacheKey);
  
  if (cachedResult && Date.now() < cachedResult.expiresAt) {
    logger.info('Cache hit for datasource', { dsid, cacheAge: Date.now() - cachedResult.createdAt });
    const totalTime = Date.now() - searchStartTime;
    
    // Add cache info to response
    const responseData = {
      ...cachedResult.data,
      meta: {
        ...cachedResult.data.meta,
        searchTime: totalTime,
        datasourceId: dsid,
        fromCache: true,
        cacheAge: Date.now() - cachedResult.createdAt,
        nextRefresh: cachedResult.expiresAt - Date.now()
      }
    };
    
    res.json(responseData);
    return;
  }
  
  logger.info('Cache miss for datasource', { dsid });
  
  try {
    // Execute real Splunk search with retry logic
    const data = await retryWithBackoff(() => executeSplunkSearch(datasource));
    
    const refresh = datasource.search.refresh || parseInt(process.env.DASHPUB_DEFAULT_TTL) || 60;
    const cacheExpiry = Date.now() + (refresh * 1000);
    
    // Cache the result
    searchCache.set(cacheKey, {
      data: data,
      expiresAt: cacheExpiry,
      createdAt: Date.now()
    });
    
    logger.info('Result cached for datasource', { dsid, refresh, cacheExpiry });
    
    res.setHeader('cache-control', `s-maxage=${refresh}, stale-while-revalidate`);
    
    // Add timing information to response
    const totalTime = Date.now() - searchStartTime;
    data.meta.searchTime = totalTime;
    data.meta.datasourceId = dsid;
    data.meta.fromCache = false;
    
    res.json(data);
  } catch (error) {
    // Enhanced error logging with more context
    const errorContext = {
      dsid,
      errorType: error.name,
      errorMessage: error.message,
      errorCode: error.code,
      errorStack: error.stack,
      timestamp: new Date().toISOString(),
      datasource: {
        id: datasource.id,
        app: datasource.app,
        // query: datasource.search.query,
        // parameters: datasource.search.queryParameters || {}
      },
      // environment: {
      //   splunkdUrl: process.env.SPLUNKD_URL,
      //   splunkdUser: process.env.SPLUNKD_USER || 'admin',
      //   hasToken: !!process.env.SPLUNKD_TOKEN,
      //   hasPassword: !!process.env.SPLUNKD_PASSWORD
      // }
    };
    
    logger.error('Error executing Splunk search', errorContext);
    const totalTime = Date.now() - searchStartTime;
    
    // Try to return cached data if available (even if expired)
    if (cachedResult) {
      logger.info('Returning expired cached data due to search failure', { dsid, cacheAge: Date.now() - cachedResult.createdAt });
      const responseData = {
        ...cachedResult.data,
        meta: {
          ...cachedResult.data.meta,
          searchTime: totalTime,
          datasourceId: dsid,
          fromCache: true,
          cacheAge: Date.now() - cachedResult.createdAt,
          warning: 'Using expired cached data due to search failure',
          error: {
            message: 'Search failed, showing cached data',
            details: error.message,
            timestamp: new Date().toISOString()
          }
        }
      };
      
      res.json(responseData);
      return;
    }
    
    // Provide user-friendly error message
    let errorMessage = 'Failed to fetch data from Splunk';
    let errorDetails = error.message;
    
    if (error.message.includes('Failed to dispatch job')) {
      errorMessage = 'Unable to start Splunk search job';
      errorDetails = 'The search request could not be initiated. Please check Splunk connectivity.';
    } else if (error.message.includes('Search job failed')) {
      errorMessage = 'Splunk search execution failed';
      errorDetails = 'The search query encountered an error during execution.';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Search request timed out';
      errorDetails = 'The search took too long to complete. Please try a smaller time range.';
    }
    
    res.status(500).json({ 
      error: errorMessage,
      message: errorDetails,
      details: error.message,
      searchTime: totalTime,
      datasourceId: dsid,
      debug: {
        errorType: error.name,
        errorCode: error.code,
        datasource: {
          app: datasource.app,
          // query: datasource.search.query,
          // parameters: datasource.search.queryParameters || {}
        },
        // environment: {
        //   splunkdUrl: process.env.SPLUNKD_URL,
        //   hasToken: !!process.env.SPLUNKD_TOKEN,
        //   hasPassword: !!process.env.SPLUNKD_PASSWORD
        // }
      },
      suggestions: [
        'Check if Splunk is accessible and running',
        'Verify your authentication credentials',
        'Try reducing the time range for your search',
        'Check the search query syntax in your datasource configuration',
        'Review server logs for detailed error information'
      ],
      timestamp: new Date().toISOString()
    });
  }
});

// HEC management endpoints
app.get('/api/logs/hec/status', rateLimit, (req, res) => {
  try {
    const status = hecClient.getStatus();
    logger.info('Retrieved HEC status', { status });
    res.json(status);
  } catch (error) {
    logger.error('Failed to get HEC status', { error: error.message });
    res.status(500).json({
      error: 'Failed to get HEC status',
      message: error.message
    });
  }
});

app.post('/api/logs/hec/test', rateLimit, async (req, res) => {
  try {
    await hecClient.testConnection();
    const status = hecClient.getStatus();
    logger.info('HEC connection test completed', { status });
    res.json({
      success: true,
      message: 'HEC connection test completed',
      status
    });
  } catch (error) {
    logger.error('HEC connection test failed', { error: error.message });
    res.status(500).json({
      error: 'HEC connection test failed',
      message: error.message
    });
  }
});

app.post('/api/logs/hec/flush', rateLimit, async (req, res) => {
  try {
    await hecClient.flush();
    logger.info('HEC batch flushed successfully');
    res.json({
      success: true,
      message: 'HEC batch flushed successfully'
    });
  } catch (error) {
    logger.error('Failed to flush HEC batch', { error: error.message });
    res.status(500).json({
      error: 'Failed to flush HEC batch',
      message: error.message
    });
  }
});

// Saved searches endpoints
app.get('/api/saved-searches', rateLimit, (req, res) => {
  try {
    const searches = Array.from(savedSearches.values()).map(search => ({
      id: search.id,
      name: search.name,
      description: search.description,
      query: search.query,
      parameters: search.parameters,
      createdAt: search.createdAt,
      lastUsed: search.lastUsed,
      useCount: search.useCount
    }));
    
    logger.info('Retrieved saved searches', { count: searches.length });
    res.json({
      searches,
      total: searches.length
    });
  } catch (error) {
    logger.error('Failed to retrieve saved searches', { error: error.message, stack: error.stack });
    res.status(500).json({
      error: 'Failed to retrieve saved searches',
      details: error.message
    });
  }
});

app.post('/api/saved-searches', rateLimit, (req, res) => {
  try {
    const { name, description, query, parameters = {} } = req.body;
    
    if (!name || !query) {
      logger.warn('Invalid saved search creation attempt', { name, hasQuery: !!query });
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Name and query are required'
      });
    }
    
    const id = `saved_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const savedSearch = {
      id,
      name,
      description: description || '',
      query,
      parameters,
      createdAt: new Date().toISOString(),
      lastUsed: null,
      useCount: 0
    };
    
    savedSearches.set(id, savedSearch);
    logger.info('Saved search created successfully', { id, name, queryLength: query.length });
    
    res.status(201).json(savedSearch);
  } catch (error) {
    logger.error('Failed to create saved search', { error: error.message, stack: error.stack });
    res.status(500).json({
      error: 'Failed to create saved search',
      details: error.message
    });
  }
});

app.get('/api/saved-searches/:id', rateLimit, (req, res) => {
  try {
    const { id } = req.params;
    const savedSearch = savedSearches.get(id);
    
    if (!savedSearch) {
      logger.warn('Saved search not found', { id });
      return res.status(404).json({
        error: 'Saved search not found',
        message: `No saved search with ID '${id}' exists`
      });
    }
    
    logger.info('Retrieved saved search', { id, name: savedSearch.name });
    res.json(savedSearch);
  } catch (error) {
    logger.error('Failed to retrieve saved search', { id: req.params.id, error: error.message, stack: error.stack });
    res.status(500).json({
      error: 'Failed to retrieve saved search',
      details: error.message
    });
  }
});

app.delete('/api/saved-searches/:id', rateLimit, (req, res) => {
  try {
    const { id } = req.params;
    const savedSearch = savedSearches.get(id);
    
    if (!savedSearch) {
      logger.warn('Attempted to delete non-existent saved search', { id });
      return res.status(404).json({
        error: 'Saved search not found',
        message: `No saved search with ID '${id}' exists`
      });
    }
    
    savedSearches.delete(id);
    logger.info('Saved search deleted successfully', { id, name: savedSearch.name });
    
    res.json({
      message: 'Saved search deleted successfully',
      deletedSearch: savedSearch
    });
  } catch (error) {
    logger.error('Failed to delete saved search', { id: req.params.id, error: error.message, stack: error.stack });
    res.status(500).json({
      error: 'Failed to delete saved search',
      details: error.message
    });
  }
});

// Execute saved search endpoint
app.post('/api/saved-searches/:id/execute', rateLimit, async (req, res) => {
  try {
    const { id } = req.params;
    const { parameters = {} } = req.body;
    
    const savedSearch = savedSearches.get(id);
    if (!savedSearch) {
      logger.warn('Attempted to execute non-existent saved search', { id });
      return res.status(404).json({
        error: 'Saved search not found',
        message: `No saved search with ID '${id}' exists`
      });
    }
    
    // Update usage statistics
    savedSearch.lastUsed = new Date().toISOString();
    savedSearch.useCount = (savedSearch.useCount || 0) + 1;
    
    logger.info('Executing saved search', { id, name: savedSearch.name, useCount: savedSearch.useCount });
    
    // Create a temporary datasource object to reuse existing search logic
    const tempDatasource = {
      id: `saved_${id}`,
      search: {
        query: savedSearch.query,
        queryParameters: { ...savedSearch.parameters, ...parameters },
        refresh: 60 // Default refresh for saved searches
      },
      app: process.env.DASHPUB_APP || 'etyd'
    };
    
    // Execute the search using existing infrastructure
    const data = await executeSplunkSearch(tempDatasource);
    
    logger.info('Saved search executed successfully', { id, name: savedSearch.name, recordCount: data.meta.totalCount });
    
    res.json({
      savedSearchId: id,
      savedSearchName: savedSearch.name,
      data: data
    });
    
  } catch (error) {
    logger.error('Failed to execute saved search', { id: req.params.id, error: error.message, stack: error.stack });
    res.status(500).json({
      error: 'Failed to execute saved search',
      details: error.message
    });
  }
});

// Data export endpoints
app.get('/api/export/:dsid/:format', rateLimit, async (req, res) => {
  try {
    const { dsid, format } = req.params;
    const { parameters = {} } = req.query;
    
    if (!['csv', 'json'].includes(format)) {
      logger.warn('Invalid export format requested', { dsid, format });
      return res.status(400).json({
        error: 'Invalid export format',
        message: 'Supported formats: csv, json'
      });
    }
    
    // Check if datasource exists
    if (!dsid || !(dsid in DATASOURCES)) {
      logger.warn('Export requested for non-existent datasource', { dsid });
      return res.status(404).json({
        error: 'Datasource not found',
        message: `The requested datasource '${dsid}' does not exist in the system.`
      });
    }
    
    const datasource = DATASOURCES[dsid];
    logger.info('Starting data export', { dsid, format, datasourceName: datasource.id });
    
    // Execute search to get fresh data
    const data = await executeSplunkSearch(datasource);
    
    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${dsid}_${format}_${timestamp}`;
    
    if (format === 'csv') {
      // Convert to CSV format
      const csvContent = convertToCSV(data);
      
      res.set({
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
        'Cache-Control': 'no-cache'
      });
      
      logger.info('CSV export completed successfully', { dsid, filename, recordCount: data.meta.totalCount });
      res.send(csvContent);
    } else if (format === 'json') {
      // Export as JSON
      res.set({
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}.json"`,
        'Cache-Control': 'no-cache'
      });
      
      logger.info('JSON export completed successfully', { dsid, filename, recordCount: data.meta.totalCount });
      res.json({
        exportInfo: {
          datasourceId: dsid,
          format: 'json',
          timestamp: new Date().toISOString(),
          recordCount: data.meta.totalCount
        },
        data: data
      });
    }
    
  } catch (error) {
    logger.error('Data export failed', { dsid: req.params.dsid, format: req.params.format, error: error.message, stack: error.stack });
    res.status(500).json({
      error: 'Failed to export data',
      details: error.message
    });
  }
});

// Export saved search data
app.get('/api/export/saved-search/:id/:format', rateLimit, async (req, res) => {
  try {
    const { id, format } = req.params;
    const { parameters = {} } = req.query;
    
    if (!['csv', 'json'].includes(format)) {
      logger.warn('Invalid export format requested for saved search', { id, format });
      return res.status(400).json({
        error: 'Invalid export format',
        message: 'Supported formats: csv, json'
      });
    }
    
    const savedSearch = savedSearches.get(id);
    if (!savedSearch) {
      logger.warn('Export requested for non-existent saved search', { id });
      return res.status(404).json({
        error: 'Saved search not found',
        message: `No saved search with ID '${id}' exists`
      });
    }
    
    logger.info('Starting saved search export', { id, name: savedSearch.name, format });
    
    // Create temporary datasource to reuse existing search logic
    const tempDatasource = {
      id: `saved_${id}`,
      search: {
        query: savedSearch.query,
        queryParameters: { ...savedSearch.parameters, ...parameters },
        refresh: 60
      },
      app: process.env.DASHPUB_APP || 'etyd'
    };
    
    // Execute the search using existing infrastructure
    const data = await executeSplunkSearch(tempDatasource);
    
    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `saved_${id}_${format}_${timestamp}`;
    
    if (format === 'csv') {
      // Convert to CSV format
      const csvContent = convertToCSV(data);
      
      res.set({
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
        'Cache-Control': 'no-cache'
      });
      
      logger.info('Saved search CSV export completed successfully', { id, name: savedSearch.name, filename, recordCount: data.meta.totalCount });
      res.send(csvContent);
    } else if (format === 'json') {
      // Export as JSON
      res.set({
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}.json"`,
        'Cache-Control': 'no-cache'
      });
      
      logger.info('Saved search JSON export completed successfully', { id, name: savedSearch.name, filename, recordCount: data.meta.totalCount });
      res.json({
        exportInfo: {
          savedSearchId: id,
          savedSearchName: savedSearch.name,
          format: 'json',
          timestamp: new Date().toISOString(),
          recordCount: data.meta.totalCount
        },
        data: data
      });
    }
    
  } catch (error) {
    logger.error('Saved search export failed', { id: req.params.id, format: req.params.format, error: error.message, stack: error.stack });
    res.status(500).json({
      error: 'Failed to export saved search data',
      details: error.message
    });
  }
});

// Dashboard definitions API endpoint (replaces static file serving)
app.get('/api/dashboards/:slug/definition', (req, res) => {
  try {
    const { slug } = req.params;
    const dashboardPath = path.join(__dirname, `src/dashboards/${slug}/definition.json`);
    
    if (!fs.existsSync(dashboardPath)) {
      logger.warn('Dashboard definition file not found', { slug, path: dashboardPath });
      return res.status(404).json({
        error: 'Dashboard definition not found',
        message: `No dashboard definition found for '${slug}'`
      });
    }
    
    const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
    const dashboardDefinition = JSON.parse(dashboardContent);
    
    // Generate screenshot hash for this dashboard
    const baseUrl = process.env.NEXT_PUBLIC_URL ? `https://${process.env.NEXT_PUBLIC_URL}` : 'http://localhost';
    const dashboardURL = `${baseUrl}/${slug}`;
    const screenshotHash = require('crypto').createHash("sha256").update(dashboardURL).digest("hex").substring(0, 32);
    
    // Add metadata for API response
    const enhancedDefinition = {
      ...dashboardDefinition,
      screenshotHash,
      screenshotUrl: process.env.NEXT_PUBLIC_BASE_SCREENSHOT_URL ? 
        `${process.env.NEXT_PUBLIC_BASE_SCREENSHOT_URL}/screenshots/${screenshotHash}.jpg` : null,
      _metadata: {
        slug,
        lastModified: fs.statSync(dashboardPath).mtime.toISOString(),
        fileSize: fs.statSync(dashboardPath).size,
        servedVia: 'api'
      }
    };
    
    logger.info('Served dashboard definition via API', { 
      slug, 
      title: dashboardDefinition.title,
      dataSourceCount: Object.keys(dashboardDefinition.dataSources || {}).length,
      visualizationCount: Object.keys(dashboardDefinition.visualizations || {}).length
    });
    
    res.json(enhancedDefinition);
  } catch (error) {
    logger.error('Failed to serve dashboard definition via API', { 
      slug: req.params.slug, 
      error: error.message, 
      stack: error.stack 
    });
    res.status(500).json({
      error: 'Failed to load dashboard definition',
      details: error.message
    });
  }
});

// Catch-all route for SPA (must be last)
app.get(new RegExp('.*'), (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const server = app.listen(PORT, () => {
  logger.info('Server started successfully', {
    port: PORT,
    splunkUrl: process.env.SPLUNKD_URL,
    splunkApp: process.env.DASHPUB_APP,
    cacheCleanupInterval: CACHE_CLEANUP_INTERVAL / 1000,
    rateLimitWindow: RATE_LIMIT_CONFIG.windowMs / 1000 / 60,
    maxRetries: RETRY_CONFIG.maxRetries
  });
  
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/health`);
  console.log(`🔍 API available at http://localhost:${PORT}/api/data/:dsid`);
  console.log(`💾 Saved searches available at http://localhost:${PORT}/api/saved-searches`);
  console.log(`📋 Dashboard management available at http://localhost:${PORT}/api/dashboards`);
  console.log(`📄 Dashboard definitions available at http://localhost:${PORT}/api/dashboards/:slug/definition`);
  console.log(`📊 Enhanced dashboard list available at http://localhost:${PORT}/api/dashboards/list`);
  console.log(`🔗 Splunk URL: ${process.env.SPLUNKD_URL}`);
  console.log(`📱 Splunk App: ${process.env.DASHPUB_APP}`);
  console.log(`💾 Cache system: Active (cleanup every ${CACHE_CLEANUP_INTERVAL/1000}s)`);
  console.log(`🔄 Retry system: Active (max ${RETRY_CONFIG.maxRetries} retries with exponential backoff)`);
  console.log(`🚦 Rate limiting: Active (${RATE_LIMIT_CONFIG.maxRequests} requests per ${RATE_LIMIT_CONFIG.windowMs/1000/60} minutes per IP)`);
  console.log(`💾 Saved searches: Active (${savedSearches.size} searches stored)`);
  console.log(`📝 Structured logging: Active`);
  console.log(`📊 Dynamic dashboards: Active (API-based loading)`);
  
  if (SPLUNK_HEC_CONFIG.enabled) {
    console.log(`📤 Splunk HEC enabled: ${SPLUNK_HEC_CONFIG.url}`);
    console.log(`📊 HEC index: ${SPLUNK_HEC_CONFIG.index}`);
    console.log(`🏷️ HEC sourcetype: ${SPLUNK_HEC_CONFIG.sourcetype}`);
    console.log(`📦 HEC batch size: ${SPLUNK_HEC_CONFIG.batchSize}`);
    console.log(`⏱️ HEC batch timeout: ${SPLUNK_HEC_CONFIG.batchTimeout}ms`);
  } else {
    console.log(`⚠️ Splunk HEC disabled - set SPLUNK_HEC_ENABLED=true to enable`);
  }
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...');
  
  // Flush any remaining HEC logs
  if (SPLUNK_HEC_CONFIG.enabled) {
    console.log('📤 Flushing remaining HEC logs...');
    await hecClient.flush();
  }
  
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('🔄 SIGINT received, shutting down gracefully...');
  
  // Flush any remaining HEC logs
  if (SPLUNK_HEC_CONFIG.enabled) {
    console.log('📤 Flushing remaining HEC logs...');
    await hecClient.flush();
  }
  
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
