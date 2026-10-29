const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const authenticate = require('../middleware/auth');
const { isValidId } = require('../models/helpers');
const aiService = require('../services/aiService');
const { buildReminders } = require('../services/reminderService');
const researchAgent = require('../agents/researchAgent');
const errorHandler = require('../middleware/errorHandler');

test('authentication rejects requests without a session', () => {
  let statusCode;
  let body;
  let continued = false;
  const response = {
    status(code) { statusCode = code; return this; },
    json(value) { body = value; return this; },
  };
  authenticate({ get: () => '', headers: {} }, response, () => { continued = true; });
  assert.equal(statusCode, 401);
  assert.equal(body.error, 'Authentication required');
  assert.equal(continued, false);
});

test('authentication accepts a valid signed session cookie', () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-secret-with-more-than-thirty-two-characters';
  try {
    const token = jwt.sign({ id: '123' }, process.env.JWT_SECRET);
    let continued = false;
    const request = { get: () => '', headers: { cookie: `advo_session=${token}` } };
    authenticate(request, {}, () => { continued = true; });
    assert.equal(continued, true);
    assert.equal(request.user.id, '123');
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});

test('database identifiers accept positive MySQL BIGINT values only', () => {
  assert.equal(isValidId('1'), true);
  assert.equal(isValidId('18446744073709551615'), true);
  assert.equal(isValidId('0'), false);
  assert.equal(isValidId('-1'), false);
  assert.equal(isValidId('1 OR 1=1'), false);
  assert.equal(isValidId('18446744073709551616'), false);
});

test('AI workflows fail explicitly when no provider key is configured', async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    await assert.rejects(aiService.generate({ task: 'summary', prompt: 'Summarize' }), error => {
      assert.equal(error.status, 503);
      assert.match(error.message, /OPENAI_API_KEY/);
      return true;
    });
  } finally {
    if (previousKey !== undefined) process.env.OPENAI_API_KEY = previousKey;
  }
});

test('legal research never returns placeholder authorities when no provider is configured', async () => {
  await assert.rejects(researchAgent.performResearch('synthetic contract question'), error => {
    assert.equal(error.status, 503);
    assert.match(error.message, /no legal research provider is configured/);
    return true;
  });
});

test('unexpected server errors do not expose internal messages', () => {
  let statusCode;
  let responseBody;
  errorHandler(
    Object.assign(new Error('SQL statement and internal connection details'), { status: 500 }),
    {},
    {
      headersSent: false,
      status(code) { statusCode = code; return this; },
      json(body) { responseBody = body; return this; },
    },
    () => assert.fail('Unexpected error should be handled'),
  );
  assert.equal(statusCode, 500);
  assert.deepEqual(responseBody, { error: 'An unexpected server error occurred' });
});

test('reminders exclude uncertain dates and completed deadlines', () => {
  const now = new Date('2026-10-29T00:00:00.000Z');
  const due = new Date('2026-10-31T12:00:00.000Z');
  const reminders = buildReminders([{
    _id: 'case-1',
    title: 'Matter',
    deadlines: [
      { _id: 'verified', date: due, description: 'Verified filing date', confidence: 'verified', completed: false },
      { _id: 'uncertain', date: due, description: 'Possible date', confidence: 'uncertain', completed: false },
      { _id: 'complete', date: due, description: 'Done already', confidence: 'verified', completed: true },
    ],
    hearings: [],
  }], [], now, 7);
  assert.equal(reminders.length, 1);
  assert.equal(reminders[0].title, 'Verified filing date');
});

test('reminders include overdue open tasks and sort by due date', () => {
  const now = new Date('2026-10-29T00:00:00.000Z');
  const reminders = buildReminders([], [
    { _id: 'later', title: 'Later', dueDate: new Date('2026-10-31T00:00:00.000Z'), case: { _id: 'case-1', title: 'Matter' } },
    { _id: 'past', title: 'Past', dueDate: new Date('2026-10-28T00:00:00.000Z'), case: { _id: 'case-1', title: 'Matter' } },
  ], now, 7);
  assert.equal(reminders[0].title, 'Past');
  assert.equal(reminders[0].overdue, true);
  assert.equal(reminders[1].overdue, false);
});
