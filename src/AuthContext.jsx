import React, { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);
const STORAGE_KEY = 'cmms_mechanic_session';

export function AuthProvider({ children }) {
  const [mechanic, setMechanicState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback((m) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
    setMechanicState(m);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setMechanicState(null);
  }, []);

  return (
    <AuthContext.Provider value={{ mechanic, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
