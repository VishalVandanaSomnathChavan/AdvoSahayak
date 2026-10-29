const express = require('express');
const router = express.Router();
const researchController = require('../controllers/researchController');

// Route for research
router.post('/', researchController.performResearch);

module.exports = router;