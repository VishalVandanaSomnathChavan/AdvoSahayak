const draftingAgent = require('../agents/draftingAgent');
const caseAgent = require('../agents/caseAgent');

class DraftingController {
  async generateDocument(req, res, next) {
    try {
      const { caseId, templateType } = req.body || {};
      if (typeof caseId !== 'string' || typeof templateType !== 'string' || !templateType.trim()) {
        return res.status(400).json({ error: 'Case ID and template type are required' });
      }

      if (!req.user?.id) return res.status(401).json({ error: 'Authentication required' });
      const caseData = await caseAgent.getCase(req.user.id, caseId);
      if (!caseData) {
        return res.status(404).json({ error: 'Case not found' });
      }

      const document = await draftingAgent.generateDocument(templateType, caseData);
      return res.json(document);
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new DraftingController();