// Drafting Agent
// Generates legal documents from templates using case data as context

class DraftingAgent {
  constructor() {
    this.templates = {
      'contract': this.contractTemplate,
      'complaint': this.complaintTemplate,
      'settlement': this.settlementTemplate,
    };
  }

  async generateDocument(templateType, caseData) {
    try {
      console.log(`Drafting Agent: Generating ${templateType} document for case: ${caseData.title}`);

      const template = this.templates[templateType];
      if (!template) {
        throw new Error(`Template ${templateType} not found`);
      }

      const document = template(caseData);

      return {
        templateType,
        content: document,
        generatedAt: new Date(),
        caseId: caseData._id,
      };
    } catch (error) {
      console.error('Error in Drafting Agent:', error);
      throw error;
    }
  }

  contractTemplate(caseData) {
    return `
LEGAL CONTRACT

This Agreement is made on ${new Date().toLocaleDateString()} between:

Party A: ${caseData.clientName}
Party B: [Law Firm Name]

Subject: ${caseData.title}

Description: ${caseData.description}

Terms and Conditions:
1. Both parties agree to abide by the terms outlined in the case description.
2. Any disputes shall be resolved through legal channels.
3. This contract is binding and enforceable under applicable law.

Signatures:
___________________________    ___________________________
${caseData.clientName}              [Law Firm Representative]

Date: ${new Date().toLocaleDateString()}
    `;
  }

  complaintTemplate(caseData) {
    return `
LEGAL COMPLAINT

IN THE COURT OF [JURISDICTION]

Plaintiff: ${caseData.clientName}
Defendant: [Defendant Name]

Case Title: ${caseData.title}

COMPLAINT:

The Plaintiff alleges the following:

1. Background: ${caseData.description}

2. Cause of Action: [Specific legal claims]

3. Relief Sought: The Plaintiff requests the following remedies:
   - Monetary damages
   - Injunctive relief
   - Court costs and attorney's fees

Respectfully submitted,

___________________________
Attorney for Plaintiff

Date: ${new Date().toLocaleDateString()}
    `;
  }

  settlementTemplate(caseData) {
    return `
SETTLEMENT AGREEMENT

This Settlement Agreement is entered into on ${new Date().toLocaleDateString()} between:

${caseData.clientName} ("Party A")
and
[Other Party] ("Party B")

Regarding: ${caseData.title}

Terms of Settlement:

1. The parties agree to resolve all disputes related to ${caseData.description}

2. Party A agrees to [settlement terms]

3. Party B agrees to [settlement terms]

4. This agreement is confidential and binding.

Executed this day:

___________________________    ___________________________
${caseData.clientName}              [Other Party Representative]
    `;
  }
}

module.exports = new DraftingAgent();