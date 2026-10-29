const express = require('express');
const router = express.Router();
const caseController = require('../controllers/caseController');

router.get('/dashboard', caseController.getDashboard.bind(caseController));
router.post('/', caseController.createCase);
router.get('/', caseController.getAllCases);
router.get('/:id', caseController.getCase);
router.put('/:id', caseController.updateCase);
router.post('/:id/notes', caseController.addNote);
router.post('/:id/deadlines', caseController.addDeadline);
router.post('/:id/hearings', caseController.addHearing);
router.patch('/:id/hearings/:hearingId', caseController.updateHearing);
router.patch('/:id/deadlines/:deadlineId', caseController.updateDeadline);

module.exports = router;