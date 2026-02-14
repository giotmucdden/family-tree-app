import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">🌳 Gia Phả</Link>
      </div>
      <div className="navbar-user">
        {user?.profilePhoto && (
          <img
            src={user.profilePhoto}
            alt={user.displayName}
            className="navbar-avatar"
          />
        )}
        <span className="navbar-name">{user?.displayName}</span>
        <button className="btn btn-outline" onClick={logout}>
          Đăng Xuất
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
