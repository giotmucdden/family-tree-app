import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const { login } = useAuth();
  const [demoLoading, setDemoLoading] = useState(false);

  const handleDemo = async () => {
    setDemoLoading(true);
    try {
      const res = await fetch('/api/auth/demo', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.user) {
        window.location.href = '/';
      } else {
        alert(data.error || 'Demo login failed');
      }
    } catch (err) {
      alert('Demo login failed. Make sure the server is running and seed data exists.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <span className="login-icon">🌳</span>
          <h1>Family Tree</h1>
          <p>Build and explore your family history interactively</p>
        </div>
        <div className="login-features">
          <div className="feature">
            <span>👨‍👩‍👧‍👦</span>
            <span>Build your family tree visually</span>
          </div>
          <div className="feature">
            <span>🔗</span>
            <span>Connect family members with relationships</span>
          </div>
          <div className="feature">
            <span>🖱️</span>
            <span>Interactive drag & drop interface</span>
          </div>
          <div className="feature">
            <span>📱</span>
            <span>Access from any device</span>
          </div>
        </div>
        <button className="btn btn-facebook" onClick={login}>
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="currentColor"
            style={{ marginRight: 8 }}
          >
            <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
          </svg>
          Continue with Facebook
        </button>
        <div className="login-divider">
          <span>or</span>
        </div>
        <button
          className="btn btn-demo"
          onClick={handleDemo}
          disabled={demoLoading}
        >
          {demoLoading ? '⏳ Loading Demo...' : '🌳 Try Demo — 5 Generation Family Tree'}
        </button>
        <p className="demo-hint">
          No login required. Explore a pre-built family tree with 20+ members
          across 5 generations.
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
