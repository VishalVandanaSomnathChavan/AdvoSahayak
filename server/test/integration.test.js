const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const net = require('node:net');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const pdfParse = require('pdf-parse');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const testDatabase = process.env.MYSQL_TEST_DATABASE;
if (!testDatabase || !/^advosahayak_[a-z0-9_]*test[a-z0-9_]*$/i.test(testDatabase)) {
  throw new Error('Set MYSQL_TEST_DATABASE to a dedicated database whose name begins with advosahayak_ and includes test.');
}

process.env.MYSQL_DATABASE = testDatabase;
process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');

const { pool, withTransaction } = require('../db/pool');
const { initializeDatabase } = require('../db/initialize');
const Document = require('../models/Document');
const { uploadDirectory } = require('../middleware/upload');
const serverDirectory = path.join(__dirname, '..');

const expectedTables = [
  'activities',
  'ai_analyses',
  'case_notes',
  'case_parties',
  'cases',
  'deadlines',
  'documents',
  'hearings',
  'important_dates',
  'tasks',
  'users',
];

function makePdf() {
  const content = 'BT /F1 14 Tf 50 700 Td (Synthetic integration test PDF with selectable text and safe fictional content for case-management persistence and access-control verification.) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(content, 'ascii')} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let document = '%PDF-1.4\n';
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(document, 'ascii'));
    document += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(document, 'ascii');
  document += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    document += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  document += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(document, 'ascii');
}

async function getAvailablePort() {
  const listener = net.createServer();
  await new Promise((resolve, reject) => {
    listener.once('error', reject);
    listener.listen(0, '127.0.0.1', resolve);
  });
  const { port } = listener.address();
  await new Promise((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
  return port;
}

async function startBackend() {
  const port = await getAvailablePort();
  const childEnvironment = { ...process.env, PORT: String(port), MYSQL_DATABASE: testDatabase };
  childEnvironment.OPENAI_API_KEY = '';
  const child = spawn(process.execPath, ['server.js'], {
    cwd: serverDirectory,
    env: childEnvironment,
    stdio: ['ignore', 'ignore', 'pipe'],
    windowsHide: true,
  });
  let diagnostics = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', chunk => { diagnostics = `${diagnostics}${chunk}`.slice(-2000); });
  const baseUrl = `http://127.0.0.1:${port}`;

  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`Test API process exited before becoming ready (${child.exitCode}): ${diagnostics}`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(500) });
      if (response.status === 200) return { child, baseUrl, getDiagnostics: () => diagnostics };
    } catch (error) {
      if (error.name !== 'AbortError' && error.name !== 'TimeoutError' && error.cause?.code !== 'ECONNREFUSED') {
        throw error;
      }
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  await stopBackend(child);
  throw new Error(`Test API process did not become ready: ${diagnostics}`);
}

async function stopBackend(child) {
  if (!child || child.exitCode !== null) return;
  const exited = new Promise(resolve => child.once('exit', resolve));
  child.kill();
  let timer;
  const timeout = new Promise(resolve => { timer = setTimeout(() => resolve(false), 5000); });
  const didExit = await Promise.race([exited.then(() => true), timeout]);
  clearTimeout(timer);
  if (didExit) return;
  child.kill('SIGKILL');
  await exited;
}

