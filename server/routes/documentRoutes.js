const express = require('express');
const documentController = require('../controllers/documentController');
const { upload } = require('../middleware/upload');

const router = express.Router();

router.get('/', documentController.listAll);
router.post('/:caseId', upload.single('document'), documentController.upload);
router.get('/case/:caseId', documentController.list);
router.get('/:id/download', documentController.download);
router.delete('/:id', documentController.remove);

module.exports = router;
