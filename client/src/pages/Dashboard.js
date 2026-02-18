import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTrees, createTree, deleteTree } from '../api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

function Dashboard() {
  const { user, isAdmin } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [trees, setTrees] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newTreeName, setNewTreeName] = useState('');
  const [newTreeDesc, setNewTreeDesc] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrees();
  }, []);

  async function loadTrees() {
    try {
      const data = await getTrees();
      setTrees(data);
    } catch (err) {
      console.error('Không thể tải danh sách cây:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      const tree = await createTree({
        name: newTreeName || 'Gia Phả Của Tôi',
        description: newTreeDesc,
      });
      setTrees([...trees, tree]);
      setShowCreate(false);
      setNewTreeName('');
      setNewTreeDesc('');
      navigate(`/tree/${tree._id}`);
    } catch (err) {
      alert('Tạo cây thất bại: ' + err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Xóa cây gia phả này? Hành động này không thể hoàn tác.'))
      return;
    try {
      await deleteTree(id);
      setTrees(trees.filter((t) => t._id !== id));
    } catch (err) {
      alert('Xóa thất bại: ' + err.message);
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>{t('dash_title')}</h1>
          <p>Xin chào, {user?.firstName || user?.displayName}!</p>
        </div>
        {isAdmin() && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + {t('dash_create')}
          </button>
        )}
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{t('dash_create')}</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>{t('dash_new_tree_name')}</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Gia Đình Nguyễn"
                  value={newTreeName}
                  onChange={(e) => setNewTreeName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Mô tả (không bắt buộc)</label>
                <textarea
                  placeholder="Mô tả ngắn về gia phả này"
                  value={newTreeDesc}
                  onChange={(e) => setNewTreeDesc(e.target.value)}
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowCreate(false)}
                >
                  {t('dash_cancel')}
                </button>
                <button type="submit" className="btn btn-primary">
                  {t('dash_create_btn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {trees.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🌱</span>
          <h2>{t('dash_no_trees')}</h2>
          <p>Tạo gia phả đầu tiên để bắt đầu!</p>
          {isAdmin() && (
            <button
              className="btn btn-primary"
              onClick={() => setShowCreate(true)}
            >
              {t('dash_create')}
            </button>
          )}
        </div>
      ) : (
        <div className="tree-grid">
          {trees.map((tree) => (
            <div
              key={tree._id}
              className="tree-card"
              onClick={() => navigate(`/tree/${tree._id}`)}
            >
              <div className="tree-card-icon">🌳</div>
              <h3>{tree.name}</h3>
              {tree.description && <p>{tree.description}</p>}
              <div className="tree-card-meta">
                <span>{tree.members?.length || 0} {t('dash_members')}</span>
                <span>
                  {new Date(tree.createdAt).toLocaleDateString('vi-VN')}
                </span>
              </div>
              <div className="tree-card-actions">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/tree/${tree._id}`);
                  }}
                >
                  {t('dash_view')}
                </button>
                {isAdmin() && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(tree._id);
                    }}
                  >
                    {t('dash_delete')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
