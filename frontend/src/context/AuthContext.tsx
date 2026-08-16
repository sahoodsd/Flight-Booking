import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { jwtDecode } from 'jwt-decode';
import { api, setAccessToken } from '../api/client';

interface AuthUser {
  userId: number;
  role: 'user' | 'admin';
}
interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const decodeUser = (token: string): AuthUser => jwtDecode<AuthUser>(token);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // on every page load, try the refresh cookie — this is what gives "no forced
    // logout on access-token expiry" even across a full browser refresh
    api
      .post('/auth/refresh')
      .then((res) => {
        setAccessToken(res.data.accessToken);
        setUser(decodeUser(res.data.accessToken));
      })
      .catch(() => {}) // no valid session — user just stays logged out, not an error
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post('/auth/login', { email, password });
    setAccessToken(res.data.accessToken);
    setUser(decodeUser(res.data.accessToken));
  }

  async function register(email: string, password: string) {
    await api.post('/auth/register', { email, password });
    await login(email, password);
  }

  async function logout() {
    await api.post('/auth/logout');
    setAccessToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
