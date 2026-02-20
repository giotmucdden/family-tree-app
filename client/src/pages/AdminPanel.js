import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Error type labels
const ERROR_TYPE_LABELS = {
  wrong_title: 'Sai danh xưng',
  wrong_region_bac: 'Sai miền Bắc',
  wrong_region_trung: 'Sai miền Trung',
  wrong_region_nam: 'Sai miền Nam',
  wrong_lineage: 'Sai họ nội/ngoại',
  wrong_generation: 'Sai thế hệ',
  other: 'Lỗi khác',
};

const STATUS_LABELS = {
  pending: { label: '⏳ Chờ xử lý', color: '#ff9800' },
  reviewed: { label: '👁️ Đã xem', color: '#2196f3' },
  fixed: { label: '✅ Đã sửa', color: '#4caf50' },
  rejected: { label: '❌ Từ chối', color: '#f44336' },
};

function AdminPanel() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [actionLoading, setActionLoading] = useState(null);

  // Vai Ve Reports state
  const [vaiVeReports, setVaiVeReports] = useState([]);
  const [vaiVeStats, setVaiVeStats] = useState({ pending: 0, reviewed: 0, fixed: 0, rejected: 0, total: 0 });
  const [vaiVeFilter, setVaiVeFilter] = useState('pending');
  const [vaiVeLoading, setVaiVeLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/');
      return;
    }
    loadUsers();
  }, [user, navigate, isAdmin]);

  // Load Vai Ve Reports when tab changes
  useEffect(() => {
    if (activeTab === 'vaive') {
      loadVaiVeReports();
      loadVaiVeStats();
    }
  }, [activeTab, vaiVeFilter]);

  async function loadVaiVeReports() {
    setVaiVeLoading(true);
    try {
      const res = await fetch(`/api/vaive-reports/admin/all?status=${vaiVeFilter}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setVaiVeReports(data.reports || []);
      }
    } catch (err) {
      console.error('Không thể tải báo cáo Vai Vế:', err);
    } finally {
      setVaiVeLoading(false);
    }
  }

  async function loadVaiVeStats() {
    try {
      const res = await fetch('/api/vaive-reports/admin/stats', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setVaiVeStats(data);
      }
    } catch (err) {
      console.error('Không thể tải thống kê:', err);
    }
  }

  async function handleUpdateReportStatus(reportId, newStatus) {
    setActionLoading(reportId);
    try {
      const res = await fetch(`/api/vaive-reports/admin/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await loadVaiVeReports();
        await loadVaiVeStats();
        setSelectedReport(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Cập nhật thất bại');
      }
    } catch (err) {
      alert('Cập nhật thất bại');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeleteReport(reportId) {
    if (!window.confirm('Xóa báo cáo này?')) return;
    setActionLoading(reportId);
    try {
      const res = await fetch(`/api/vaive-reports/admin/${reportId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        await loadVaiVeReports();
        await loadVaiVeStats();
      } else {
        const data = await res.json();
        alert(data.error || 'Xóa thất bại');
      }
    } catch (err) {
      alert('Xóa thất bại');
    } finally {
      setActionLoading(null);
    }
  }

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

  if (!isAdmin()) {
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
        <button
          className={`admin-tab ${activeTab === 'vaive' ? 'active' : ''}`}
          onClick={() => setActiveTab('vaive')}
        >
          📝 Báo Cáo Vai Vế ({vaiVeStats.pending > 0 ? `${vaiVeStats.pending} mới` : vaiVeStats.total})
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

      {/* Tab: Báo cáo Vai Vế */}
      {activeTab === 'vaive' && (
        <div className="admin-section">
          <h2>📝 Báo Cáo Vai Vế</h2>

          {/* Stats */}
          <div className="vaive-stats">
            <div className="stat-item pending">
              <span className="stat-number">{vaiVeStats.pending}</span>
              <span className="stat-label">Chờ xử lý</span>
            </div>
            <div className="stat-item reviewed">
              <span className="stat-number">{vaiVeStats.reviewed}</span>
              <span className="stat-label">Đã xem</span>
            </div>
            <div className="stat-item fixed">
              <span className="stat-number">{vaiVeStats.fixed}</span>
              <span className="stat-label">Đã sửa</span>
            </div>
            <div className="stat-item rejected">
              <span className="stat-number">{vaiVeStats.rejected}</span>
              <span className="stat-label">Từ chối</span>
            </div>
          </div>

          {/* Filter */}
          <div className="vaive-filter">
            <label>Lọc theo trạng thái:</label>
            <select value={vaiVeFilter} onChange={e => setVaiVeFilter(e.target.value)}>
              <option value="all">Tất cả</option>
              <option value="pending">Chờ xử lý</option>
              <option value="reviewed">Đã xem</option>
              <option value="fixed">Đã sửa</option>
              <option value="rejected">Từ chối</option>
            </select>
          </div>

          {/* Report List */}
          {vaiVeLoading ? (
            <div className="loading-screen">
              <div className="spinner" />
            </div>
          ) : vaiVeReports.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📝</span>
              <p>Không có báo cáo nào</p>
            </div>
          ) : (
            <div className="vaive-report-list">
              {vaiVeReports.map(report => (
                <div key={report._id} className="vaive-report-card">
                  <div className="report-header">
                    <span className="report-status" style={{ color: STATUS_LABELS[report.status]?.color }}>
                      {STATUS_LABELS[report.status]?.label}
                    </span>
                    <span className="report-date">
                      {new Date(report.createdAt).toLocaleDateString('vi-VN', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>

                  <div className="report-members">
                    <span><strong>{report.member1?.name}</strong> ↔ <strong>{report.member2?.name}</strong></span>
                  </div>

                  <div className="report-system-result">
                    <div>Hệ thống: {report.systemResult?.title1to2} ↔ {report.systemResult?.title2to1}</div>
                    {report.systemResult?.bac && <small>Bắc: {report.systemResult.bac}</small>}
                    {report.systemResult?.trung && <small>Trung: {report.systemResult.trung}</small>}
                    {report.systemResult?.nam && <small>Nam: {report.systemResult.nam}</small>}
                  </div>

                  <div className="report-error-types">
                    {report.errorTypes?.map(et => (
                      <span key={et} className="error-tag">{ERROR_TYPE_LABELS[et] || et}</span>
                    ))}
                  </div>

                  {report.suggestedCorrection?.title1to2 && (
                    <div className="report-suggestion">
                      <strong>Đề xuất:</strong> {report.suggestedCorrection.title1to2} ↔ {report.suggestedCorrection.title2to1}
                    </div>
                  )}

                  {report.description && (
                    <div className="report-description">
                      <em>"{report.description}"</em>
                    </div>
                  )}

                  <div className="report-reporter">
                    Báo cáo bởi: {report.reportedBy?.displayName || 'Unknown'}
                  </div>

                  <div className="report-actions">
                    {report.status === 'pending' && (
                      <>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleUpdateReportStatus(report._id, 'reviewed')}
                          disabled={actionLoading === report._id}
                        >
                          👁️ Đánh dấu đã xem
                        </button>
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => handleUpdateReportStatus(report._id, 'fixed')}
                          disabled={actionLoading === report._id}
                        >
                          ✅ Đã sửa
                        </button>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => handleUpdateReportStatus(report._id, 'rejected')}
                          disabled={actionLoading === report._id}
                        >
                          ❌ Từ chối
                        </button>
                      </>
                    )}
                    {report.status === 'reviewed' && (
                      <>
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => handleUpdateReportStatus(report._id, 'fixed')}
                          disabled={actionLoading === report._id}
                        >
                          ✅ Đã sửa
                        </button>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => handleUpdateReportStatus(report._id, 'rejected')}
                          disabled={actionLoading === report._id}
                        >
                          ❌ Từ chối
                        </button>
                      </>
                    )}
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteReport(report._id)}
                      disabled={actionLoading === report._id}
                    >
                      🗑️ Xóa
                    </button>
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
