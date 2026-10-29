const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authenticate = require('../middleware/auth');

const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createToken(user) {
  return jwt.sign({ id: String(user.id), email: user.email }, process.env.JWT_SECRET, { expiresIn: '12h' });
}

function setSessionCookie(res, token) {
  res.cookie('advo_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 12 * 60 * 60 * 1000,
    path: '/',
  });
}

function publicUser(user) {
  return { id: String(user.id), name: user.name, email: user.email };
}

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({ error: 'Name must be between 2 and 100 characters' });
    }
    if (typeof email !== 'string' || !emailPattern.test(email) || email.length > 254) {
      return res.status(400).json({ error: 'A valid email address is required' });
    }
    if (typeof password !== 'string' || password.length < 10 || password.length > 128) {
      return res.status(400).json({ error: 'Password must be between 10 and 128 characters' });
    }
    const user = await User.create({ name: name.trim(), email: email.trim().toLowerCase(), password });
    setSessionCookie(res, createToken(user));
    return res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (email.length > 254 || !password || password.length > 128) {
      return res.status(401).json({ error: 'Email or password is incorrect' });
    }
    const user = await User.findByEmail(email);
    if (!user || !(await User.verifyPassword(user, password))) {
      return res.status(401).json({ error: 'Email or password is incorrect' });
    }
    setSessionCookie(res, createToken(user));
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await User.findPublicById(req.user.id);
    if (!user) return res.status(401).json({ error: 'Account no longer exists' });
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.patch('/me', authenticate, async (req, res, next) => {
  try {
    const current = await User.findWithPassword(req.user.id);
    if (!current) return res.status(401).json({ error: 'Account no longer exists' });
    const updates = {};
    if (typeof req.body.name === 'string') {
      if (req.body.name.trim().length < 2 || req.body.name.trim().length > 100) {
        return res.status(400).json({ error: 'Name must be between 2 and 100 characters' });
      }
      updates.name = req.body.name.trim();
    }
    if (req.body.password !== undefined) {
      if (typeof req.body.currentPassword !== 'string' || !(await User.verifyPassword(current, req.body.currentPassword))) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
      if (typeof req.body.password !== 'string' || req.body.password.length < 10 || req.body.password.length > 128) {
        return res.status(400).json({ error: 'New password must be between 10 and 128 characters' });
      }
      updates.password = req.body.password;
    }
    const user = await User.updateProfile(req.user.id, updates);
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('advo_session', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
  return res.json({ success: true });
});

module.exports = router;
