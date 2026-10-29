class ResearchAgent {
  async performResearch(query) {
    if (typeof query !== 'string' || !query.trim() || query.length > 5000) {
      const error = new Error('A research query of 1 to 5,000 characters is required');
      error.status = 400;
      throw error;
    }

    const error = new Error('Verified legal research is unavailable because no legal research provider is configured');
    error.status = 503;
    error.expose = true;
    throw error;
  }
}

module.exports = new ResearchAgent();
