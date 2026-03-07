import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { forgotPassword, resetPassword } from '../api';
import AnimatedTreeBackground from '../components/AnimatedTreeBackground';

function LoginPage() {
  const { t, language, toggleLanguage } = useLanguage();
  const { login, register, setUser } = useAuth();
  const { isDarkMode } = useTheme();
  const [mode, setMode] = useState('login'); // 'login', 'register', 'forgot', 'reset'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetToken, setResetToken] = useState('');

  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    token: '',
    newPassword: '',
  });

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else if (mode === 'register') {
        await register({
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
        });
      } else if (mode === 'forgot') {
        const result = await forgotPassword(form.email);
        setSuccess(result.message);
        if (result.resetToken) {
          setResetToken(result.resetToken);
          setForm((prev) => ({ ...prev, token: result.resetToken }));
        }
      } else if (mode === 'reset') {
        const result = await resetPassword(form.token, form.newPassword);
        setSuccess(result.message);
        setTimeout(() => {
          setMode('login');
          setSuccess('');
          setResetToken('');
        }, 2000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/demo', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Login failed. Please make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setSuccess('');
    setResetToken('');
  };

  return (
    <div className="login-page">
      <AnimatedTreeBackground darkMode={isDarkMode} />
      <div className="login-card">
        <div className="login-lang-toggle">
          <button
            className="btn btn-lang"
            onClick={toggleLanguage}
            title={language === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
          >
            {language === 'vi' ? 'EN' : 'VI'}
          </button>
        </div>

        <div className="login-header">
          <div className="login-icon-wrapper">
            <span className="login-icon">🌳</span>
          </div>
          <h1>Gia Pha</h1>
          <p>
            {language === 'vi'
              ? 'Xay dung va kham pha lich su gia dinh'
              : 'Build and explore your family history'}
          </p>
        </div>

        {(mode === 'login' || mode === 'register') && (
          <div className="login-tabs">
            <button
              className={`login-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => switchMode('login')}
            >
              {t('login_title')}
            </button>
            <button
              className={`login-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => switchMode('register')}
            >
              {t('login_register_title')}
            </button>
          </div>
        )}

        {mode === 'forgot' && (
          <div className="login-mode-header">
            <h2>{t('reset_forgot_title')}</h2>
            <p>{t('reset_forgot_desc')}</p>
          </div>
        )}

        {mode === 'reset' && (
          <div className="login-mode-header">
            <h2>{t('reset_title')}</h2>
            <p>{t('reset_desc')}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          {mode === 'register' && (
            <div className="form-row">
              <div className="form-group">
                <label>{t('login_name')} *</label>
                <input
                  type="text"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  placeholder={language === 'vi' ? 'Ten' : 'First name'}
                  required
                />
              </div>
              <div className="form-group">
                <label>{language === 'vi' ? 'Ho' : 'Last Name'}</label>
                <input
                  type="text"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  placeholder={language === 'vi' ? 'Nguyen' : 'Nguyen'}
                />
              </div>
            </div>
          )}

          {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
            <div className="form-group">
              <label>{t('login_email')} *</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="email@example.com"
                required
                autoFocus
              />
            </div>
          )}

          {(mode === 'login' || mode === 'register') && (
            <div className="form-group">
              <label>{t('login_password')} *</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder={language === 'vi' ? 'Mat khau' : 'Password'}
                required
              />
            </div>
          )}

          {mode === 'reset' && (
            <>
              <div className="form-group">
                <label>{t('reset_token')} *</label>
                <input
                  type="text"
                  name="token"
                  value={form.token}
                  onChange={handleChange}
                  placeholder={language === 'vi' ? 'Ma dat lai' : 'Reset token'}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('reset_new_password')} *</label>
                <input
                  type="password"
                  name="newPassword"
                  value={form.newPassword}
                  onChange={handleChange}
                  placeholder={language === 'vi' ? 'Mat khau moi' : 'New password'}
                  required
                  minLength={6}
                />
              </div>
            </>
          )}

          {error && <div className="login-error">{error}</div>}
          {success && <div className="login-success">{success}</div>}

          {resetToken && mode === 'forgot' && (
            <div className="reset-token-display">
              <strong>{t('reset_token_label')}:</strong>
              <code>{resetToken}</code>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setForm((prev) => ({ ...prev, token: resetToken }));
                  switchMode('reset');
                }}
              >
                {t('reset_use_token')}
              </button>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading
              ? '...'
              : mode === 'login'
              ? t('login_submit')
              : mode === 'register'
              ? t('login_register')
              : mode === 'forgot'
              ? t('reset_send')
              : t('reset_submit')}
          </button>
        </form>

        {mode === 'login' && (
          <div className="login-links">
            <button className="btn-link" onClick={() => switchMode('forgot')}>
              {t('reset_forgot_link')}
            </button>
          </div>
        )}

        {(mode === 'forgot' || mode === 'reset') && (
          <div className="login-links">
            <button className="btn-link" onClick={() => switchMode('login')}>
              ← {t('reset_back_login')}
            </button>
          </div>
        )}

        {(mode === 'login' || mode === 'register') && (
          <>
            <div className="login-divider">
              <span>{language === 'vi' ? 'hoac' : 'or'}</span>
            </div>

            <button
              className="btn btn-demo"
              onClick={handleDemo}
              disabled={loading}
            >
              {loading
                ? '...'
                : language === 'vi'
                ? '🌳 Xem Demo — Cay 5 The He'
                : '🌳 View Demo — 5 Generation Tree'}
            </button>
            <p className="demo-hint">
              {language === 'vi'
                ? 'Kham pha cay gia pha mau voi hon 100 thanh vien.'
                : 'Explore a sample tree with over 100 members.'}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default LoginPage;
