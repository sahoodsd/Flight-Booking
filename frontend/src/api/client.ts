import axios from 'axios';

let accessToken: string | null = null;
export function setAccessToken(token: string | null) {
  accessToken = token;
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // required so the httpOnly refresh cookie actually gets sent
});

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// dedupe concurrent 401s — if 3 requests fail at once, only fire ONE /auth/refresh call,
// not three (three would race against your rotation logic and two of them would fail)
let refreshPromise: Promise<string> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = api
            .post('/auth/refresh')
            .then((res) => {
              setAccessToken(res.data.accessToken);
              return res.data.accessToken;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }
        const newToken = await refreshPromise;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        setAccessToken(null);
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  },
);
