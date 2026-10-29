const Case = require('../models/Case');
const Document = require('../models/Document');
const AiAnalysis = require('../models/AiAnalysis');
const { isValidId } = require('../models/helpers');
const aiService = require('../services/aiService');

const supportedTypes = new Set(['summary', 'question', 'brief', 'draft']);

async function createAnalysis(req, res, next, type) {
  const { caseId } = req.params;
  const { prompt = '', documentId } = req.body;
  if (!isValidId(caseId)) return res.status(400).json({ error: 'Invalid case identifier' });
  if (typeof prompt !== 'string' || prompt.length > 5000) return res.status(400).json({ error: 'Prompt must be 5,000 characters or fewer' });
  if (!supportedTypes.has(type)) return res.status(400).json({ error: 'Unsupported AI workflow' });

  try {
    const caseData = await Case.findOwnedCase(caseId, req.user.id);
    if (!caseData) return res.status(404).json({ error: 'Case not found' });
    let document;
    if (documentId) {
      if (!isValidId(documentId)) return res.status(400).json({ error: 'Invalid document identifier' });
      document = await Document.findOwned(documentId, req.user.id);
      if (!document || document.case !== String(caseId)) return res.status(404).json({ error: 'Document not found' });
    }
    if (type !== 'question' && !document && !prompt.trim()) {
      return res.status(400).json({ error: 'Provide a source document or a prompt' });
    }
    if (type === 'question' && !prompt.trim()) return res.status(400).json({ error: 'A question is required' });

    const sourceExcerpt = document?.text ? document.text.slice(0, 2000) : '';
    const result = await aiService.generate({
      task: type,
      prompt: `${prompt || `Prepare a ${type} using the supplied case information.`}\n\nCase facts: ${JSON.stringify({
        caseNumber: caseData.caseNumber,
        title: caseData.title,
        clientName: caseData.clientName,
        description: caseData.description,
        court: caseData.court,
        parties: caseData.parties,
      })}`,
      sourceText: document?.text || '',
    });
    const analysis = await AiAnalysis.create({
      ownerId: req.user.id,
      caseId: caseData._id,
      documentId: document?._id,
      type,
      prompt: prompt || `Prepare a ${type}`,
      result,
      sourceExcerpt,
    });
    return res.json({ analysis, disclaimer: 'AI-generated content is a draft. Verify all facts and legal information before use.' });
  } catch (error) {
    return next(error);
  }
}

exports.list = async (req, res, next) => {
  if (!isValidId(req.params.caseId)) return res.status(400).json({ error: 'Invalid case identifier' });
  try {
    const ownedCase = await Case.existsOwned(req.params.caseId, req.user.id);
    if (!ownedCase) return res.status(404).json({ error: 'Case not found' });
    return res.json(await AiAnalysis.listForCase(req.user.id, req.params.caseId));
  } catch (error) {
    return next(error);
  }
};

exports.run = type => (req, res, next) => createAnalysis(req, res, next, type);

exports.review = async (req, res, next) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid analysis identifier' });
  if (typeof req.body.reviewed !== 'boolean') return res.status(400).json({ error: 'A reviewed boolean is required' });
  try {
    const analysis = await AiAnalysis.updateReviewed(req.user.id, req.params.id, req.body.reviewed);
    if (!analysis) return res.status(404).json({ error: 'Analysis not found' });
    return res.json(analysis);
  } catch (error) {
    return next(error);
  }
};
