const Case = require('../models/Case');
const { isValidId } = require('../models/helpers');

const editableFields = [
  'caseNumber', 'title', 'clientName', 'description', 'court', 'caseType',
  'parties', 'status', 'importantDates', 'archived',
];

function pickEditable(body) {
  body ||= {};
  return Object.fromEntries(editableFields
    .filter(field => body[field] !== undefined)
    .map(field => [field, body[field]]));
}

function validateCaseFields(data) {
  const stringLimits = {
    caseNumber: 100,
    title: 200,
    clientName: 200,
    description: 10000,
    court: 200,
    caseType: 100,
  };
  for (const [field, limit] of Object.entries(stringLimits)) {
    if (data[field] !== undefined && (typeof data[field] !== 'string' || data[field].length > limit ||
        (['title', 'clientName', 'description'].includes(field) && !data[field].trim()))) {
      return `${field} must be a non-empty string of at most ${limit} characters`;
    }
  }
  if (data.status !== undefined && !['active', 'pending', 'closed'].includes(data.status)) {
    return 'Case status is invalid';
  }
  if (data.archived !== undefined && typeof data.archived !== 'boolean') return 'Archived must be a boolean';
  if (data.parties !== undefined && (!Array.isArray(data.parties) ||
      data.parties.some(value => typeof value !== 'string' || !value.trim() || value.length > 200))) {
    return 'Parties must be an array of non-empty strings up to 200 characters';
  }
  if (data.importantDates !== undefined && (!Array.isArray(data.importantDates) ||
      data.importantDates.some(value => !value || typeof value !== 'object' ||
        typeof value.label !== 'string' || value.label.length > 200 ||
        (value.date != null && !Number.isFinite(Date.parse(value.date)))))) {
    return 'Important dates must include a label and valid optional date';
  }
  return null;
}

class CaseController {
  async createCase(req, res, next) {
    try {
      const { title, clientName, description } = req.body || {};
      if (![title, clientName, description].every(value => typeof value === 'string' && value.trim())) {
        return res.status(400).json({ error: 'Title, client name, and description are required' });
      }
      const data = pickEditable(req.body);
      const validationError = validateCaseFields(data);
      if (validationError) return res.status(400).json({ error: validationError });
      const newCase = await Case.createCase(req.user.id, data);
      return res.status(201).json(newCase);
    } catch (error) {
      return next(error);
    }
  }

  async getAllCases(req, res, next) {
    try {
      const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
      const result = await Case.listCases(req.user.id, {
        archived: req.query.archived === 'true',
        status: ['active', 'pending', 'closed'].includes(req.query.status) ? req.query.status : undefined,
        search: typeof req.query.search === 'string' ? req.query.search.trim() : '',
        page,
        limit,
      });
      return res.json({
        cases: result.cases,
        pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) },
      });
    } catch (error) {
      return next(error);
    }
  }

  async getCase(req, res, next) {
    if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid case identifier' });
    try {
      const caseData = await Case.findOwnedCase(req.params.id, req.user.id);
      if (!caseData) return res.status(404).json({ error: 'Case not found' });
      return res.json(caseData);
    } catch (error) {
      return next(error);
    }
  }

  async updateCase(req, res, next) {
    if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid case identifier' });
    const data = pickEditable(req.body);
    if (!Object.keys(data).length) return res.status(400).json({ error: 'No editable fields provided' });
    const validationError = validateCaseFields(data);
    if (validationError) return res.status(400).json({ error: validationError });
    try {
      const updatedCase = await Case.updateCase(req.params.id, req.user.id, data);
      if (!updatedCase) return res.status(404).json({ error: 'Case not found' });
      return res.json(updatedCase);
    } catch (error) {
      return next(error);
    }
  }

  async addDeadline(req, res, next) {
    if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid case identifier' });
    const { date, description } = req.body;
    if (typeof description !== 'string' || !description.trim() || description.length > 1000 || !Number.isFinite(Date.parse(date))) {
      return res.status(400).json({ error: 'A description and valid date are required' });
    }
    try {
      const deadline = await Case.addItem(req.user.id, req.params.id, 'deadline', {
        date: new Date(date),
        description: description.trim(),
      });
      if (!deadline) return res.status(404).json({ error: 'Case not found' });
      return res.status(201).json(deadline);
    } catch (error) {
      return next(error);
    }
  }

  async addNote(req, res, next) {
    if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid case identifier' });
    const { content } = req.body || {};
    if (typeof content !== 'string' || !content.trim() || content.length > 10000) {
      return res.status(400).json({ error: 'A note of 1 to 10,000 characters is required' });
    }
    try {
      const note = await Case.addNote(req.user.id, req.params.id, content.trim());
      if (!note) return res.status(404).json({ error: 'Case not found' });
      return res.status(201).json(note);
    } catch (error) {
      return next(error);
    }
  }

  async addHearing(req, res, next) {
    if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid case identifier' });
    const { date, description, outcome = '' } = req.body;
    if (typeof description !== 'string' || !description.trim() || description.length > 1000 ||
        typeof outcome !== 'string' || outcome.length > 2000 || !Number.isFinite(Date.parse(date))) {
      return res.status(400).json({ error: 'A description and valid date are required' });
    }
    try {
      const hearing = await Case.addItem(req.user.id, req.params.id, 'hearing', {
        date: new Date(date),
        description: description.trim(),
        outcome: outcome.trim(),
      });
      if (!hearing) return res.status(404).json({ error: 'Case not found' });
      return res.status(201).json(hearing);
    } catch (error) {
      return next(error);
    }
  }

  async updateHearing(req, res, next) {
    if (!isValidId(req.params.id) || !isValidId(req.params.hearingId)) {
      return res.status(400).json({ error: 'Invalid case or hearing identifier' });
    }
    const updates = {};
    if (req.body.description !== undefined) {
      if (typeof req.body.description !== 'string' || !req.body.description.trim() || req.body.description.length > 1000) {
        return res.status(400).json({ error: 'Hearing description must be between 1 and 1,000 characters' });
      }
      updates.description = req.body.description.trim();
    }
    if (req.body.date !== undefined) {
      if (!Number.isFinite(Date.parse(req.body.date))) return res.status(400).json({ error: 'A valid hearing date is required' });
      updates.date = new Date(req.body.date);
    }
    if (req.body.outcome !== undefined) {
      if (typeof req.body.outcome !== 'string' || req.body.outcome.length > 2000) {
        return res.status(400).json({ error: 'Hearing outcome must be 2,000 characters or fewer' });
      }
      updates.outcome = req.body.outcome.trim();
    }
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'No editable hearing fields provided' });
    try {
      const hearing = await Case.updateHearing(req.user.id, req.params.id, req.params.hearingId, updates);
      if (!hearing) return res.status(404).json({ error: 'Hearing not found' });
      return res.json(hearing);
    } catch (error) {
      return next(error);
    }
  }

  async updateDeadline(req, res, next) {
    if (!isValidId(req.params.id) || !isValidId(req.params.deadlineId)) {
      return res.status(400).json({ error: 'Invalid case or deadline identifier' });
    }
    if (typeof req.body.completed !== 'boolean') return res.status(400).json({ error: 'A completed boolean is required' });
    try {
      const deadline = await Case.updateDeadline(req.user.id, req.params.id, req.params.deadlineId, req.body.completed);
      if (!deadline) return res.status(404).json({ error: 'Deadline not found' });
      return res.json(deadline);
    } catch (error) {
      return next(error);
    }
  }

  async getDashboard(req, res, next) {
    try {
      return res.json(await Case.dashboard(req.user.id));
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new CaseController();
