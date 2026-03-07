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
  const [scrolled, setScrolled] = useState(false);

  // Track scroll for navbar effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-brand">
        <Link to="/">
          <span className="navbar-logo-icon">🌳</span>
          <span className="navbar-logo-text">Gia Pha</span>
        </Link>
      </div>
      <div className="navbar-user">
        <button
          className="btn btn-icon btn-theme"
          onClick={toggleTheme}
          title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
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
        <button className="btn btn-outline btn-logout" onClick={logout}>
          {t('nav_logout')}
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
