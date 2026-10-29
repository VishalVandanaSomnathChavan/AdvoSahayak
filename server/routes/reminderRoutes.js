const express = require('express');
const Case = require('../models/Case');
const Task = require('../models/Task');
const { buildReminders } = require('../services/reminderService');

const router = express.Router();

router.get('/', async (req, res, next) => {
  const days = Math.min(30, Math.max(1, Number.parseInt(req.query.days, 10) || 7));
  const now = new Date();
  const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  try {
    const [cases, tasks] = await Promise.all([
      Case.listReminderCases(req.user.id),
      Task.listOpenDue(req.user.id, until),
    ]);
    return res.json({ reminders: buildReminders(cases, tasks, now, days), windowDays: days });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