async function request(baseUrl, route, { method = 'GET', cookie, body, headers = {} } = {}) {
  const requestHeaders = { ...headers };
  if (cookie) requestHeaders.Cookie = cookie;
  if (body !== undefined) requestHeaders['Content-Type'] = 'application/json';
  return fetch(`${baseUrl}${route}`, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function json(response) {
  return response.json();
}

test('MySQL API workflows preserve ownership, relationships, files, and persistence', async () => {
  let backend;
  let backendDiagnostics = () => '';
  let baseUrl;
  let ownerId;
  let otherOwnerId;
  let documentPath;
  const emails = [
    `audit-${crypto.randomUUID()}@example.invalid`,
    `audit-${crypto.randomUUID()}@example.invalid`,
    `audit-${crypto.randomUUID()}@example.invalid`,
  ];
  const previousAiKey = process.env.OPENAI_API_KEY;

  try {
    await initializeDatabase();
    const [[databaseRow]] = await pool.query('SELECT DATABASE() AS name');
    assert.equal(databaseRow.name, testDatabase, 'integration tests must use the dedicated test database');

    const [tableRows] = await pool.query(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = ? ORDER BY table_name',
      ['BASE TABLE'],
    );
    assert.deepEqual(tableRows.map(row => row.table_name || row.TABLE_NAME), expectedTables);

    await assert.rejects(withTransaction(async connection => {
      const [userInsert] = await connection.execute(
        'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
        ['Synthetic rollback owner', emails[2], 'not-a-login-credential'],
      );
      await connection.execute(
        `INSERT INTO cases (owner_id, title, client_name, description)
         VALUES (?, ?, ?, ?)`,
        ['18446744073709551615', 'Synthetic rollback case', 'Synthetic client', 'This insert must fail its foreign key.'],
      );
      return userInsert;
    }), error => error.code === 'ER_NO_REFERENCED_ROW_2');
    const [rolledBack] = await pool.execute('SELECT COUNT(*) AS count FROM users WHERE email = ?', [emails[2]]);
    assert.equal(Number(rolledBack[0].count), 0);

    ({ child: backend, baseUrl, getDiagnostics: backendDiagnostics } = await startBackend());
    const health = await request(baseUrl, '/api/health');
    assert.equal(health.status, 200);
    assert.deepEqual(await json(health), { status: 'ok', database: 'connected', engine: 'mysql' });

    const unauthenticated = await request(baseUrl, '/api/cases');
    assert.equal(unauthenticated.status, 401);

    const password = `Test-${crypto.randomBytes(18).toString('hex')}`;
    const registerOwner = await request(baseUrl, '/api/auth/register', {
      method: 'POST',
      body: { name: 'Synthetic Audit Owner', email: emails[0], password },
    });
    assert.equal(registerOwner.status, 201);
    const ownerCookie = registerOwner.headers.get('set-cookie')?.split(';')[0];
    const owner = await json(registerOwner);
    ownerId = owner.user.id;
    assert.ok(ownerCookie);
    assert.equal(owner.user.email, emails[0]);

    const duplicate = await request(baseUrl, '/api/auth/register', {
      method: 'POST',
      body: { name: 'Synthetic Audit Owner', email: emails[0], password },
    });
    assert.equal(duplicate.status, 409);

    const invalidRegistration = await request(baseUrl, '/api/auth/register', {
      method: 'POST',
      body: { name: 'x', email: 'not-an-email', password: 'short' },
    });
    assert.equal(invalidRegistration.status, 400);

    const validLogin = await request(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: { email: emails[0], password },
    });
    assert.equal(validLogin.status, 200);
    assert.ok(validLogin.headers.get('set-cookie')?.includes('advo_session='));

    const invalidLogin = await request(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: { email: emails[0], password: 'not-the-password' },
    });
    assert.equal(invalidLogin.status, 401);

    const invalidCase = await request(baseUrl, '/api/cases', {
      method: 'POST',
      cookie: ownerCookie,
      body: { title: '', clientName: 'Synthetic Client', description: 'Synthetic description' },
    });
    assert.equal(invalidCase.status, 400);

    const createCase = await request(baseUrl, '/api/cases', {
      method: 'POST',
      cookie: ownerCookie,
      body: {
        title: 'Synthetic audit matter',
        clientName: 'Synthetic client',
        caseNumber: `AUDIT-${crypto.randomUUID()}`,
        description: 'Fictional data for isolated integration testing.',
        parties: ['Synthetic claimant'],
        importantDates: [{ label: 'Synthetic review date', date: '2027-01-15T12:00:00.000Z' }],
      },
    });
    assert.equal(createCase.status, 201);
    const createdCase = await json(createCase);
    const caseId = createdCase._id;
    assert.ok(caseId);
    assert.deepEqual(createdCase.parties, ['Synthetic claimant']);
    assert.equal(createdCase.importantDates[0].label, 'Synthetic review date');

    const noteResponse = await request(baseUrl, `/api/cases/${caseId}/notes`, {
      method: 'POST',
      cookie: ownerCookie,
      body: { content: 'Synthetic case note for the integration test.' },
    });
    assert.equal(noteResponse.status, 201);
    assert.equal((await json(noteResponse)).content, 'Synthetic case note for the integration test.');

    const invalidNote = await request(baseUrl, `/api/cases/${caseId}/notes`, {
      method: 'POST',
      cookie: ownerCookie,
      body: { content: '  ' },
    });
    assert.equal(invalidNote.status, 400);

    const updateCase = await request(baseUrl, `/api/cases/${caseId}`, {
      method: 'PUT',
      cookie: ownerCookie,
      body: {
        title: 'Updated synthetic audit matter',
        parties: ['Synthetic respondent'],
        importantDates: [{ label: 'Updated review date', date: '2027-02-15T12:00:00.000Z' }],
      },
    });
    assert.equal(updateCase.status, 200);
    const updatedCase = await json(updateCase);
    assert.deepEqual(updatedCase.parties, ['Synthetic respondent']);
    assert.equal(updatedCase.importantDates[0].label, 'Updated review date');

    const getCase = await request(baseUrl, `/api/cases/${caseId}`, { cookie: ownerCookie });
    assert.equal(getCase.status, 200);
    const persistedCase = await json(getCase);
    assert.equal(persistedCase.title, 'Updated synthetic audit matter');
    assert.equal(persistedCase.notes[0].content, 'Synthetic case note for the integration test.');

    const createHearing = await request(baseUrl, `/api/cases/${caseId}/hearings`, {
      method: 'POST',
      cookie: ownerCookie,
      body: {
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Synthetic audit hearing',
        outcome: '',
      },
    });
    assert.equal(createHearing.status, 201);
    const hearing = await json(createHearing);

    const updateHearing = await request(baseUrl, `/api/cases/${caseId}/hearings/${hearing._id}`, {
      method: 'PATCH',
      cookie: ownerCookie,
      body: { description: 'Updated synthetic audit hearing', outcome: 'Synthetic outcome' },
    });
    assert.equal(updateHearing.status, 200);
    assert.equal((await json(updateHearing)).description, 'Updated synthetic audit hearing');

    const createDeadline = await request(baseUrl, `/api/cases/${caseId}/deadlines`, {
      method: 'POST',
      cookie: ownerCookie,
      body: {
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Synthetic audit deadline',
      },
    });
    assert.equal(createDeadline.status, 201);
    const deadline = await json(createDeadline);

    const deadlineReminderResponse = await request(baseUrl, '/api/reminders?days=7', { cookie: ownerCookie });
    assert.equal(deadlineReminderResponse.status, 200);
    const deadlineReminders = (await json(deadlineReminderResponse)).reminders;
    assert.ok(deadlineReminders.some(item => item.type === 'hearing'));
    assert.ok(deadlineReminders.some(item => item.type === 'deadline'));

    const completeDeadline = await request(baseUrl, `/api/cases/${caseId}/deadlines/${deadline._id}`, {
      method: 'PATCH',
      cookie: ownerCookie,
      body: { completed: true },
    });
    assert.equal(completeDeadline.status, 200);
    assert.equal((await json(completeDeadline)).completed, true);

    const createTask = await request(baseUrl, '/api/tasks', {
      method: 'POST',
      cookie: ownerCookie,
      body: {
        caseId,
        title: 'Synthetic audit task',
        description: 'Task created only for automated testing.',
        dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });
    assert.equal(createTask.status, 201);
    const task = await json(createTask);
    const taskReminderResponse = await request(baseUrl, '/api/reminders?days=7', { cookie: ownerCookie });
    assert.ok((await json(taskReminderResponse)).reminders.some(item => item.type === 'task'));

    const completeTask = await request(baseUrl, `/api/tasks/${task._id}`, {
      method: 'PATCH',
      cookie: ownerCookie,
      body: { completed: true },
    });
    assert.equal(completeTask.status, 200);
    assert.equal((await json(completeTask)).completed, true);

    const dashboard = await request(baseUrl, '/api/cases/dashboard', { cookie: ownerCookie });
    assert.equal(dashboard.status, 200);
    const dashboardData = await json(dashboard);
    assert.ok(dashboardData.totalCases >= 1);
    assert.equal(dashboardData.pendingTasks, 0);

    const activities = await request(baseUrl, `/api/activity/case/${caseId}`, { cookie: ownerCookie });
    assert.equal(activities.status, 200);
    assert.ok((await json(activities)).some(item => item.type === 'note_added'));

    const uploadForm = new FormData();
    uploadForm.append('document', new Blob([makePdf()], { type: 'application/pdf' }), 'synthetic-audit.pdf');
    const uploadResponse = await fetch(`${baseUrl}/api/documents/${caseId}`, {
      method: 'POST',
      headers: { Cookie: ownerCookie },
      body: uploadForm,
    });
    assert.equal(uploadResponse.status, 201);
    const uploaded = await json(uploadResponse);
    const storedDocument = await Document.findOwned(uploaded.id, ownerId);
    documentPath = path.join(uploadDirectory, path.basename(storedDocument.storedName));
    const storedBytes = await fs.readFile(documentPath);
    assert.deepEqual(storedBytes, makePdf());
    const independentlyParsed = await pdfParse(storedBytes, { max: 100 });
    assert.match(independentlyParsed.text, /Synthetic integration test PDF/);
    assert.equal(
      uploaded.status,
      'processed',
      `${storedDocument.processingNote} (extracted text length: ${storedDocument.text.trim().length}; ${backendDiagnostics()})`,
    );
    assert.ok(uploaded.pageCount >= 1);
    assert.ok(storedDocument.text.includes('Synthetic integration test PDF'));

    const documentList = await request(baseUrl, `/api/documents/case/${caseId}`, { cookie: ownerCookie });
    assert.equal(documentList.status, 200);
    const listedDocuments = await json(documentList);
    assert.equal(listedDocuments.length, 1);
    assert.equal('text' in listedDocuments[0], false);
    assert.equal('storedName' in listedDocuments[0], false);

    const download = await request(baseUrl, `/api/documents/${uploaded.id}/download`, { cookie: ownerCookie });
    assert.equal(download.status, 200);
    assert.deepEqual(Buffer.from(await download.arrayBuffer()), makePdf());

    const invalidPdfForm = new FormData();
    invalidPdfForm.append('document', new Blob(['not a PDF'], { type: 'application/pdf' }), 'invalid.pdf');
    const invalidPdf = await fetch(`${baseUrl}/api/documents/${caseId}`, {
      method: 'POST',
      headers: { Cookie: ownerCookie },
      body: invalidPdfForm,
    });
    assert.equal(invalidPdf.status, 400);

    const registerOther = await request(baseUrl, '/api/auth/register', {
      method: 'POST',
      body: { name: 'Synthetic Other Owner', email: emails[1], password },
    });
    assert.equal(registerOther.status, 201);
    const otherOwner = await json(registerOther);
    otherOwnerId = otherOwner.user.id;
    const otherCookie = registerOther.headers.get('set-cookie')?.split(';')[0];
    assert.ok(otherCookie);

    const ownerCaseAsOther = await request(baseUrl, `/api/cases/${caseId}`, { cookie: otherCookie });
    assert.equal(ownerCaseAsOther.status, 404);
    const ownerDocumentAsOther = await request(baseUrl, `/api/documents/${uploaded.id}/download`, { cookie: otherCookie });
    assert.equal(ownerDocumentAsOther.status, 404);
    const ownerTaskAsOther = await request(baseUrl, `/api/tasks/${task._id}`, {
      method: 'PATCH',
      cookie: otherCookie,
      body: { completed: false },
    });
    assert.equal(ownerTaskAsOther.status, 404);

    const deleteDocument = await request(baseUrl, `/api/documents/${uploaded.id}`, {
      method: 'DELETE',
      cookie: ownerCookie,
    });
    assert.equal(deleteDocument.status, 204);
    await assert.rejects(fs.access(documentPath), { code: 'ENOENT' });
    documentPath = undefined;

    delete process.env.OPENAI_API_KEY;
    const aiWithoutProvider = await request(baseUrl, `/api/ai/case/${caseId}/question`, {
      method: 'POST',
      cookie: ownerCookie,
      body: { prompt: 'A synthetic question that must not be sent to a provider.' },
    });
    assert.equal(aiWithoutProvider.status, 503);
    assert.match((await json(aiWithoutProvider)).error, /OPENAI_API_KEY/);
    if (previousAiKey !== undefined) process.env.OPENAI_API_KEY = previousAiKey;

    const archive = await request(baseUrl, `/api/cases/${caseId}`, {
      method: 'PUT',
      cookie: ownerCookie,
      body: { archived: true },
    });
    assert.equal(archive.status, 200);
    assert.equal((await json(archive)).archived, true);
    const archivedList = await request(baseUrl, '/api/cases?archived=true', { cookie: ownerCookie });
    assert.ok((await json(archivedList)).cases.some(item => item._id === caseId));
    const activeList = await request(baseUrl, '/api/cases', { cookie: ownerCookie });
    assert.equal((await json(activeList)).cases.some(item => item._id === caseId), false);

    await stopBackend(backend);
    ({ child: backend, baseUrl, getDiagnostics: backendDiagnostics } = await startBackend());
    const afterRestart = await request(baseUrl, `/api/cases/${caseId}`, { cookie: ownerCookie });
    assert.equal(afterRestart.status, 200);
    assert.equal((await json(afterRestart)).title, 'Updated synthetic audit matter');
  } finally {
    if (previousAiKey !== undefined) process.env.OPENAI_API_KEY = previousAiKey;
    else delete process.env.OPENAI_API_KEY;
    await stopBackend(backend);
    if (documentPath) {
      await fs.unlink(documentPath).catch(error => {
        if (error.code !== 'ENOENT') throw error;
      });
    }
    const createdIds = [ownerId, otherOwnerId].filter(Boolean);
    if (createdIds.length) {
      await pool.execute(`DELETE FROM users WHERE id IN (${createdIds.map(() => '?').join(', ')})`, createdIds);
    }
    await pool.end();
  }
});
