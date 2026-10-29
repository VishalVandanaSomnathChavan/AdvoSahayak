const Case = require('../models/Case');

class CaseAgent {
  async createCase(ownerId, caseData) {
    if (!ownerId) throw new Error('An authenticated owner is required to create a case');
    return Case.createCase(ownerId, caseData);
  }

  async updateCase(ownerId, caseId, updateData) {
    if (!ownerId) throw new Error('An authenticated owner is required to update a case');
    return Case.updateCase(caseId, ownerId, updateData);
  }

  async getCase(ownerId, caseId) {
    if (!ownerId) throw new Error('An authenticated owner is required to retrieve a case');
    return Case.findOwnedCase(caseId, ownerId);
  }

  async getAllCases(ownerId) {
    if (!ownerId) throw new Error('An authenticated owner is required to list cases');
    const result = await Case.listCases(ownerId, { archived: false, page: 1, limit: 100 });
    return result.cases;
  }
}

module.exports = new CaseAgent();
