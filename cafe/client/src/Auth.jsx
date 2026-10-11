import { createContext, useContext, useState, useEffect } from 'react';
import { api, setCsrf } from './api';
const Context = createContext();
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [demo, setDemo] = useState(false);
  const clear = () => {
    setUser(null);
    setCsrf('');
  };
  useEffect(() => {
    let live = true;
    api
      .get('/auth/me')
      .then(({ data }) => {
        if (live) {
          setUser(data.user);
          setCsrf(data.csrf);
        }
      })
      .catch(() => {})
      .finally(() => live && setLoading(false));
    api
      .get('/health')
      .then(({ data }) => live && setDemo(data.demo))
      .catch(() => {});
    window.addEventListener('session-ended', clear);
    return () => {
      live = false;
      window.removeEventListener('session-ended', clear);
    };
  }, []);
  const login = async (values) => {
    const { data } = await api.post('/auth/login', values);
    setCsrf(data.csrf);
    setUser(data.user);
  };
  const logout = async () => {
    try {
      await api.post('/auth/logout');
      clear();
    } catch (e) {
      if (e.response?.status === 401) clear();
      else throw e;
    }
  };
  return (
    <Context.Provider value={{ user, setUser, loading, login, logout, clear, demo }}>
      {children}
    </Context.Provider>
  );
}
export const useAuth = () => useContext(Context);
