import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AdminPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/');
      return;
    }
    loadUsers();
  }, [user, navigate]);

  async function loadUsers() {
    setLoading(true);
    try {
      const [pendingRes, allRes] = await Promise.all([
        fetch('/api/auth/admin/pending-users', { credentials: 'include' }),
        fetch('/api/auth/admin/all-users', { credentials: 'include' }),
      ]);
      if (pendingRes.ok) setPendingUsers(await pendingRes.json());
      if (allRes.ok) setAllUsers(await allRes.json());
    } catch (err) {
      console.error('Không thể tải danh sách người dùng:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(userId) {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/auth/admin/approve/${userId}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        await loadUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Phê duyệt thất bại');
      }
    } catch (err) {
      alert('Phê duyệt thất bại');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(userId) {
    if (!window.confirm('Từ chối và xóa người dùng này?')) return;
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/auth/admin/reject/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        await loadUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Từ chối thất bại');
      }
    } catch (err) {
      alert('Từ chối thất bại');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleToggleAdmin(userId) {
    const targetUser = allUsers.find((u) => u._id === userId);
    const action = targetUser?.isAdmin ? 'thu hồi quyền Admin' : 'cấp quyền Admin';
    if (!window.confirm(`Bạn có chắc muốn ${action} cho người dùng này?`)) return;

    setActionLoading(userId);
    try {
      const res = await fetch(`/api/auth/admin/toggle-admin/${userId}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        await loadUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Thao tác thất bại');
      }
    } catch (err) {
      alert('Thao tác thất bại');
    } finally {
      setActionLoading(null);
    }
  }

  if (!user?.isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <button className="btn btn-outline" onClick={() => navigate('/')}>
          ← Quay Lại
        </button>
        <h1>🛡️ Quản Trị Hệ Thống</h1>
      </div>

      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          ⏳ Chờ Duyệt ({pendingUsers.length})
        </button>
        <button
          className={`admin-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          👥 Tất Cả Người Dùng ({allUsers.length})
        </button>
      </div>

      {activeTab === 'pending' && (
        <div className="admin-section">
          <h2>Người Dùng Chờ Phê Duyệt</h2>
          {pendingUsers.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">✅</span>
              <p>Không có yêu cầu đăng ký nào đang chờ duyệt</p>
            </div>
          ) : (
            <div className="user-list">
              {pendingUsers.map((u) => (
                <div key={u._id} className="user-card pending">
                  <div className="user-info">
                    <div className="user-avatar">👤</div>
                    <div className="user-details">
                      <h3>{u.displayName}</h3>
                      <p>@{u.username} • {u.email}</p>
                      <span className="user-date">
                        Đăng ký: {new Date(u.registrationDate || u.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  </div>
                  <div className="user-actions">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleApprove(u._id)}
                      disabled={actionLoading === u._id}
                    >
                      {actionLoading === u._id ? '⏳' : '✅'} Duyệt
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleReject(u._id)}
                      disabled={actionLoading === u._id}
                    >
                      {actionLoading === u._id ? '⏳' : '❌'} Từ Chối
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'all' && (
        <div className="admin-section">
          <h2>Tất Cả Người Dùng</h2>
          {allUsers.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">👥</span>
              <p>Chưa có người dùng nào đăng ký</p>
            </div>
          ) : (
            <div className="user-list">
              {allUsers.map((u) => (
                <div key={u._id} className={`user-card ${u.isAdmin ? 'admin' : ''}`}>
                  <div className="user-info">
                    <div className="user-avatar">{u.isAdmin ? '🛡️' : '👤'}</div>
                    <div className="user-details">
                      <h3>
                        {u.displayName}
                        {u.isAdmin && <span className="admin-badge">Admin</span>}
                        {!u.isApproved && <span className="pending-badge">Chờ duyệt</span>}
                      </h3>
                      <p>@{u.username} • {u.email}</p>
                      <span className="user-date">
                        Đăng ký: {new Date(u.registrationDate || u.createdAt).toLocaleDateString('vi-VN')}
                        {u.lastLogin && ` • Đăng nhập: ${new Date(u.lastLogin).toLocaleDateString('vi-VN')}`}
                      </span>
                    </div>
                  </div>
                  <div className="user-actions">
                    {!u.isApproved && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleApprove(u._id)}
                        disabled={actionLoading === u._id}
                      >
                        ✅ Duyệt
                      </button>
                    )}
                    {u._id !== user.id && (
                      <>
                        <button
                          className={`btn btn-sm ${u.isAdmin ? 'btn-outline' : 'btn-primary'}`}
                          onClick={() => handleToggleAdmin(u._id)}
                          disabled={actionLoading === u._id}
                        >
                          {u.isAdmin ? '⬇️ Bỏ Admin' : '⬆️ Cấp Admin'}
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleReject(u._id)}
                          disabled={actionLoading === u._id}
                        >
                          🗑️ Xóa
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminPanel;
