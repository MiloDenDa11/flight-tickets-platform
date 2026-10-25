import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '../types';
import { post, setToken } from '../services/api';
type Session = { user: User; accessToken: string };
interface Auth { user: User | null; loading: boolean; accept: (s: Session) => void; update: (u: User) => void; logout: () => Promise<void> }
const Context = createContext<Auth | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  function accept(s: Session) { setToken(s.accessToken); setUser(s.user); }
  useEffect(() => {
    post<Session>('/auth/refresh').then(accept).catch(() => { setToken(null); setUser(null); }).finally(() => setLoading(false));
    const expire = () => { setToken(null); setUser(null); };
    window.addEventListener('flight-session-expired', expire);
    return () => window.removeEventListener('flight-session-expired', expire);
  }, []);
  async function logout() { await post('/auth/logout'); setToken(null); setUser(null); }
  return <Context.Provider value={{ user, loading, accept, update: setUser, logout }}>{children}</Context.Provider>;
}
export function useAuth() { const c = useContext(Context); if (!c) throw new Error('AuthProvider missing'); return c; }
