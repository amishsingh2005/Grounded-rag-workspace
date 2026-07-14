const API_BASE = window.location.port === '5173' ? 'http://localhost:8000' : '';

export const api = {
  async fetchDocuments() {
    const res = await fetch(`${API_BASE}/api/documents`);
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },

  async uploadDocument(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const res = await fetch(`${API_BASE}/api/documents/upload`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Upload failed');
    return data;
  },

  async deleteDocument(id) {
    const res = await fetch(`${API_BASE}/api/documents/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete document');
    return true;
  },

  async chat(question, topK, similarityThreshold) {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question, top_k: topK, similarity_threshold: similarityThreshold })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Retrieval failed');
    return data;
  },

  async chatStream(question, topK, similarityThreshold, { onSources, onChunk, onDone, onError }) {
    const res = await fetch(`${API_BASE}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question, top_k: topK, similarity_threshold: similarityThreshold })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || 'Streaming request failed');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // Keep the last (possibly incomplete) line in the buffer
      buffer = lines.pop() || '';

      let currentEvent = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          const rawData = line.slice(6);
          try {
            const parsed = JSON.parse(rawData);
            if (currentEvent === 'sources' && onSources) {
              onSources(parsed);
            } else if (currentEvent === 'chunk' && onChunk) {
              onChunk(parsed);
            } else if (currentEvent === 'done' && onDone) {
              onDone();
            } else if (currentEvent === 'error' && onError) {
              onError(new Error(parsed));
            }
          } catch {
            // Non-JSON data line, skip
          }
          currentEvent = '';
        }
      }
    }
  }
};
