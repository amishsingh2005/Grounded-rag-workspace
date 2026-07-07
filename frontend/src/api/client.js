const API_BASE = window.location.port === '5173' ? 'http://localhost:8000' : '';

export const api = {
  async fetchUser(token) {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch user');
    return res.json();
  },

  async fetchDocuments(token) {
    const res = await fetch(`${API_BASE}/api/documents`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },

  async register(email, password) {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.detail || 'Registration failed');
    }
    return res.json();
  },

  async login(email, password) {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const res = await fetch(`${API_BASE}/api/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Invalid email or password');
    }
    return data;
  },

  async uploadDocument(token, file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const res = await fetch(`${API_BASE}/api/documents/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Upload failed');
    return data;
  },

  async deleteDocument(token, id) {
    const res = await fetch(`${API_BASE}/api/documents/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to delete document');
    return true;
  },

  async chat(token, question, topK, similarityThreshold) {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ question, top_k: topK, similarity_threshold: similarityThreshold })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Retrieval failed');
    return data;
  }
};
