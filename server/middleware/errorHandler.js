module.exports = function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error.name === 'ValidationError') {
    return res.status(400).json({ error: error.message });
  }
  if (error.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid identifier' });
  }
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'A record with that value already exists' });
  }
  if (error.name === 'MulterError') {
    return res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'File exceeds the upload size limit' : 'Invalid upload' });
  }

  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND' ||
      error.code === 'ER_ACCESS_DENIED_ERROR' || error.code === 'ER_BAD_DB_ERROR' ||
      error.code === 'ER_NO_DB_ERROR' || error.code === 'ER_DBACCESS_DENIED_ERROR' ||
      error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_BAD_FIELD_ERROR' ||
      error.code === 'ER_NOT_SUPPORTED_AUTH_MODE' || error.code === 'ER_HOST_NOT_PRIVILEGED' ||
      error.code === 'ECONNRESET' || error.code === 'EPIPE' ||
      error.code === 'PROTOCOL_CONNECTION_LOST' || error.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR' ||
      error.code === 'POOL_ENQUEUELIMIT') {
    console.error('MySQL request failed:', error.code);
    return res.status(503).json({ error: 'Database is unavailable; verify the server configuration and database availability' });
  }

  const status = Number.isInteger(error.status) && error.status >= 400 && error.status <= 599
    ? error.status
    : 500;
  console.error('Request failed:', error.code || error.name || 'Error');
  return res.status(status).json({
    error: error.expose === true || status < 500 ? error.message : 'An unexpected server error occurred',
  });
};
