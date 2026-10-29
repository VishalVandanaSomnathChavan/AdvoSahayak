const express = require('express');
const Case = require('../models/Case');
const Task = require('../models/Task');
const { isValidId } = require('../models/helpers');
const { withTransaction } = require('../db/pool');

const router = express.Router();

router.get('/', async (req, res, next) => {
  if (req.query.caseId && !isValidId(req.query.caseId)) return res.status(400).json({ error: 'Invalid case identifier' });
  try {
    const completed = req.query.completed === 'true' ? true : req.query.completed === 'false' ? false : undefined;
    return res.json(await Task.list(req.user.id, { caseId: req.query.caseId, completed }));
  } catch (error) {
    return next(error);
  }
});

router.post('/', async (req, res, next) => {
  const { caseId, title, description = '', dueDate } = req.body;
  if (!isValidId(caseId) || typeof title !== 'string' || !title.trim() || title.length > 200 ||
      typeof description !== 'string' || description.length > 2000 ||
      typeof dueDate !== 'string' || !Number.isFinite(Date.parse(dueDate))) {
    return res.status(400).json({ error: 'A valid case, task title, and due date are required' });
  }
  try {
    const ownedCase = await Case.existsOwned(caseId, req.user.id);
    if (!ownedCase) return res.status(404).json({ error: 'Case not found' });
    const task = await withTransaction(connection => Task.create(connection, {
      ownerId: req.user.id,
      caseId,
      title: title.trim(),
      description: description.trim(),
      dueDate: new Date(dueDate),
    }));
    return res.status(201).json(task);
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid task identifier' });
  if (typeof req.body.completed !== 'boolean') return res.status(400).json({ error: 'A completed boolean is required' });
  try {
    const task = await Task.updateCompletion(req.params.id, req.user.id, req.body.completed);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    return res.json(task);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
