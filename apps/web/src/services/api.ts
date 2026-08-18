const API_BASE = '/api/v1';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('seqa_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('seqa_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('seqa_token');
    localStorage.removeItem('seqa_user');
  }

  getToken() {
    return this.token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      this.clearToken();
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    return res.json();
  }

  get<T>(path: string) { return this.request<T>(path); }
  
  post<T>(path: string, body: unknown) {
    return this.request<T>(path, { method: 'POST', body: JSON.stringify(body) });
  }

  patch<T>(path: string, body: unknown) {
    return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' });
  }
}

export const api = new ApiClient();

// ─── Auth API ───────────────────────────────────────────────────────

export async function login(email: string, password: string) {
  const res = await api.post<{ token: string; user: any }>('/auth/login', { email, password });
  api.setToken(res.token);
  localStorage.setItem('seqa_user', JSON.stringify(res.user));
  return res;
}

export async function register(email: string, password: string, name: string) {
  const res = await api.post<{ token: string; user: any }>('/auth/register', { email, password, name });
  api.setToken(res.token);
  localStorage.setItem('seqa_user', JSON.stringify(res.user));
  return res;
}

export function logout() {
  api.clearToken();
  window.location.href = '/login';
}

export function getStoredUser() {
  const raw = localStorage.getItem('seqa_user');
  return raw ? JSON.parse(raw) : null;
}

export function isAuthenticated() {
  return !!api.getToken();
}
