import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { getCurrentUser, logout as logoutApi, login as loginApi, register as registerApi } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const data = await loginApi(email, password);
    setUser(data.user);
    return data;
  };

  const register = async (userData) => {
    const data = await registerApi(userData);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    await logoutApi();
    setUser(null);
  };

  // Check if user is admin
  const isAdmin = useCallback(() => {
    return user?.role === 'admin';
  }, [user]);

  // Check if user can edit a specific member
  // Admin can edit all, member can only edit themselves and downstream (children, grandchildren, etc.)
  const canEditMember = useCallback((memberId, members) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (!user.linkedMemberId) return false;

    // Build a set of all downstream member IDs from user's linked member
    const getDownstreamIds = (startId) => {
      const downstream = new Set();
      downstream.add(startId);

      const findChildren = (parentId) => {
        members.forEach((m) => {
          const fatherId = typeof m.fatherId === 'object' ? m.fatherId?._id : m.fatherId;
          const motherId = typeof m.motherId === 'object' ? m.motherId?._id : m.motherId;
          if (fatherId === parentId || motherId === parentId) {
            if (!downstream.has(m._id)) {
              downstream.add(m._id);
              findChildren(m._id);
            }
          }
        });
      };

      findChildren(startId);
      return downstream;
    };

    const editableIds = getDownstreamIds(user.linkedMemberId);
    return editableIds.has(memberId);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser, isAdmin, canEditMember }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
