const express = require('express');
const router = express.Router();
const draftingController = require('../controllers/draftingController');

// Route for drafting
router.post('/', draftingController.generateDocument);

module.exports = router;