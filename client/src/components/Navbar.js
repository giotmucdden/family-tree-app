import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

function Navbar() {
  const { user, logout } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">🌳 Gia Phả</Link>
      </div>
      <div className="navbar-user">
        <button
          className="btn btn-lang"
          onClick={toggleLanguage}
          title={language === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
        >
          {language === 'vi' ? '🇺🇸 EN' : '🇻🇳 VI'}
        </button>
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
