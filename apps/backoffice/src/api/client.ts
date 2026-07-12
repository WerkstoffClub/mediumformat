import axios from 'axios';

export const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('mf-access-token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // File uploads (FormData) must NOT carry the default application/json header —
  // let the browser set multipart/form-data with its boundary, or Multer sees no file.
  if (config.data instanceof FormData) delete config.headers['Content-Type'];
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('mf-access-token');
      window.location.href = `${import.meta.env.BASE_URL}login`;
    }
    return Promise.reject(err);
  },
);
