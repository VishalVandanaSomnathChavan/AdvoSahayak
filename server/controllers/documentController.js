const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const pdfParse = require('pdf-parse');
const Document = require('../models/Document');
const { uploadDirectory } = require('../middleware/upload');
const { isValidId } = require('../models/helpers');

async function removeFile(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

class DocumentController {
  async listAll(req, res, next) {
    if (req.query.caseId && !isValidId(req.query.caseId)) {
      return res.status(400).json({ error: 'Invalid case identifier' });
    }
    try {
      if (req.query.caseId && !(await Document.findOwnedCase(req.user.id, req.query.caseId))) {
        return res.status(404).json({ error: 'Case not found' });
      }
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
      return res.json(await Document.listAll(req.user.id, { caseId: req.query.caseId, search }));
    } catch (error) {
      return next(error);
    }
  }

  async upload(req, res, next) {
    if (!req.file) return res.status(400).json({ error: 'Select a PDF file to upload' });
    if (!isValidId(req.params.caseId)) {
      await removeFile(req.file.path).catch(() => {});
      return res.status(400).json({ error: 'Invalid case identifier' });
    }
    try {
      if (!(await Document.findOwnedCase(req.user.id, req.params.caseId))) {
        await removeFile(req.file.path);
        return res.status(404).json({ error: 'Case not found' });
      }
      const file = await fs.readFile(req.file.path);
      if (file.length < 5 || file.subarray(0, 5).toString('ascii') !== '%PDF-') {
        await removeFile(req.file.path);
        return res.status(400).json({ error: 'Uploaded file is not a valid PDF' });
      }

      let text = '';
      let pageCount = 0;
      let status = 'processed';
      let processingNote = '';
      try {
        const parsed = await pdfParse(file, { max: 100 });
        text = parsed.text.slice(0, 1_000_000);
        pageCount = parsed.numpages || 0;
        if (text.trim().length < 80) {
          status = 'text_unavailable';
          processingNote = 'No selectable text was found; scanned PDF OCR is not available';
        }
      } catch (error) {
        status = 'text_unavailable';
        processingNote = 'PDF text extraction could not be completed';
        console.warn('PDF text extraction failed for uploaded document:', error.code || error.name || 'Error');
      }

      const document = await Document.create({
        ownerId: req.user.id,
        caseId: req.params.caseId,
        originalName: path.basename(req.file.originalname).slice(0, 255),
        storedName: req.file.filename,
        size: req.file.size,
        status,
        text,
        pageCount,
        processingNote,
      });
      return res.status(201).json({
        id: document._id,
        originalName: document.originalName,
        size: document.size,
        status: document.status,
        pageCount: document.pageCount,
        uploadedAt: document.uploadedAt,
      });
    } catch (error) {
      await removeFile(req.file.path).catch(cleanupError => {
        console.error('Failed to remove an incomplete uploaded file:', cleanupError.code || cleanupError.name);
      });
      return next(error);
    }
  }

  async list(req, res, next) {
    if (!isValidId(req.params.caseId)) return res.status(400).json({ error: 'Invalid case identifier' });
    try {
      if (!(await Document.findOwnedCase(req.user.id, req.params.caseId))) {
        return res.status(404).json({ error: 'Case not found' });
      }
      return res.json(await Document.listForCase(req.user.id, req.params.caseId));
    } catch (error) {
      return next(error);
    }
  }

  async download(req, res, next) {
    if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid document identifier' });
    try {
      const document = await Document.findOwned(req.params.id, req.user.id);
      if (!document) return res.status(404).json({ error: 'Document not found' });
      return res.download(path.join(uploadDirectory, path.basename(document.storedName)), document.originalName, error => {
        if (error && !res.headersSent) next(error);
      });
    } catch (error) {
      return next(error);
    }
  }

  async remove(req, res, next) {
    if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid document identifier' });
    let quarantinedPath;
    let originalPath;
    try {
      const existing = await Document.findOwned(req.params.id, req.user.id);
      if (!existing) return res.status(404).json({ error: 'Document not found' });
      originalPath = path.join(uploadDirectory, path.basename(existing.storedName));
      quarantinedPath = `${originalPath}.${crypto.randomUUID()}.deleting`;
      try {
        await fs.rename(originalPath, quarantinedPath);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }

      const deleted = await Document.removeOwned(req.params.id, req.user.id);
      if (!deleted) {
        if (quarantinedPath) await fs.rename(quarantinedPath, originalPath).catch(() => {});
        return res.status(404).json({ error: 'Document not found' });
      }
      if (quarantinedPath) {
        await removeFile(quarantinedPath).catch(error => {
          console.error('Deleted document file cleanup failed:', error.code || error.name);
        });
      }
      return res.status(204).end();
    } catch (error) {
      if (quarantinedPath && originalPath) {
        await fs.rename(quarantinedPath, originalPath).catch(restoreError => {
          if (restoreError.code !== 'ENOENT') console.error('Document file restore failed:', restoreError.code || restoreError.name);
        });
      }
      return next(error);
    }
  }
}

module.exports = new DocumentController();
