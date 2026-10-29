const express = require('express');
const controller = require('../controllers/aiController');

const router = express.Router();
router.get('/case/:caseId', controller.list);
router.post('/case/:caseId/summary', controller.run('summary'));
router.post('/case/:caseId/question', controller.run('question'));
router.post('/case/:caseId/brief', controller.run('brief'));
router.post('/case/:caseId/draft', controller.run('draft'));
router.patch('/:id/review', controller.review);

module.exports = router;
