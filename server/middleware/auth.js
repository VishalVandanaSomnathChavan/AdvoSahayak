const jwt = require('jsonwebtoken');
const { isValidId } = require('../models/helpers');

module.exports = function authenticate(req, res, next) {
  const authorization = req.get('authorization') || '';
  const cookies = Object.fromEntries((req.headers.cookie || '').split(';')
    .map(part => part.trim().split(/=(.*)/s).slice(0, 2))
    .filter(([name, value]) => name && value !== undefined));
  const token = cookies.advo_session || (authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : '');

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    if (!isValidId(req.user.id)) return res.status(401).json({ error: 'Invalid or expired session' });
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
};
