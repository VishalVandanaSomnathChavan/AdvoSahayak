import axios from 'axios';

const client = axios.create({ baseURL: '/api', withCredentials: true });

class ApiService {
  async getAllCases(params = {}) {
    const { data } = await client.get('/cases', { params });
    return data;
  }

  async getDashboard() {
    const { data } = await client.get('/cases/dashboard');
    return data;
  }

  async getCase(caseId) {
    const { data } = await client.get(`/cases/${caseId}`);
    return data;
  }

  async createCase(caseData) {
    const { data } = await client.post('/cases', caseData);
    return data;
  }

  async updateCase(caseId, caseData) {
    const { data } = await client.put(`/cases/${caseId}`, caseData);
    return data;
  }

  async addNote(caseId, content) {
    const { data } = await client.post(`/cases/${caseId}/notes`, { content });
    return data;
  }

  async addDeadline(caseId, deadlineData) {
    const { data } = await client.post(`/cases/${caseId}/deadlines`, deadlineData);
    return data;
  }

  async addHearing(caseId, hearingData) {
    const { data } = await client.post(`/cases/${caseId}/hearings`, hearingData);
    return data;
  }

  async updateHearing(caseId, hearingId, hearingData) {
    const { data } = await client.patch(`/cases/${caseId}/hearings/${hearingId}`, hearingData);
    return data;
  }

  async updateDeadline(caseId, deadlineId, completed) {
    const { data } = await client.patch(`/cases/${caseId}/deadlines/${deadlineId}`, { completed });
    return data;
  }

  async listDocuments(caseId) {
    const { data } = await client.get(`/documents/case/${caseId}`);
    return data;
  }

  async searchDocuments(params = {}) {
    const { data } = await client.get('/documents', { params });
    return data;
  }

  async uploadDocument(caseId, file) {
    const body = new FormData();
    body.append('document', file);
    const { data } = await client.post(`/documents/${caseId}`, body);
    return data;
  }

  async downloadDocument(documentId) {
    const { data } = await client.get(`/documents/${documentId}/download`, { responseType: 'blob' });
    return data;
  }

  async deleteDocument(documentId) {
    await client.delete(`/documents/${documentId}`);
  }

  async getAnalyses(caseId) {
    const { data } = await client.get(`/ai/case/${caseId}`);
    return data;
  }

  async runAi(caseId, type, body) {
    const { data } = await client.post(`/ai/case/${caseId}/${type}`, body);
    return data;
  }

  async reviewAnalysis(id, reviewed) {
    const { data } = await client.patch(`/ai/${id}/review`, { reviewed });
    return data;
  }

  async getTasks(params = {}) {
    const { data } = await client.get('/tasks', { params });
    return data;
  }

  async getReminders(days = 7) {
    const { data } = await client.get('/reminders', { params: { days } });
    return data;
  }

  async getActivity(caseId) {
    const { data } = await client.get(`/activity/case/${caseId}`);
    return data;
  }

  async createTask(task) {
    const { data } = await client.post('/tasks', task);
    return data;
  }

  async updateTask(id, completed) {
    const { data } = await client.patch(`/tasks/${id}`, { completed });
    return data;
  }
}

export default new ApiService();
