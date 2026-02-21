import React, { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import TreeView from './pages/TreeView';
import AdminPanel from './pages/AdminPanel';
import { getTrees } from './api';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;
  return user ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (!isAdmin()) return <Navigate to="/" />;
  return children;
}

// Redirect to the first (and only) tree
function RedirectToTree() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAndRedirect() {
      try {
        const trees = await getTrees();
        if (trees && trees.length > 0) {
          navigate(`/tree/${trees[0]._id}`, { replace: true });
        } else {
          // No trees exist - this shouldn't happen for normal users
          console.error('No trees found');
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to load trees:', error);
        setLoading(false);
      }
    }
    loadAndRedirect();
  }, [navigate]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Đang tải cây gia phả...</p>
      </div>
    );
  }

  return (
    <div className="loading-screen">
      <p>Không tìm thấy cây gia phả</p>
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading Family Tree...</p>
      </div>
    );
  }

  return (
    <>
      {user && <Navbar />}
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" /> : <LoginPage />}
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <RedirectToTree />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tree/:treeId"
          element={
            <ProtectedRoute>
              <TreeView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPanel />
            </AdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
