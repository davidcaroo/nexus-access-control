const API_URL = (globalThis as any).__VITE_API_URL || (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

interface LoginResponse {
  message: string;
  user: {
    id: string;
    email: string;
    full_name: string;
  };
  accessToken: string;
  refreshToken: string;
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    full_name: string;
  };
  accessToken: string;
}

class APIClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.loadTokens();
  }

  private loadTokens() {
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  private saveTokens(access: string, refresh: string) {
    this.accessToken = access;
    this.refreshToken = refresh;
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
  }

  private clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  private async fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (options.headers && typeof options.headers === 'object') {
      Object.assign(headers, options.headers);
    }

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401 && this.refreshToken) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
        return fetch(`${API_URL}${endpoint}`, {
          ...options,
          headers,
        });
      } else {
        this.clearTokens();
        throw new Error('Session expired');
      }
    }

    return response;
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    this.saveTokens(data.accessToken, data.refreshToken);
    return data;
  }

  async getCurrentUser(): Promise<AuthResponse | null> {
    if (!this.accessToken) return null;

    try {
      const response = await this.fetchWithAuth('/auth/me');

      if (!response.ok) {
        if (response.status === 401) {
          this.clearTokens();
        }
        return null;
      }

      return await response.json();
    } catch {
      return null;
    }
  }

  async logout(): Promise<void> {
    if (this.refreshToken) {
      try {
        await this.fetchWithAuth('/auth/logout', { method: 'POST' });
      } catch {
        // Error on logout is ok, clear tokens anyway
      }
    }
    this.clearTokens();
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      this.accessToken = data.accessToken;
      localStorage.setItem('accessToken', data.accessToken);
      return true;
    } catch {
      return false;
    }
  }

  async get(endpoint: string, options?: { params?: Record<string, any> }) {
    let url = endpoint;
    if (options?.params) {
      const queryString = new URLSearchParams(options.params).toString();
      url = `${endpoint}?${queryString}`;
    }
    const response = await this.fetchWithAuth(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || 'Request failed');
    }
    return response.json();
  }

  async post(endpoint: string, data: any) {
    const response = await this.fetchWithAuth(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || 'Request failed');
    }
    return response.json();
  }

  async patch(endpoint: string, data: any, retries = 3) {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await this.fetchWithAuth(endpoint, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
        
        if (!response.ok) {
          // Si es error 503 (servicio no disponible), reintentar
          if (response.status === 503 && attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, 500 * attempt)); // Esperar progresivamente
            continue;
          }
          
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || errorData.error || 'Request failed');
        }
        return response.json();
      } catch (error) {
        lastError = error as Error;
        if (attempt < retries && (error as Error).message.includes('connection')) {
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          continue;
        }
        throw error;
      }
    }
    
    throw lastError || new Error('Request failed after retries');
  }

  async delete(endpoint: string) {
    const response = await this.fetchWithAuth(endpoint, { method: 'DELETE' });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || 'Request failed');
    }
    return response.json();
  }

  async uploadImage(base64Image: string, type: string = 'employee') {
    const response = await this.fetchWithAuth('/uploads/image', {
      method: 'POST',
      body: JSON.stringify({ image: base64Image, type }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || 'Upload failed');
    }
    return response.json();
  }
}

export const apiClient = new APIClient();
