import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const { isDarkMode, toggleTheme } = useTheme();
  const [pendingReports, setPendingReports] = useState(0);

  // Fetch pending reports count for admin
  useEffect(() => {
    if (isAdmin()) {
      fetch('/api/vaive-reports/admin/stats', { credentials: 'include' })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.pending) {
            setPendingReports(data.pending);
          }
        })
        .catch(() => {});
    }
  }, [isAdmin]);

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">🌳 Gia Phả</Link>
      </div>
      <div className="navbar-user">
        <button
          className="btn btn-icon btn-theme"
          onClick={toggleTheme}
          title={isDarkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
        <button
          className="btn btn-lang"
          onClick={toggleLanguage}
          title={language === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
        >
          {language === 'vi' ? 'EN' : 'VI'}
        </button>
        {isAdmin() && (
          <Link to="/admin" className="btn btn-outline btn-admin" title="Admin Panel">
            🛡️ Admin
            {pendingReports > 0 && (
              <span className="admin-badge-count">{pendingReports}</span>
            )}
          </Link>
        )}
        {user?.profilePhoto && (
          <img
            src={user.profilePhoto}
            alt={user.displayName}
            className="navbar-avatar"
          />
        )}
        <span className="navbar-name">{user?.displayName}</span>
        <button className="btn btn-outline" onClick={logout}>
          {t('nav_logout')}
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
