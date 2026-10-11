import axios from 'axios';
export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 20000,
});
let csrf = '';
export const setCsrf = (value) => {
  csrf = value || '';
};
api.interceptors.request.use((config) => {
  if (csrf) config.headers['X-CSRF-Token'] = csrf;
  return config;
});
api.interceptors.response.use(
  (r) => {
    if (!['get', 'head', 'options'].includes(r.config.method))
      window.dispatchEvent(new Event('data-changed'));
    return r;
  },
  (error) => {
    if (error.response?.status === 401 && !error.config.url.includes('/auth/'))
      window.dispatchEvent(new Event('session-ended'));
    return Promise.reject(error);
  },
);
export const message = (e) =>
  e.response?.data?.message ||
  (e.code === 'ECONNABORTED'
    ? 'The request timed out. Check the connection and try again.'
    : 'Cannot connect to Coffee Spot. Check that the server is running.');
export const money = (n) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format((n || 0) / 100);
export const dateTime = (v) =>
  new Date(v).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
export const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
export async function allRecords(path) {
  let items = [],
    page = 1,
    pages = 1;
  do {
    const { data } = await api.get(path, { params: { page, limit: 100 } });
    items.push(...data.items);
    pages = data.pages;
    page++;
  } while (page <= pages);
  return items;
}
