import jwt from 'jsonwebtoken';

// Authentication middleware configuration
const AUTH_CONFIG = {
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  apiKeyHeader: process.env.API_KEY_HEADER || 'X-API-Key',
  rateLimitUnauthenticated: 10, // requests per minute for unauthenticated users
  rateLimitAuthenticated: 100,  // requests per minute for authenticated users
};

// In-memory storage for API keys (in production, use a database)
const apiKeys = new Map();
const userRoles = new Map();

// Initialize with some default API keys for development
if (process.env.NODE_ENV === 'development') {
  apiKeys.set('dev-api-key-123', {
    key: 'dev-api-key-123',
    name: 'Development API Key',
    role: 'admin',
    createdAt: new Date(),
    lastUsed: null,
    useCount: 0
  });
  
  userRoles.set('admin', ['read', 'write', 'admin']);
  userRoles.set('user', ['read']);
  userRoles.set('viewer', ['read']);
}

// JWT token generation
export function generateToken(userId, role = 'user') {
  return jwt.sign(
    { 
      userId, 
      role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    },
    AUTH_CONFIG.jwtSecret
  );
}

// JWT token validation
export function validateToken(token) {
  try {
    const decoded = jwt.verify(token, AUTH_CONFIG.jwtSecret);
    return { valid: true, payload: decoded };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// API key validation
export function validateApiKey(apiKey) {
  if (!apiKeys.has(apiKey)) {
    return { valid: false, error: 'Invalid API key' };
  }
  
  const keyData = apiKeys.get(apiKey);
  keyData.lastUsed = new Date();
  keyData.useCount++;
  
  return { 
    valid: true, 
    payload: {
      userId: `api-${keyData.key}`,
      role: keyData.role,
      type: 'api-key'
    }
  };
}

// Role-based access control
export function hasPermission(userRole, requiredPermission) {
  const permissions = userRoles.get(userRole) || [];
  return permissions.includes(requiredPermission) || permissions.includes('admin');
}

// Authentication middleware
export function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      code: 'TOKEN_MISSING'
    });
  }
  
  const validation = validateToken(token);
  if (!validation.valid) {
    return res.status(403).json({ 
      error: 'Invalid or expired token',
      code: 'TOKEN_INVALID'
    });
  }
  
  req.user = validation.payload;
  next();
}

// API key authentication middleware
export function authenticateApiKey(req, res, next) {
  const apiKey = req.headers[AUTH_CONFIG.apiKeyHeader.toLowerCase()];
  
  if (!apiKey) {
    return res.status(401).json({ 
      error: 'API key required',
      code: 'API_KEY_MISSING'
    });
  }
  
  const validation = validateApiKey(apiKey);
  if (!validation.valid) {
    return res.status(403).json({ 
      error: 'Invalid API key',
      code: 'API_KEY_INVALID'
    });
  }
  
  req.user = validation.payload;
  next();
}

// Flexible authentication (accepts either JWT or API key)
export function authenticate(req, res, next) {
  // Try JWT token first
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    const validation = validateToken(token);
    if (validation.valid) {
      req.user = validation.payload;
      return next();
    }
  }
  
  // Try API key
  const apiKey = req.headers[AUTH_CONFIG.apiKeyHeader.toLowerCase()];
  if (apiKey) {
    const validation = validateApiKey(apiKey);
    if (validation.valid) {
      req.user = validation.payload;
      return next();
    }
  }
  
  return res.status(401).json({ 
    error: 'Authentication required',
    code: 'AUTH_REQUIRED'
  });
}

// Permission-based middleware
export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: permission,
        current: req.user.role
      });
    }
    
    next();
  };
}

// Admin-only middleware
export function requireAdmin(req, res, next) {
  return requirePermission('admin')(req, res, next);
}

// Read-only middleware
export function requireRead(req, res, next) {
  return requirePermission('read')(req, res, next);
}

// Write permission middleware
export function requireWrite(req, res, next) {
  return requirePermission('write')(req, res, next);
}

// API key management functions
export function createApiKey(name, role = 'user') {
  const key = `sk-${generateRandomString(32)}`;
  const apiKeyData = {
    key,
    name,
    role,
    createdAt: new Date(),
    lastUsed: null,
    useCount: 0
  };
  
  apiKeys.set(key, apiKeyData);
  return apiKeyData;
}

export function revokeApiKey(key) {
  return apiKeys.delete(key);
}

export function listApiKeys() {
  return Array.from(apiKeys.values()).map(({ key, ...data }) => ({
    ...data,
    key: key.substring(0, 8) + '...' // Mask the full key
  }));
}

// Utility function to generate random strings
function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Export configuration for external use
export { AUTH_CONFIG };
