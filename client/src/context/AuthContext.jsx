import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/auth/me', { withCredentials: true })
      .then(({ data }) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    async login(email, password) {
      const { data } = await axios.post('/api/auth/login', { email, password }, { withCredentials: true });
      setUser(data.user);
      return data.user;
    },
    async register(name, email, password) {
      const { data } = await axios.post('/api/auth/register', { name, email, password }, { withCredentials: true });
      setUser(data.user);
      return data.user;
    },
    async logout() {
      try {
        await axios.post('/api/auth/logout', {}, { withCredentials: true });
      } finally {
        setUser(null);
      }
    },
    async updateProfile(profile) {
      const { data } = await axios.patch('/api/auth/me', profile, { withCredentials: true });
      setUser(data.user);
      return data.user;
    },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
