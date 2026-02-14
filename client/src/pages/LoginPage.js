import React, { useState } from 'react';

function LoginPage() {
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
        alert(data.error || 'Đăng nhập thất bại');
      }
    } catch (err) {
      alert('Đăng nhập thất bại. Hãy chắc chắn rằng máy chủ đang chạy và có dữ liệu mẫu.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <span className="login-icon">🌳</span>
          <h1>Gia Phả</h1>
          <p>Xây dựng và khám phá lịch sử gia đình một cách trực quan</p>
        </div>
        <div className="login-features">
          <div className="feature">
            <span>👨‍👩‍👧‍👦</span>
            <span>Xây dựng cây gia phả trực quan</span>
          </div>
          <div className="feature">
            <span>🔗</span>
            <span>Kết nối các thành viên với mối quan hệ</span>
          </div>
          <div className="feature">
            <span>🖱️</span>
            <span>Giao diện kéo thả tương tác</span>
          </div>
          <div className="feature">
            <span>📱</span>
            <span>Truy cập từ mọi thiết bị</span>
          </div>
        </div>
        <button
          className="btn btn-demo"
          onClick={handleDemo}
          disabled={demoLoading}
          style={{ marginTop: 8 }}
        >
          {demoLoading ? '⏳ Đang tải...' : '🌳 Xem Gia Phả — Cây 5 Thế Hệ'}
        </button>
        <p className="demo-hint">
          Không cần đăng nhập. Khám phá cây gia phả mẫu với hơn 100 thành viên
          trải qua 5 thế hệ.
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
