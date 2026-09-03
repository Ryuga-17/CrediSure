import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  // The auth token now lives in an httpOnly cookie (see AuthContext) instead
  // of localStorage, so the browser must be told to send it automatically.
  withCredentials: true,
});

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

api.interceptors.request.use((config) => {
  // Double-submit CSRF check on the backend: this cookie is deliberately
  // NOT httpOnly so it can be read here and echoed back as a header.
  const csrfToken = getCookie('csrfToken');
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Requests under /auth/ are auth itself (the AuthContext session probe,
    // login, register) -- their 401s are expected outcomes the caller
    // already handles (AuthContext's try/catch, signup page's setError), not
    // evidence of a session that expired mid-use. Only force-redirect on a
    // 401 from an actually protected call, where it means the session died
    // out from under the user.
    const url: string = error.config?.url || '';
    if (error.response?.status === 401 && !url.includes('/auth/')) {
      window.location.href = '/signup';
    }
    return Promise.reject(error);
  }
);

export default api;
