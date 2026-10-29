const researchAgent = require('../agents/researchAgent');

class ResearchController {
  async performResearch(req, res, next) {
    const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
    if (!query || query.length > 5000) {
      return res.status(400).json({ error: 'A research query of 1 to 5,000 characters is required' });
    }
    try {
      const result = await researchAgent.performResearch(query);
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new ResearchController();