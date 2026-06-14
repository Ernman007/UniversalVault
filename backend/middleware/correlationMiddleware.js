const { v4: uuidv4 } = require('uuid');

/**
 * Correlation ID Middleware
 * Generates a unique correlation ID for each request and attaches it to:
 * - req.correlationId for internal use
 * - res.locals.correlationId for response headers
 * - X-Correlation-ID response header for client tracking
 * 
 * This enables end-to-end tracing of sensitive mutations across the system.
 */

const generateCorrelationId = () => {
  const timestamp = Date.now().toString(36);
  const random = uuidv4().split('-')[0];
  return `corr_${timestamp}_${random}`;
};

const correlationMiddleware = (req, res, next) => {
  // Use existing correlation ID from client if provided (for distributed tracing)
  const clientCorrelationId = req.headers['x-correlation-id'];
  
  // Generate or use existing correlation ID
  const correlationId = clientCorrelationId || generateCorrelationId();
  
  // Attach to request for internal use
  req.correlationId = correlationId;
  
  // Attach to response locals for easy access
  res.locals.correlationId = correlationId;
  
  // Set response header for client tracking
  res.setHeader('X-Correlation-ID', correlationId);
  
  // Override res.json to automatically include correlationId in responses
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    // Only add correlationId to mutation responses (POST, PUT, DELETE, PATCH)
    const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
    
    if (isMutation && body && typeof body === 'object') {
      // Add correlationId to the response body if not already present
      if (!body.correlationId) {
        body.correlationId = correlationId;
      }
    }
    
    return originalJson(body);
  };
  
  next();
};

module.exports = correlationMiddleware;
