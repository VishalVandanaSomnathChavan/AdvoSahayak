const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const uploadDirectory = path.resolve(__dirname, '..', 'private-uploads');
fs.mkdirSync(uploadDirectory, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename(req, file, callback) {
      callback(null, `${crypto.randomUUID()}.pdf`);
    },
  }),
  limits: { fileSize: (Number(process.env.MAX_UPLOAD_MB) || 10) * 1024 * 1024, files: 1 },
  fileFilter(req, file, callback) {
    if (file.mimetype !== 'application/pdf' || path.extname(file.originalname).toLowerCase() !== '.pdf') {
      const error = new Error('Only PDF files are accepted');
      error.status = 400;
      return callback(error);
    }
    return callback(null, true);
  },
});

module.exports = { upload, uploadDirectory };
