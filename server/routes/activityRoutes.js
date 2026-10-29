const express = require('express');
const Case = require('../models/Case');
const Activity = require('../models/Activity');
const { isValidId } = require('../models/helpers');

const router = express.Router();

router.get('/case/:caseId', async (req, res, next) => {
  if (!isValidId(req.params.caseId)) return res.status(400).json({ error: 'Invalid case identifier' });
  try {
    const ownedCase = await Case.existsOwned(req.params.caseId, req.user.id);
    if (!ownedCase) return res.status(404).json({ error: 'Case not found' });
    return res.json(await Activity.listForCase(req.user.id, req.params.caseId));
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
