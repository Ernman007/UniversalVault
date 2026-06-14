function resolveDefaultErrorCode(statusCode) {
  if (statusCode === 400) return 'VALIDATION_ERROR';
  if (statusCode === 401) return 'AUTH_UNAUTHORIZED';
  if (statusCode === 403) return 'AUTH_FORBIDDEN';
  if (statusCode === 404) return 'RESOURCE_NOT_FOUND';
  if (statusCode === 409) return 'CONFLICT';
  if (statusCode === 429) return 'RATE_LIMITED';
  return 'INTERNAL_ERROR';
}

function normalizeErrorCode(payload, statusCode) {
  if (payload && typeof payload === 'object') {
    if (typeof payload.code === 'string' && payload.code.trim()) return payload.code;
    if (typeof payload.errorCode === 'string' && payload.errorCode.trim()) return payload.errorCode;
    if (payload.error && typeof payload.error.code === 'string' && payload.error.code.trim()) return payload.error.code;
  }
  return resolveDefaultErrorCode(statusCode);
}

function inferSuccessMessage(statusCode) {
  if (statusCode === 201) return 'Created';
  if (statusCode === 204) return 'No Content';
  return 'OK';
}

function apiEnvelopeMiddleware(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = (payload) => {
    if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'success')) {
      return originalJson(payload);
    }

    const statusCode = res.statusCode || 200;

    if (statusCode >= 400) {
      const payloadMessage = payload && typeof payload === 'object' ? payload.message : undefined;
      const message = payloadMessage || 'Request failed';
      const details = payload && typeof payload === 'object'
        ? (payload.details || payload.errors || payload.error || undefined)
        : undefined;

      return originalJson({
        success: false,
        message,
        error: {
          code: normalizeErrorCode(payload, statusCode),
          details
        }
      });
    }

    const baseMessage = payload && typeof payload === 'object' ? payload.message : undefined;
    const meta = payload && typeof payload === 'object' ? payload.meta : undefined;
    let data;

    if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
      data = payload.data;
    } else if (Array.isArray(payload) || payload === null || typeof payload !== 'object') {
      data = payload;
    } else if (payload && typeof payload === 'object') {
      const normalized = { ...payload };
      delete normalized.message;
      delete normalized.meta;
      data = Object.keys(normalized).length > 0 ? normalized : null;
    }

    return originalJson({
      success: true,
      message: baseMessage || inferSuccessMessage(statusCode),
      data,
      meta
    });
  };

  next();
}

module.exports = apiEnvelopeMiddleware;
