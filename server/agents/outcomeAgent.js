// Outcome Prediction Agent
// Returns probability, risk, and suggestion based on mock logic

class OutcomeAgent {
  async predictOutcome(caseData) {
    try {
      console.log(`Outcome Agent: Predicting outcome for case: ${caseData.title}`);

      // Mock prediction logic based on case data
      const prediction = this.calculatePrediction(caseData);

      return {
        caseId: caseData._id,
        probability: prediction.probability,
        risk: prediction.risk,
        suggestion: prediction.suggestion,
        factors: prediction.factors,
        predictedAt: new Date(),
      };
    } catch (error) {
      console.error('Error in Outcome Agent:', error);
      throw error;
    }
  }

  calculatePrediction(caseData) {
    // Mock AI prediction logic
    let baseProbability = 0.5; // 50% base win rate
    let risk = 'medium';
    const factors = [];

    // Analyze case description for keywords
    const description = caseData.description.toLowerCase();

    if (description.includes('contract') || description.includes('breach')) {
      baseProbability += 0.2;
      factors.push('Contract dispute - favorable precedents');
    }

    if (description.includes('criminal') || description.includes('felony')) {
      baseProbability -= 0.3;
      risk = 'high';
      factors.push('Criminal case - higher evidentiary burden');
    }

    if (description.includes('property') || description.includes('real estate')) {
      baseProbability += 0.1;
      factors.push('Property case - clear documentation often helps');
    }

    // Check hearings
    if (caseData.hearings && caseData.hearings.length > 0) {
      const recentHearing = caseData.hearings[caseData.hearings.length - 1];
      if (recentHearing.outcome && recentHearing.outcome.toLowerCase().includes('favorable')) {
        baseProbability += 0.15;
        factors.push('Recent favorable hearing outcome');
      }
    }

    // Clamp probability between 0 and 1
    baseProbability = Math.max(0, Math.min(1, baseProbability));

    // Determine risk level
    if (baseProbability > 0.7) risk = 'low';
    else if (baseProbability < 0.3) risk = 'high';

    // Generate suggestion
    let suggestion = 'Continue with standard legal strategy. ';
    if (baseProbability > 0.7) {
      suggestion += 'Strong case - consider settlement negotiations.';
    } else if (baseProbability < 0.3) {
      suggestion += 'Consider plea bargain or alternative dispute resolution.';
    } else {
      suggestion += 'Gather more evidence and prepare thoroughly for trial.';
    }

    return {
      probability: Math.round(baseProbability * 100) / 100,
      risk,
      suggestion,
      factors,
    };
  }
}

module.exports = new OutcomeAgent();