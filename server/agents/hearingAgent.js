const Case = require('../models/Case');

class HearingAgent {
  async addHearing(ownerId, caseId, hearingData) {
    const hearing = await Case.addItem(ownerId, caseId, 'hearing', hearingData);
    if (!hearing) throw new Error('Case not found');
    return { hearing, summary: await this.summarizeHearing(hearing) };
  }

  async updateHearing(ownerId, caseId, hearingId, updateData) {
    const hearing = await Case.updateHearing(ownerId, caseId, hearingId, updateData);
    if (!hearing) throw new Error('Hearing not found');
    return { hearing, summary: await this.summarizeHearing(hearing) };
  }

  async summarizeHearing(hearingData) {
    return `Hearing Summary: ${hearingData.description}. Outcome: ${hearingData.outcome || 'Pending'}. Date: ${new Date(hearingData.date).toLocaleDateString()}.`;
  }

  async getHearingHistory(ownerId, caseId) {
    const caseData = await Case.findOwnedCase(caseId, ownerId);
    if (!caseData) throw new Error('Case not found');
    return caseData.hearings;
  }
}

module.exports = new HearingAgent();
